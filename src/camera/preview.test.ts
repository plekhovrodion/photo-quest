import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./prepermission', () => ({
  withCameraPrompt: (request: () => Promise<MediaStream>) => request(),
}));

class FakeTrack extends EventTarget {
  readyState = 'live';
  muted = false;
  stop = vi.fn(() => { this.readyState = 'ended'; });
  end() {
    this.readyState = 'ended';
    this.dispatchEvent(new Event('ended'));
  }
}

class FakeStream {
  track = new FakeTrack();
  getTracks() { return [this.track]; }
  getVideoTracks() { return [this.track]; }
}

class FakeVideo extends EventTarget {
  srcObject: FakeStream | null = null;
  paused = true;
  currentTime = 0;
  readyState = 2;
  play = vi.fn(async () => { this.paused = false; });
  pause = vi.fn(() => { this.paused = true; });
}

let page: EventTarget;
let doc: EventTarget & { hidden: boolean };
let streams: FakeStream[];
let getUserMedia: ReturnType<typeof vi.fn>;
let stops: Array<() => void>;

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
  page = new EventTarget();
  doc = Object.assign(new EventTarget(), { hidden: false });
  streams = [];
  stops = [];
  getUserMedia = vi.fn(async () => {
    const stream = new FakeStream();
    streams.push(stream);
    return stream;
  });
  vi.stubGlobal('window', page);
  vi.stubGlobal('document', doc);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
});

afterEach(() => {
  stops.forEach((stop) => stop());
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function preview(video = new FakeVideo()) {
  const { startCameraPreview } = await import('./preview');
  const options = {
    onReady: vi.fn(),
    onPause: vi.fn(),
    onError: vi.fn().mockResolvedValue(false),
  };
  const stop = startCameraPreview(video as unknown as HTMLVideoElement, options);
  stops.push(stop);
  await vi.advanceTimersByTimeAsync(0);
  return { video, options, stop };
}

describe('восстановление камеры', () => {
  it('между заданиями отключает старое видео и переиспользует разрешённый поток', async () => {
    const first = await preview();
    first.stop();
    expect(first.video.srcObject).toBeNull();
    expect(first.video.paused).toBe(true);
    const second = await preview();
    expect(second.video.srcObject).toBe(streams[0]);
    expect(streams[0].track.stop).not.toHaveBeenCalled();
    expect(getUserMedia).toHaveBeenCalledOnce();
  });

  it('запрашивает новый поток, если iOS остановила видеодорожку', async () => {
    const { video, options } = await preview();
    streams[0].track.end();
    await vi.advanceTimersByTimeAsync(0);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(video.srcObject).toBe(streams[1]);
    expect(options.onReady).toHaveBeenCalledTimes(2);
  });

  it('восстанавливает открытое задание после блокировки и возврата из BFCache', async () => {
    const { video, options } = await preview();
    doc.hidden = true;
    doc.dispatchEvent(new Event('visibilitychange'));
    page.dispatchEvent(new Event('pagehide'));
    expect(streams[0].track.stop).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(getUserMedia).toHaveBeenCalledOnce();
    doc.hidden = false;
    page.dispatchEvent(new Event('pageshow'));
    doc.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(video.srcObject).toBe(streams[1]);
    expect(options.onReady).toHaveBeenCalledTimes(2);
  });

  it('при возврате из фона сохраняет здоровый поток и возобновляет видео', async () => {
    const { video } = await preview();
    doc.hidden = true;
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(video.paused).toBe(true);
    doc.hidden = false;
    doc.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(video.paused).toBe(false);
    expect(getUserMedia).toHaveBeenCalledOnce();
  });

  it('восстанавливает зависшее превью и ограничивает повторные запросы камеры', async () => {
    const { video, options } = await preview();
    await vi.advanceTimersByTimeAsync(5000);
    expect(video.play).toHaveBeenCalledTimes(2);
    expect(getUserMedia).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(5000);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(5000);
    expect(options.onError).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(options.onError).toHaveBeenCalledOnce();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it('не перезапускает камеру, когда кадры продолжают поступать', async () => {
    const { video, options } = await preview();
    for (let time = 1; time <= 12; time++) {
      video.currentTime = time;
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(video.play).toHaveBeenCalledOnce();
    expect(options.onError).not.toHaveBeenCalled();
  });

  it('смена задания во время запроса разрешения разделяет один getUserMedia', async () => {
    let grant!: (stream: FakeStream) => void;
    getUserMedia.mockImplementationOnce(() => new Promise<FakeStream>((resolve) => { grant = resolve; }));
    const first = await preview();
    first.stop();
    const second = await preview();
    const stream = new FakeStream();
    grant(stream);
    await vi.advanceTimersByTimeAsync(0);
    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(first.video.srcObject).toBeNull();
    expect(second.video.srcObject).toBe(stream);
    expect(stream.track.stop).not.toHaveBeenCalled();
  });

  it('уход из игры отменяет незавершённый запуск и останавливает поздний поток', async () => {
    let grant!: (stream: FakeStream) => void;
    getUserMedia.mockImplementationOnce(() => new Promise<FakeStream>((resolve) => { grant = resolve; }));
    const first = await preview();
    first.stop();
    const { releaseCameraSession } = await import('./preview');
    releaseCameraSession();
    const second = await preview();
    const late = new FakeStream();
    grant(late);
    await vi.advanceTimersByTimeAsync(0);
    expect(late.track.stop).toHaveBeenCalledOnce();
    expect(second.video.srcObject).toBe(streams[0]);
    expect(second.options.onError).not.toHaveBeenCalled();
  });

  it('отказ в разрешении возвращает ошибку, не повторяя запрос автоматически', async () => {
    const denied = new DOMException('Permission denied', 'NotAllowedError');
    getUserMedia.mockRejectedValueOnce(denied);
    const { options } = await preview();
    expect(options.onError).toHaveBeenCalledWith(denied);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(getUserMedia).toHaveBeenCalledOnce();
  });

  it('зависший play показывает восстановление вместо бесконечного чёрного экрана', async () => {
    const video = new FakeVideo();
    video.play.mockImplementationOnce(() => new Promise(() => {}));
    const { options } = await preview(video);
    await vi.advanceTimersByTimeAsync(5000);
    expect(options.onError).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
  });
});
