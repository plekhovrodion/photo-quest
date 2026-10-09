import { LEVELS } from './tasks';

export interface Chapter {
  levelId: string;
  place: string;
  color: string; // цвет кусочка радуги
  intro: string;
  outro: string;
}

export const PREMISE =
  'Жил-был Фоти — весёлый фотоаппарат. Озорной ветер разбросал по дому кусочки радуги. Помоги Фоти найти их все!';

export const FINALE = 'Радуга снова сияет! Спасибо, ты настоящий мастер ФотоКвеста!';

export const CHAPTERS: Chapter[] = [
  { levelId: 'colors', place: 'Долина Красок', color: '#ef4444',
    intro: 'Ветер закрутил все краски! Найди цветные вещи, и первый кусочек радуги вернётся.',
    outro: 'Ура! Красный кусочек радуги на месте!' },
  { levelId: 'shapes', place: 'Лес Форм', color: '#f97316',
    intro: 'В лесу все предметы перепутали свои формы. Найди круглое, квадратное и треугольное!',
    outro: 'Отлично! Оранжевый кусочек радуги вернулся!' },
  { levelId: 'properties', place: 'Пушистые Холмы', color: '#facc15',
    intro: 'На холмах прячутся мягкие, гладкие и блестящие вещи. Поищи их!',
    outro: 'Здорово! Жёлтый кусочек радуги найден!' },
  { levelId: 'functions', place: 'Город Мастеров', color: '#22c55e',
    intro: 'Мастера потеряли свои инструменты. Помоги найти то, чем пишут, рисуют и пьют!',
    outro: 'Браво! Зелёный кусочек радуги сияет!' },
  { levelId: 'combos', place: 'Башня Загадок', color: '#3b82f6',
    intro: 'Башня загадывает загадки: «красное и круглое». Сможешь найти сразу два свойства?',
    outro: 'Умница! Синий кусочек радуги на месте!' },
  { levelId: 'counting', place: 'Остров Чисел', color: '#8b5cf6',
    intro: 'На острове всё надо посчитать. Найди пары, тройки и предметы с цифрами!',
    outro: 'Невероятно! Последний, фиолетовый кусочек найден!' },
];

export const chapterFor = (levelId: string): Chapter => CHAPTERS.find((c) => c.levelId === levelId)!;

export const allLevelsHaveChapter = (): boolean => LEVELS.every((l) => CHAPTERS.some((c) => c.levelId === l.id));
