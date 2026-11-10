import { withCameraPrompt } from './prepermission';

let session: MediaStream | null = null;
let pending: Promise<MediaStream> | null = null;
let sessionVersion = 0;

function hasVideo(stream: MediaStream | null): stream is MediaStream {
  return !!stream?.getVideoTracks().some((track) => track.readyState === 'live');
}

export function releaseCameraSession() {
  sessionVersion++;
  session?.getTracks().forEach((track) => track.stop());
  session = null;
  pending = null;
}

function acquireCameraSession(): Promise<MediaStream> {
  if (hasVideo(session)) return Promise.resolve(session);
  if (pending) return pending;
  const version = sessionVersion;
  const request = withCameraPrompt(() => navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  })).then((stream) => {
    if (version !== sessionVersion) {
      stream.getTracks().forEach((track) => track.stop());
      throw new DOMException('Запуск камеры отменён', 'AbortError');
    }
    session = stream;
    return stream;
  }).finally(() => {
    if (pending === request) pending = null;
  });
  pending = request;
  return request;
}

// Safari может остановить камеру при блокировке телефона и сохранить страницу в BFCache.
// При возврате открытое задание восстановит поток через pageshow/visibilitychange.
window.addEventListener('pagehide', releaseCameraSession);

interface PreviewOptions {
  onReady(): void;
  onPause(): void;
  onError(error: unknown): Promise<boolean>;
}

const FRAME_TIMEOUT_MS = 5000;

export function startCameraPreview(video: HTMLVideoElement, options: PreviewOptions): () => void {
  let active = true;
  let starting = false;
  let waitingForRetry = false;
  let track: MediaStreamTrack | null = null;
  let lastFrameAt = performance.now();
  let lastTime = video.currentTime;
  let recoveryAttempts = 0;

  const detach = () => {
    track?.removeEventListener('ended', recoverEndedTrack);
    track = null;
    video.pause();
    video.srcObject = null;
  };

  async function showError(error: unknown) {
    if (!active || document.hidden || waitingForRetry) return;
    waitingForRetry = true;
    options.onPause();
    detach();
    const retry = await options.onError(error);
    waitingForRetry = false;
    if (active && retry) {
      recoveryAttempts = 0;
      void start(true);
    } else if (!retry) {
      stopPreview();
    }
  }

  async function start(fresh = false) {
    if (!active || document.hidden || starting || waitingForRetry) return;
    starting = true;
    options.onPause();
    detach();
    try {
      if (fresh) releaseCameraSession();
      const stream = await acquireCameraSession();
      if (!active || document.hidden) return;
      track = stream.getVideoTracks().find((item) => item.readyState === 'live') ?? null;
      if (!track || track.readyState !== 'live') throw new Error('Камера остановилась');
      track.addEventListener('ended', recoverEndedTrack);
      video.srcObject = stream;
      let playbackTimeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          video.play(),
          new Promise<never>((_, reject) => {
            playbackTimeout = setTimeout(() => reject(new Error('Камера не передаёт видео')), FRAME_TIMEOUT_MS);
          }),
        ]);
      } catch {
        // Ошибка play() не означает, что пользователь запретил саму камеру.
        throw new Error('Не удалось возобновить видео камеры');
      } finally {
        clearTimeout(playbackTimeout);
      }
      if (!active || document.hidden) return;
      lastFrameAt = performance.now();
      lastTime = video.currentTime;
      options.onReady();
    } catch (error) {
      void showError(error);
    } finally {
      starting = false;
    }
  }

  function recover(fresh: boolean) {
    if (!active || document.hidden || starting || waitingForRetry) return;
    if (recoveryAttempts >= 2) {
      void showError(new Error('Камера перестала передавать изображение'));
      return;
    }
    recoveryAttempts++;
    void start(fresh);
  }

  function recoverEndedTrack() {
    recover(true);
  }

  const onVisibility = () => {
    if (document.hidden) {
      options.onPause();
      video.pause();
    } else {
      void start();
    }
  };
  const onPageShow = () => { void start(); };
  const onVideoError = () => recover(recoveryAttempts > 0);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pageshow', onPageShow);
  video.addEventListener('error', onVideoError);

  const watchdog = setInterval(() => {
    if (!active || document.hidden || starting || waitingForRetry) return;
    if (track?.readyState === 'live' && !track.muted && !video.paused
      && video.readyState >= 2 && video.currentTime !== lastTime) {
      lastTime = video.currentTime;
      lastFrameAt = performance.now();
      recoveryAttempts = 0;
    } else if (performance.now() - lastFrameAt >= FRAME_TIMEOUT_MS) {
      // Сначала переподключаем имеющийся поток к видео, затем запрашиваем новый.
      recover(!hasVideo(session) || recoveryAttempts > 0);
    }
  }, 1000);

  void start();
  function stopPreview() {
    if (!active) return;
    active = false;
    clearInterval(watchdog);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pageshow', onPageShow);
    video.removeEventListener('error', onVideoError);
    detach();
  }
  return stopPreview;
}
