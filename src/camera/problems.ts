// Состояния камеры, когда она не включилась: понятные экраны для ребёнка и инструкция для родителей (по макету Figma «Ошибки»).
import { playSfx } from '../audio/sfx';
import { speak } from '../audio/sounds';
import { CAMERA_DENIED } from '../data/phrases';
export type CamProblem = 'nocamera' | 'denied' | 'busy' | 'insecure' | 'other';
export type Platform = 'ios' | 'android' | 'desktop';
type MobileBrowser = 'chrome' | 'yandex' | 'edge' | 'opera' | 'firefox';
export type HelpArt = `android-${MobileBrowser}` | `ios-${MobileBrowser}` | 'ios' | 'android' | 'safari' | 'firefox' | 'yandex' | 'chrome' | 'edge';

// Что пошло не так по ошибке getUserMedia.
export function classifyCameraError(err: unknown): CamProblem {
  const name = (err as { name?: string } | null)?.name ?? '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return 'nocamera';
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return 'busy';
  return 'other';
}

// Почему камеру нельзя даже запросить: небезопасный контекст или в браузере её вообще нет.
export function unavailableReason(secure = isSecureContext, hasApi = !!navigator.mediaDevices?.getUserMedia): CamProblem {
  return !secure ? 'insecure' : hasApi ? 'other' : 'nocamera';
}

export function detectPlatform(ua = navigator.userAgent, touchPoints = navigator.maxTouchPoints): Platform {
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && touchPoints > 1)) return 'ios'; // iPad в режиме «как компьютер» тоже iOS
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

