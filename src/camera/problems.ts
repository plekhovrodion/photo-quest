// Состояния камеры, когда она не включилась: понятные экраны для ребёнка и инструкция для родителей (по макету Figma «Ошибки»).
import { playSfx } from '../audio/sfx';
export type CamProblem = 'nocamera' | 'denied' | 'busy' | 'insecure' | 'other';
export type Platform = 'ios' | 'android' | 'desktop';
export type HelpArt = 'ios' | 'android' | 'safari' | 'firefox' | 'yandex' | 'chrome';

// Что пошло не так по ошибке getUserMedia.
export function classifyCameraError(err: unknown): CamProblem {
  const name = (err as { name?: string } | null)?.name ?? '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return 'nocamera';
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return 'busy';
  return 'other';
}

// Почему камеру нельзя даже запросить: не защищённая ссылка (нужен https) или в браузере её вообще нет.
export function unavailableReason(secure = isSecureContext, hasApi = !!navigator.mediaDevices?.getUserMedia): CamProblem {
  return !secure ? 'insecure' : hasApi ? 'other' : 'nocamera';
}

export function detectPlatform(ua = navigator.userAgent, touchPoints = navigator.maxTouchPoints): Platform {
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && touchPoints > 1)) return 'ios'; // iPad в режиме «как компьютер» тоже iOS
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

// Какую анимированную подсказку показать: на телефоне по системе, на компьютере по браузеру (Edge и Opera устроены как Chrome).
export function helpArt(ua = navigator.userAgent, p: Platform = detectPlatform(ua)): HelpArt {
  if (p !== 'desktop') return p;
  if (/YaBrowser/i.test(ua)) return 'yandex';
  if (/Firefox/i.test(ua)) return 'firefox';
  if (/Chrome|Chromium|Edg|OPR/i.test(ua)) return 'chrome';
  return 'safari';
}

// Шаги подключения камеры по платформам.
const BACK = 'Вернись в игру и нажми «Попробовать ещё раз»';
export function instructionSteps(p: HelpArt | 'desktop'): string[] {
  if (p === 'ios') return [
    'Нажми «Аа» слева в адресной строке Safari',
    'Выбери «Настройки веб-сайта»',
    'Включи переключатель «Камера»',
    BACK,
    'Не вышло? Открой «Настройки» → Safari → «Камера» и выбери «Спросить» или «Разрешить»',
  ];
  if (p === 'android') return [
    'Нажми значок слева от адреса сайта (замок или настройки)',
    'Выбери «Разрешения» → «Камера»',
    'Включи переключатель «Камера»',
    BACK,
    'Не вышло? Открой «Настройки» телефона → «Приложения» → Chrome → «Разрешения» → «Камера» → «Разрешить»',
  ];
  if (p === 'safari') return [
    'Нажми «Safari» в верхней строке экрана и выбери «Настройки для этого сайта»',
    'Включи переключатель «Камера»',
    'Обнови страницу',
    BACK,
  ];
  if (p === 'yandex') return [
    'Нажми значок замка слева от адреса сайта',
    'Выбери «Настройки сайта»',
    'Включи переключатель «Камера»',
    'Обнови страницу',
    BACK,
  ];
  if (p === 'firefox') return [
    'Нажми значок замка слева от адреса сайта',
    'Выбери «Подключение защищено» → «Разрешения»',
    'Рядом с «Использовать камеру» убери блокировку',
    'Обнови страницу',
    BACK,
  ];
  return [ // chrome, edge, opera и прочие
    'Нажми значок настроек слева от адреса сайта',
    'Включи переключатель «Камера»',
    'Обнови страницу',
    BACK,
  ];
}

interface Screen { title: string; body: string; button: string; next: 'close' | 'retry' | 'instructions' }
export const PROBLEM_SCREENS: Record<CamProblem, Screen> = {
  nocamera: { title: 'Ой, нет камеры!', body: 'Попробуй зайти в игру с телефона или планшета', button: 'Хорошо', next: 'close' },
  denied: { title: 'Нет доступа к камере', body: 'Позови родителей и следуй инструкции, чтобы подключить камеру', button: 'Подключить камеру', next: 'instructions' },
  busy: { title: 'Камера занята', body: 'Закрой другие программы, где включена камера, и попробуй ещё раз', button: 'Попробовать ещё раз', next: 'retry' },
  insecure: { title: 'Камера не включается', body: 'Позови родителей: игру нужно открыть по защищённой ссылке, которая начинается с https', button: 'Хорошо', next: 'close' },
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
        // анимированная подсказка art/help/camera-<браузер>.svg; пока файла нет, остаётся синяя заглушка
        const media = `<figure class="cp-media"><div class="cpm-gif"><img src="${import.meta.env.BASE_URL}art/help/camera-${helpArt()}.svg" alt="" onerror="this.remove()"></div></figure>`;
        el.setAttribute('aria-label', 'Инструкция');
        el.innerHTML = `${backBtn}<main class="cp-main"><section class="cp-card cp-steps"><h2>Инструкция</h2><div class="cp-steps-body">${media}<ol>${steps}</ol></div></section></main>
          <div class="cp-bar"><img class="tap-arrow" src="${base}/arrow-tap.svg" alt="" aria-hidden="true"><button class="cp-btn" type="button">Попробовать ещё раз</button></div>`;
        el.querySelector('.cp-btn')!.addEventListener('click', () => finish('retry'));
      } else {
        el.setAttribute('aria-label', s.title);
        el.innerHTML = `${backBtn}<main class="cp-main"><section class="cp-card"><img class="cp-ico" src="${base}/camera-big.svg" alt="">
          <h2>${esc(s.title)}</h2><p>${esc(s.body)}</p></section></main>
          <div class="cp-bar"><img class="tap-arrow" src="${base}/arrow-tap.svg" alt="" aria-hidden="true"><button class="cp-btn" type="button">${esc(s.button)}</button></div>`;
        el.querySelector('.cp-btn')!.addEventListener('click', () => (s.next === 'instructions' ? render('steps') : finish(s.next)));
      }
      el.querySelector('.cp-back')!.addEventListener('click', back);
      el.querySelector<HTMLElement>('.cp-btn')!.focus({ preventScroll: true });
    }
    render('problem');
  });
}
