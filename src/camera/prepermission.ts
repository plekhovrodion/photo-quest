// Запрос камеры по макету «Саундчек» (то же, что для микрофона, только с камерой).
// Компьютер: пока браузер показывает своё окошко с вопросом, поверх размытого фона лиса указкой показывает на это окошко,
// а внизу (в Safari вверху) карточка «Разреши доступ к камере»; место лисы зависит от браузера, потому что окошко у них в разных местах.
// Телефон: сначала карточка с кнопкой «Далее», и только после неё вызываем браузер; пока он спрашивает, остаётся размытый фон.
// Если доступ уже есть или запрещён, экран не показываем.
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

// Где браузер рисует своё окошко с вопросом: слева сверху (Chrome, Firefox, Edge, Opera), справа сверху (Яндекс), по центру (Safari).
export type PromptSide = 'left' | 'right' | 'center';
export function promptSide(ua = navigator.userAgent): PromptSide {
  if (/YaBrowser/i.test(ua)) return 'right';
  if (/Safari/i.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Android/i.test(ua)) return 'center';
  return 'left';
}

const base = () => `${import.meta.env.BASE_URL}art/perm`;
const TITLE = 'Разреши доступ к камере';

function desktopHtml(side: PromptSide): string {
  const fox = `<img class="pm-fox pm-fox-${side}" src="${base()}/fox-${side}.svg" alt="">`;
  return `${fox}<div class="pm-card"><h2>${TITLE}</h2><p>Тогда ты сможешь <span class="pm-tag">искать предметы</span></p></div>`;
}

const mobileHtml = () => `<div class="pm-mcard"><img class="pm-fox-mobile" src="${base()}/fox-mobile.svg" alt="">
  <h2>${TITLE}</h2><p>Тогда ты сможешь <b>искать предметы</b></p>
  <button class="pm-next" type="button"><i class="pm-next-shadow"></i><i class="pm-next-bg"></i><span>Далее</span></button></div>`;

// Пока окно просьбы говорит само, оно перебивает озвучку задания. Когда окно закрылось, экран задания договаривает (см. main.ts).
let onClosed: (() => void) | null = null;
export const onCameraPromptClosed = (fn: () => void) => { onClosed = fn; };

// Выполняет запрос камеры (getUserMedia) и пока он ждёт ответа, показывает подсказку.
export async function withCameraPrompt<T>(request: () => Promise<T>): Promise<T> {
  const st = await permissionState();
  if (st === 'granted' || st === 'denied' || (st === 'unknown' && shownThisSession)) return request();
  shownThisSession = true;

  const el = document.createElement('div');
  el.className = 'perm-ask';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', TITLE);
  const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
  const side = promptSide();
  el.classList.add(mobile ? 'pm-mobile' : `pm-side-${side}`);
  el.innerHTML = mobile ? mobileHtml() : desktopHtml(side);
  document.body.appendChild(el);
  playSfx('modal-open');
  const say = () => speak(ASK_CAMERA.text, false, ASK_CAMERA.who);

  if (mobile) {
    await new Promise<void>((resolve) => {
      const btn = el.querySelector<HTMLButtonElement>('.pm-next')!;
      btn.addEventListener('click', () => { el.querySelector('.pm-mcard')?.remove(); resolve(); });
      setTimeout(() => { btn.focus({ preventScroll: true }); say(); }, 400);
    });
  } else say();

  try {
    return await request();
  } finally {
    el.remove();
    onClosed?.();
  }
}