// Инструкция на телефоне зависит от системы, на компьютере — от браузера.
export function helpArt(ua = navigator.userAgent, p: Platform = detectPlatform(ua)): HelpArt {
  if (p !== 'desktop') {
    let browser: MobileBrowser | null = null;
    if (/YaBrowser/i.test(ua)) browser = 'yandex';
    else if (/EdgA|EdgiOS/i.test(ua)) browser = 'edge';
    else if (/OPR|Opera|OPiOS|OPT\//i.test(ua)) browser = 'opera';
    else if (/Firefox|FxiOS/i.test(ua)) browser = 'firefox';
    else if (/Chrome|Chromium|CriOS/i.test(ua)) browser = 'chrome';
    return browser ? `${p}-${browser}` : p;
  }
  if (/YaBrowser/i.test(ua)) return 'yandex';
  if (/Firefox/i.test(ua)) return 'firefox';
  if (/Edg/i.test(ua)) return 'edge';
  if (/Chrome|Chromium|OPR/i.test(ua)) return 'chrome';
  return 'safari';
}

// Шаги подключения камеры по платформам.
const BACK = 'Вернись в игру и нажми «Попробовать ещё раз»';
export function instructionSteps(p: HelpArt | 'desktop'): string[] {
  const names: Record<MobileBrowser, string> = {
    chrome: 'Google Chrome', yandex: 'Яндекс Браузер', edge: 'Microsoft Edge', opera: 'Opera', firefox: 'Mozilla Firefox',
  };
  if (p.startsWith('android-') || p.startsWith('ios-')) {
    const browser = p.slice(p.indexOf('-') + 1) as MobileBrowser;
    const name = names[browser];
    if (p.startsWith('ios-')) return [
      `Открой «Настройки» iPhone или iPad → «Приложения» → ${name}. В старых версиях iOS найди браузер прямо в «Настройках»`,
      'Если есть пункт «Камера», разреши доступ',
      'Вернись на сайт игры, обнови страницу и разреши камеру в запросе браузера',
      BACK,
    ];
    const system = `Открой «Настройки» телефона → «Приложения» → ${name} → «Разрешения» → «Камера» и разреши доступ`;
    if (browser === 'edge' || browser === 'firefox') return [system, 'Вернись на сайт игры, обнови страницу и разреши камеру в запросе браузера', BACK];
    const site = browser === 'yandex'
      ? ['Нажми три точки рядом с адресной строкой', 'Нажми на адрес сайта игры или «О сайте»', 'Найди «Камера» и выбери «Разрешить»']
      : browser === 'opera'
        ? ['Нажми значок щита рядом с адресной строкой', 'Выбери «Разрешения» и разреши доступ к камере']
        : ['Нажми значок настроек рядом с адресом сайта', 'Найди «Камера» в разрешениях сайта и выбери «Разрешить»', 'Если разрешений нет, обнови страницу и нажми «Разрешить» в запросе камеры'];
    return [...site, `Если не помогло: ${system}`, 'Вернись в браузер и обнови страницу', BACK];
  }
  if (p === 'ios') return [
    'Открой «Настройки» iPhone или iPad → «Приложения» → Safari. В старых версиях iOS найди Safari прямо в «Настройках»',
    'В разделе «Настройки для веб-сайтов» выбери «Камера»',
    'Выбери «Разрешить» или «Спрашивать»',
    BACK,
  ];
  if (p === 'android') return [
    'Открой «Настройки» телефона → «Приложения» и найди браузер, в котором открыта игра',
    'Открой «Разрешения» → «Камера» и разреши доступ',
    'Вернись в браузер, обнови страницу и разреши камеру в запросе',
    BACK,
  ];
  if (p === 'safari') return [
    'Открой меню Safari и выбери «Настройки»',
    'Перейди на вкладку «Сайты» и выбери «Камера»',
    'Найди сайт игры и выбери «Разрешить»',
    'Вернись в игру и нажми «Попробовать ещё раз»',
  ];
  if (p === 'yandex') return [
    'Нажми значок замка слева от адреса сайта',
    'В разделе «Разрешения» выбери «Камера»',
    'Выбери «Разрешить»',
    'Обнови страницу',
    BACK,
  ];
  if (p === 'firefox') return [
    'Нажми значок щита или замка слева от адреса сайта',
    'Нажми «Подробнее» или стрелку и открой «Разрешения»',
    'Рядом с «Использовать камеру» сними галочку «Использовать по умолчанию» и выбери «Разрешить»',
    'Обнови страницу',
    BACK,
  ];
  if (p === 'edge') return [
    'Нажми значок замка слева от адреса сайта',
    'Выбери «Разрешения для этого сайта»',
    'Найди «Камера» и выбери «Разрешить»',
    'Обнови страницу',
    BACK,
  ];
  return [ // Chrome, Opera и прочие
    'Нажми значок настроек или замка слева от адреса сайта',
    'Найди «Камера» и выбери «Разрешить»',
    'Обнови страницу',
    BACK,
  ];
}

interface Screen { title: string; body: string; button: string; next: 'close' | 'retry' | 'instructions' }
export const PROBLEM_SCREENS: Record<CamProblem, Screen> = {
  nocamera: { title: 'Ой, нет камеры!', body: 'Попробуй зайти в игру с телефона или планшета', button: 'Хорошо', next: 'close' },
  denied: { title: 'Нет доступа к камере', body: 'Позови родителей и следуй инструкции, чтобы подключить камеру', button: 'Подключить камеру', next: 'instructions' },
  busy: { title: 'Камера занята', body: 'Закрой другие программы, где включена камера, и попробуй ещё раз', button: 'Попробовать ещё раз', next: 'retry' },
  insecure: { title: 'Камера не включается', body: 'Похоже, браузер не может запустить камеру. Попробуй открыть игру в другом браузере', button: 'Понятно', next: 'close' },
  other: { title: 'Не получилось включить камеру', body: 'Попробуй ещё раз. Если не выходит, обнови страницу', button: 'Попробовать ещё раз', next: 'retry' },
};

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Полноэкранный экран ошибки. Закрыть («назад», Esc, «Хорошо») или попробовать снова.
export function showCameraProblem(kind: CamProblem): Promise<'retry' | 'close'> {
  return new Promise((resolve) => {
    const base = `${import.meta.env.BASE_URL}art/loc`;
    const el = document.createElement('div');
    el.className = 'cam-problem';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    document.body.appendChild(el);
    playSfx('wrong-soft');
    if (kind === 'denied') speak(CAMERA_DENIED.text, false, CAMERA_DENIED.who);
    const finish = (r: 'retry' | 'close') => { removeEventListener('keydown', onKey); el.remove(); resolve(r); };
    let view: 'problem' | 'steps' = 'problem';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') back(); };
    const back = () => (view === 'steps' ? render('problem') : finish('close'));
    addEventListener('keydown', onKey);

    function render(v: 'problem' | 'steps') {
      view = v;
      const s = PROBLEM_SCREENS[kind];
      const backBtn = `<button class="cp-back" type="button" aria-label="Назад"><i class="loc-i" style="--m:url(${base}/back.svg)"></i></button>`;
      if (v === 'steps') {
        const steps = instructionSteps(helpArt()).map((t) => `<li>${esc(t)}</li>`).join('');
        el.setAttribute('aria-label', 'Инструкция');
        el.innerHTML = `${backBtn}<main class="cp-main"><section class="cp-card cp-steps"><h2>Инструкция</h2><div class="cp-steps-body"><ol>${steps}</ol></div></section></main>
          <div class="cp-bar"><button class="cp-btn" type="button">Попробовать ещё раз</button></div>`;
        el.querySelector('.cp-btn')!.addEventListener('click', () => finish('retry'));
      } else {
        el.setAttribute('aria-label', s.title);
        el.innerHTML = `${backBtn}<main class="cp-main"><section class="cp-card"><img class="cp-ico" src="${base}/fox-camera.svg" alt="">
          <h2>${esc(s.title)}</h2><p>${esc(s.body)}</p></section></main>
          <div class="cp-bar"><button class="cp-btn" type="button">${esc(s.button)}</button></div>`;
        el.querySelector('.cp-btn')!.addEventListener('click', () => (s.next === 'instructions' ? render('steps') : finish(s.next)));
      }
      el.querySelector('.cp-back')!.addEventListener('click', back);
      el.querySelector<HTMLElement>('.cp-btn')!.focus({ preventScroll: true });
    }
    render('problem');
  });
}
