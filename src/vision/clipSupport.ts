export class UnsupportedRecognitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedRecognitionError';
  }
}

// Проверяем те же инструкции SIMD, которые нужны установленному ONNX Runtime.
// Номер версии браузера не гарантирует поддержку этих инструкций.
const SIMD_CHECK = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 30, 1, 28, 0, 65, 0, 253, 15, 253, 12, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 253, 186, 1, 26, 11,
]);

export function assertRecognitionSupport() {
  let supported = false;
  try {
    supported = typeof WebAssembly !== 'undefined' && WebAssembly.validate(SIMD_CHECK);
  } catch {
    // Некоторые старые браузеры бросают исключение при проверке WebAssembly.
  }
  if (supported) return;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const advice = ios ? 'Обновите iOS в настройках устройства.' : 'Обновите браузер и операционную систему.';
  throw new UnsupportedRecognitionError(`Эта версия браузера не поддерживает распознавание. ${advice}`);
}
