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
  P('praise-7', 'sonya', 'Здорово получилось!'),
  P('praise-8', 'sonya', 'Ничего себе, как быстро!'),
  P('praise-9', 'sonya', 'Какой зоркий глаз!'),
  P('praise-10', 'sonya', 'Браво!'),
  P('praise-11', 'sonya', 'Вот это да!'),
  P('praise-12', 'sonya', 'Ты настоящий искатель!'),
  P('praise-13', 'sonya', 'Замечательно!'),
  P('praise-14', 'sonya', 'Прекрасно, у тебя здорово выходит!'),
  P('praise-15', 'sonya', 'Да ты настоящий исследователь!'),
  P('praise-16', 'sonya', 'Есть ещё одна находка! Класс!'),
];

// После похвалы, перед английским словом (говорит Соня): «Вот так это будет по-английски».
export const INTRO_EN: Phrase[] = [
  P('english-1', 'sonya', 'Вот так это будет по-английски:'),
  P('english-2', 'sonya', 'А по-английски это звучит так:'),
  P('english-3', 'sonya', 'Слушай, как это по-английски:'),
];

// Перед запросом камеры у браузера (говорит Соня).
export const ASK_CAMERA: Phrase = P('camera-ask', 'sonya', 'Разреши доступ к камере. Тогда ты сможешь искать предметы');

// Когда доступ к камере запрещён (говорит Соня).
export const CAMERA_DENIED: Phrase = P('camera-denied', 'sonya', 'Позови родителей и следуй инструкции, чтобы подключить камеру');

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
  P('done-4', 'sonya', 'Ура, всё найдено! Ты настоящий исследователь!'),
  P('done-5', 'sonya', 'Невероятно! Здесь не осталось ни одного предмета!'),
  P('done-6', 'sonya', 'Браво! Всё место пройдено!'),
];

// Найдены вообще все задания всех мест (говорит Соня): звучит вместо обычной фразы окончания места.
export const GAME_DONE: Phrase[] = [
  P('game-done-1', 'sonya', 'Ура! Ты прошёл вообще все задания! Какой же ты молодец!'),
  P('game-done-2', 'sonya', 'Невероятно! Ты нашёл всё на свете! Ты просто молодец!'),
];

// После английского слова: ребёнок повторяет вслух (говорит Соня). Дальше пауза и слово ещё раз.
export const REPEAT_AFTER: Phrase[] = [
  P('repeat-1', 'sonya', 'Повтори за мной!'),
  P('repeat-2', 'sonya', 'А теперь ты скажи!'),
  P('repeat-3', 'sonya', 'Скажи вместе со мной!'),
];

// Мини-раунд «услышь слово и выбери картинку» после найденного предмета (говорит Соня).
export const QUIZ_ASK: Phrase = P('quiz-ask', 'sonya', 'Послушай слово и выбери картинку!');
export const QUIZ_WRONG: Phrase[] = [
  P('quiz-wrong-1', 'sonya', 'Попробуй ещё раз!'),
  P('quiz-wrong-2', 'sonya', 'Послушай ещё раз!'),
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

export const ONBOARDING_HINT: Phrase[] = [
  P('onboarding-pet', 'sonya', 'Выбери питомца на экране.'),
];
export const ONBOARDING_CAMERA: Record<string, Phrase> = {
  'color-red': P('onboarding-camera-red', 'sonya', 'Возьми телефон в руки и наведи камеру на предмет с красным цветом.'),
  'color-blue': P('onboarding-camera-blue', 'sonya', 'Возьми телефон в руки и наведи камеру на предмет с синим цветом.'),
  'color-green': P('onboarding-camera-green', 'sonya', 'Возьми телефон в руки и наведи камеру на предмет с зелёным цветом.'),
};

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
export const TASK_AIM: Phrase = P('aim-1', 'sonya', 'Наведи камеру!');

// Короткая реплика на экране ожидания модели.
export const WAIT_LOADING: Phrase = P('loading-1', 'sonya', 'Подожди, сейчас загружается!');

// После найденного предмета: что делать дальше (говорит Соня).
export const NEXT_HINT: Phrase = P('next-1', 'sonya', 'Идём дальше! Нажми на кнопку внизу');

// Видео-приветствие на 15 секунд (docs/video-onboarding-prompt.md): три питомца, закадровый голос Сони.
export const VIDEO_LINES: Phrase[] = [
  P('video-1', 'sonya', 'Привет! Давай вместе искать предметы!'),
  P('video-2', 'sonya', 'Смотри, как мы это делаем. Сначала найди предмет.'),
  P('video-3', 'sonya', 'Потом наведи на него камеру.'),
  P('video-4', 'sonya', 'Когда рамка станет зелёной, предмет найден!'),
  P('video-5', 'sonya', 'Давай играть!'),
];

export const ALL_PHRASES: Phrase[] = [TASK_AIM, WAIT_LOADING, ...VIDEO_LINES, NEXT_HINT, ...PRAISE, ...INTRO_EN, ASK_CAMERA, CAMERA_DENIED, ...TRY_AGAIN, ...TROUBLE, ...LEVEL_DONE, ...GAME_DONE, ...REPEAT_AFTER, QUIZ_ASK, ...QUIZ_WRONG, ...HINT_PLACE, ...HINT_ITEM, ...HINT_COLOR, ...ONBOARDING_HINT, ...Object.values(ONBOARDING_CAMERA), ...LOCKED_HINT, ...TASK_LOCKED];

// Случайная фраза, не повторяющая предыдущую из этого же списка.
const last = new Map<Phrase[], string>();
export function pickPhrase(list: Phrase[], rnd: () => number = Math.random): Phrase {
  const prev = last.get(list);
  const pool = list.length > 1 ? list.filter((p) => p.id !== prev) : list;
  const p = pool[Math.floor(rnd() * pool.length)];
  last.set(list, p.id);
  return p;
}
