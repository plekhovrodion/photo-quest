export interface Slide {
  emoji: string;
  title: string;
  text: string;
}

export const SLIDES: Slide[] = [
  { emoji: '👋', title: 'Привет! Я ФотоКвест', text: 'Мы будем искать разные вещи у тебя дома и фотографировать их.' },
  { emoji: '🔎', title: 'Получи задание', text: 'Например: «Найди что-то красное!». Оглянись вокруг и поищи.' },
  { emoji: '📷', title: 'Сфотографируй', text: 'Нажми кнопку, наведи камеру на находку и сделай снимок. Я посмотрю, то ли это.' },
  { emoji: '⚡', title: 'Собирай вспышки', text: 'За каждую находку ты получаешь вспышки. На них можно купить друзей в магазине!' },
  { emoji: '🏠', title: 'Только дома и в безопасности', text: 'Ищи вещи в комнате, не лезь высоко и не трогай острое. Можно позвать взрослого.' },
];

const KEY = 'photoquest.onboarded.v1';

export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // без хранилища онбординг просто покажется снова
  }
}
