export interface Slide {
  art: string; // имя картинки в /art
  who: string; // кто говорит
  text: string;
  obj?: string; // 3D-картинка к реплике (id предмета из map/objects.ts)
}

export const SLIDES: Slide[] = [
  { art: 'ship', who: 'Гриша', text: 'Привет! Мы с Соней — заврики. Мы прилетели на космическом корабле с далёкой планеты!' },
  { art: 'sonya-wave', who: 'Соня', text: 'Мы совсем не знаем вашего мира. Поможешь нам его узнать?' },
  { art: 'grisha-happy', who: 'Гриша', text: 'Я буду говорить задание, например: «Найди предмет с красным цветом». Ищи его у себя дома!', obj: 'ball-red' },
  { art: 'sonya-cheer', who: 'Соня', text: 'Нашёл? Нажми «Сфотографировать» и сними находку. Я скажу, что это, и поставлю звёздочки!', obj: 'apple' },
  { art: 'jet-2', who: 'Гриша', text: 'Чем быстрее найдёшь, тем больше звёзд и вспышек. На вспышки можно открывать новые места!', obj: 'trophy' },
  { art: 'sonya-walk', who: 'Соня', text: 'Ищи только дома. Не лезь высоко и не трогай острое. Можно позвать взрослого!', obj: 'umbrella' },
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
