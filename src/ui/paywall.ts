import { paywallUrl, parseBuyMessage } from '../api/paywall';

// Экран пейвола поверх игры: общий сервис Учи в iframe и круглая кнопка «назад».
// Покупка подтверждена (сообщение из iframe): уходим на путь оплаты. Закрыть можно кнопкой и Esc.
export function showPaywall(): Promise<void> {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'paywall';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Полный доступ');
    el.innerHTML = `<iframe class="pw-frame" title="Полный доступ" allowfullscreen></iframe><button class="pw-back" type="button" aria-label="Вернуться в игру"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg></button>`;
    const frame = el.querySelector<HTMLIFrameElement>('.pw-frame')!;
    frame.src = paywallUrl();
    const done = () => { removeEventListener('keydown', onKey); removeEventListener('message', onMessage); el.remove(); resolve(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') done(); };
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.contentWindow) return; // слушаем только свой iframe
      const path = parseBuyMessage(e.data);
      if (path) location.assign(path);
    };
    addEventListener('keydown', onKey);
    addEventListener('message', onMessage);
    el.querySelector('.pw-back')!.addEventListener('click', done);
    document.body.appendChild(el);
  });
}
