// Заготовленные фразы заврика: их можно озвучить заранее (docs/voice/phrases.txt) и положить записи в public/voice.
// Имя предмета в реплики не подставляем (кроме «Это …!» при находке), чтобы каждую фразу можно было записать целиком.
export interface Phrase { id: string; who: 'grisha' | 'sonya'; text: string }

const P = (id: string, who: Phrase['who'], text: string): Phrase => ({ id, who, text });

// Находка найдена верно (говорит Соня).
export const PRAISE: Phrase[] = [
  P('praise-1', 'sonya', 'Молодец!'),
  P('praise-2', 'sonya', 'Отлично!'),
  P('praise-3', 'sonya', 'Ура, получилось!'),
  P('praise-4', 'sonya', 'Какой ты внимательный!'),
  P('praise-5', 'sonya', 'Вот это находка!'),
  P('praise-6', 'sonya', 'Супер, так держать!'),
];

// После похвалы, перед английским словом (говорит Соня): «Вот так это будет по-английски».
export const INTRO_EN: Phrase[] = [
  P('english-1', 'sonya', 'Вот так это будет по-английски:'),
  P('english-2', 'sonya', 'А по-английски это звучит так:'),
  P('english-3', 'sonya', 'Слушай, как это по-английски:'),
];

// Перед запросом камеры у браузера (говорит Соня).
export const ASK_CAMERA: Phrase = P('camera-ask', 'sonya', 'Разреши доступ к камере. Тогда ты сможешь искать предметы');

// Сфотографировал не то (говорит Гриша): без объяснений, что именно в кадре.
export const TRY_AGAIN: Phrase[] = [
  P('again-1', 'grisha', 'Хм, это не то. Поищи ещё!'),
  P('again-2', 'grisha', 'Почти! Давай поищем дальше.'),
  P('again-3', 'grisha', 'Ой, не получилось. Попробуй ещё раз!'),
  P('again-4', 'grisha', 'Это что-то другое. Посмотри вокруг!'),
  P('again-5', 'grisha', 'Не то, но у тебя получится! Ищи дальше.'),
  P('again-6', 'grisha', 'Давай ещё разок, я в тебя верю!'),
];

// Нажал «Сфотографировать», а камера не включилась или проверка не прошла.
export const TROUBLE: Phrase[] = [
  P('trouble-1', 'sonya', 'Ой, что-то пошло не так. Давай ещё раз!'),
  P('trouble-2', 'sonya', 'Не получилось сфотографировать. Попробуй снова!'),
];

// Нашёл всё в категории, экран «Все найдено» (говорит Соня).
export const LEVEL_DONE: Phrase[] = [
  P('done-1', 'sonya', 'Ура! Ты нашёл всё!'),
  P('done-2', 'sonya', 'Вот это да! Ты нашёл всё до последнего!'),
  P('done-3', 'sonya', 'Ты справился! Какой же ты молодец!'),
];

// Подсказки при входе: на главной (выбор места с персонажем) и внутри места (выбор предмета).
export const HINT_PLACE: Phrase[] = [
  P('hint-place-3', 'sonya', 'Питомцам грустно. Помоги им! Пройди все места, и они станут весёлыми!'),
  P('hint-place-4', 'sonya', 'Наши питомцы загрустили. Найди все предметы во всех местах, и они снова будут радоваться!'),
];
export const HINT_ITEM: Phrase[] = [
  P('hint-item-1', 'sonya', 'Выбери предмет!'),
  P('hint-item-2', 'sonya', 'Нажми на предмет, который будем искать!'),
];
// То же в месте «Цвета»: там ищем цвета, а не предметы.
export const HINT_COLOR: Phrase[] = [
  P('hint-color-1', 'sonya', 'Выбери цвет!'),
  P('hint-color-2', 'sonya', 'Нажми на цвет, который будем искать!'),
];

// Нажал на закрытое место (говорит Соня).
export const LOCKED_HINT: Phrase[] = [
  P('locked-1', 'sonya', 'Это место пока закрыто. Сначала пройди предыдущее!'),
  P('locked-2', 'sonya', 'Ещё рано! Сначала найди всё в предыдущем месте.'),
];

// Нажал на закрытое задание внутри места (говорит Соня).
export const TASK_LOCKED: Phrase[] = [
  P('tlocked-1', 'sonya', 'Сначала найди предыдущий предмет!'),
  P('tlocked-2', 'sonya', 'Этот предмет ещё закрыт. Иди по порядку!'),
];

// После задания «Найди …»: что делать с камерой (говорит Соня).
export const TASK_AIM: Phrase = P('aim-1', 'sonya', 'Наведи камеру на предмет!');

// После найденного предмета: что делать дальше (говорит Соня).
export const NEXT_HINT: Phrase = P('next-1', 'sonya', 'Идём дальше! Нажми на кнопку внизу');

// Заврик вырос: «Гриша вырос! Уровень 2!» (говорит Соня); уровни 2..5, имена как в zavrik.ts.
export const levelUpText = (name: string, level: number) => `${name} ${name === 'Соня' ? 'выросла' : 'вырос'}! Уровень ${level}!`;
export const LEVEL_UP: Phrase[] = ['Гриша', 'Соня'].flatMap((name) => [2, 3, 4, 5].map((n) => P(`levelup-${name === 'Гриша' ? 'g' : 's'}${n}`, 'sonya', levelUpText(name, n))));

// Видео-приветствие на 15 секунд (docs/video-onboarding-prompt.md): три питомца, закадровый голос Сони.
export const VIDEO_LINES: Phrase[] = [
  P('video-1', 'sonya', 'Привет! Давай вместе искать предметы!'),
  P('video-2', 'sonya', 'Смотри, как мы это делаем. Сначала найди предмет.'),
  P('video-3', 'sonya', 'Потом наведи на него камеру.'),
  P('video-4', 'sonya', 'Когда рамка станет зелёной, предмет найден!'),
  P('video-5', 'sonya', 'Давай играть!'),
];

export const ALL_PHRASES: Phrase[] = [TASK_AIM, ...VIDEO_LINES, NEXT_HINT, ...LEVEL_UP, ...PRAISE, ...INTRO_EN, ASK_CAMERA, ...TRY_AGAIN, ...TROUBLE, ...LEVEL_DONE, ...HINT_PLACE, ...HINT_ITEM, ...HINT_COLOR, ...LOCKED_HINT, ...TASK_LOCKED];

// Случайная фраза, не повторяющая предыдущую из этого же списка.
const last = new Map<Phrase[], string>();
export function pickPhrase(list: Phrase[], rnd: () => number = Math.random): Phrase {
  const prev = last.get(list);
  const pool = list.length > 1 ? list.filter((p) => p.id !== prev) : list;
  const p = pool[Math.floor(rnd() * pool.length)];
  last.set(list, p.id);
  return p;
}
