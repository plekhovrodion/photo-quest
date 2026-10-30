// Пейвол: общий сервис Учи (content-paywall) открывается в iframe, наружу он сообщает о покупке через postMessage.
// Своей вёрстки покупки в игре нет: мы показываем его, ждём подтверждение и уводим браузер на присланный путь.
export const PAYWALL_BUY_EVENT = 'click_buy_button';

// Адрес пейвола задаёт окружение (Shaman: CONTENT_PAYWALL_URL). Пусто — пейвол не подключён, кнопки покупки нет.
export const paywallUrl = (): string => {
  const url = String(import.meta.env.VITE_CONTENT_PAYWALL_URL ?? '').trim();
  return url.startsWith('<%') ? '' : url; // непостроенный шаблон окружения (<%…%>) считаем пустым адресом
};

// Путь оплаты из сообщения пейвола. Принимаем только путь на нашем сайте (начинается с одного «/»):
// сообщение приходит из iframe, и увести ребёнка на чужой адрес через него нельзя.
export function parseBuyMessage(data: unknown): string | null {
  const d = data as { eventType?: unknown; payload?: { paymentPath?: unknown } } | null;
  if (d?.eventType !== PAYWALL_BUY_EVENT) return null;
  const path = d.payload?.paymentPath;
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return null;
  return path;
}
