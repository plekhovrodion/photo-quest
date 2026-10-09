export interface Slide {
  art: string; // имя картинки в /art
  title: string;
  text: string;
}

export const SLIDES: Slide[] = [
  { art: 'ship', title: 'Гости с другой планеты', text: 'Гриша и Соня прилетели на космическом корабле и никогда не видели нашего мира.' },
  { art: 'grisha-happy', title: 'Покажи им мир', text: 'Гриша даст задание, например: «Найди предмет с зелёным цветом!». Оглянись вокруг и поищи.' },
  { art: 'sonya-wave', title: 'Сфотографируй находку', text: 'Нажми кнопку и сделай снимок. Соня скажет, что это за предмет, и поставит тебе звёздочки.' },
  { art: 'grisha-cheer', title: 'Собирай вспышки', text: 'За находки ты получаешь звёзды и вспышки. На вспышки можно купить друзей в магазине!' },
  { art: 'sonya-cheer', title: 'Только дома и в безопасности', text: 'Ищи вещи в комнате, не лезь высоко и не трогай острое. Можно позвать взрослого.' },
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
