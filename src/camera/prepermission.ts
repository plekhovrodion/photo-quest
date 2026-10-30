// Объясняем, зачем нужна камера, ДО системного запроса браузера (по макету «Саундчек»): тёмный размытый фон,
// затем появляется карточка, и только после кнопки «Далее» вызывается getUserMedia. Если доступ уже есть или запрещён, экран не показываем.
import { speak } from '../audio/sounds';
import { playSfx } from '../audio/sfx';
import { ASK_CAMERA } from '../data/phrases';

let shownThisSession = false;

async function permissionState(): Promise<PermissionState | 'unknown'> {
  try {
    const st = await navigator.permissions?.query({ name: 'camera' as PermissionName });
    return st?.state ?? 'unknown';
  } catch {
    return 'unknown'; // Safari и часть браузеров не умеют спрашивать про камеру
  }
}

export async function explainCameraAccess(): Promise<void> {
  const st = await permissionState();
  if (st === 'granted' || st === 'denied') return;
  if (st === 'unknown' && shownThisSession) return;
  shownThisSession = true;

  await new Promise<void>((resolve) => {
    const el = document.createElement('div');
    el.className = 'cam-ask';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Разреши доступ к камере');
    el.innerHTML = `<div class="ca-card">
      <h2>Разреши доступ к камере</h2>
      <p>Тогда ты сможешь фотографировать предметы и находить их</p>
      <button class="ca-btn" type="button">Далее</button></div>`;
    document.body.appendChild(el);
    playSfx('modal-open');
    const btn = el.querySelector<HTMLButtonElement>('.ca-btn')!;
    btn.addEventListener('click', () => { el.remove(); resolve(); });
    // кнопка доступна, когда закончилась анимация появления: фон 500 мс, пауза 300 мс, карточка 500 мс
    setTimeout(() => { btn.focus({ preventScroll: true }); speak(ASK_CAMERA.text, false, ASK_CAMERA.who); }, 1300);
  });
}
