const MAX_SIDE = 1024;
const QUALITY = 0.8;

// Сжимает фото с камеры до ~1024 px по длинной стороне в JPEG.
export async function compressPhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', QUALITY),
  );
}

// Системная камера через <input capture>: работает в мобильных браузерах без доп. разрешений.
export function pickPhotoFile(): Promise<Blob | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null));
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

// Ноутбуки и компьютеры: мышь/трекпад и нет сенсорного ввода как основного.
export function isDesktop(): boolean {
  return matchMedia('(hover: hover) and (pointer: fine)').matches;
}

// Живая камера в браузере нужна getUserMedia, а он работает только в безопасном контексте (https или localhost).
export function canUseLiveCamera(): boolean {
  return isSecureContext && !!navigator.mediaDevices?.getUserMedia;
}

function stop(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

// Оверлей с живым видео: «Снять» делает кадр, «Отмена» закрывает. При ошибке доступа
// предлагаем выбрать файл (отдельное нажатие — браузеры разрешают открыть диалог только по клику).
function liveCamera(): Promise<Blob | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'cam-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Камера');
    overlay.innerHTML = `
      <video class="cam-video" autoplay playsinline muted></video>
      <p class="cam-msg" hidden></p>
      <div class="cam-actions">
        <button class="cam-shoot" type="button">📸 Снять</button>
        <button class="cam-file secondary" type="button" hidden>🖼 Выбрать файл</button>
        <button class="cam-cancel secondary" type="button">Отмена</button>
      </div>`;
    document.body.appendChild(overlay);

    const video = overlay.querySelector<HTMLVideoElement>('.cam-video')!;
    const msg = overlay.querySelector<HTMLElement>('.cam-msg')!;
    const shoot = overlay.querySelector<HTMLButtonElement>('.cam-shoot')!;
    const fileBtn = overlay.querySelector<HTMLButtonElement>('.cam-file')!;
    let stream: MediaStream | null = null;

    const done = (blob: Blob | null) => {
      stop(stream);
      overlay.remove();
      removeEventListener('keydown', onKey);
      resolve(blob);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') done(null); };
    addEventListener('keydown', onKey);

    const fail = (text: string) => {
      msg.textContent = text;
      msg.hidden = false;
      shoot.hidden = true;
      video.hidden = true;
      fileBtn.hidden = false;
    };

    // «Снять» активна только когда пошло видео, иначе кадр будет пустым.
    shoot.disabled = true;
    video.addEventListener('loadeddata', () => { shoot.disabled = false; }, { once: true });

    overlay.querySelector('.cam-cancel')!.addEventListener('click', () => done(null));
    fileBtn.addEventListener('click', async () => done(await pickPhotoFile()));
    shoot.addEventListener('click', () => {
      if (!video.videoWidth) return;
      const c = document.createElement('canvas');
      c.width = video.videoWidth;
      c.height = video.videoHeight;
      c.getContext('2d')!.drawImage(video, 0, 0);
      c.toBlob((b) => done(b), 'image/jpeg', 0.92);
    });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then((s) => {
        stream = s;
        video.srcObject = s;
      })
      .catch((err: DOMException) =>
        fail(err.name === 'NotAllowedError'
          ? 'Нет доступа к камере. Разреши её в настройках браузера или выбери фото из файла.'
          : 'Камера не найдена. Можно выбрать фото из файла.'),
      );
  });
}

// На ноутбуках и компьютерах открываем живую камеру, на телефонах — системную камеру.
export function takePhoto(): Promise<Blob | null> {
  return isDesktop() && canUseLiveCamera() ? liveCamera() : pickPhotoFile();
}
