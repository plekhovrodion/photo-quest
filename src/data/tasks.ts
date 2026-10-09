export type Category = 'color' | 'shape';

export interface Task {
  id: string;
  category: Category;
  prompt: string;
  criterion: string;
}

const color = (id: string, name: string, accusative: string): Task => ({
  id: `color-${id}`,
  category: 'color',
  prompt: `Найди что-то ${name}!`,
  criterion: `На фото виден предмет ${accusative} цвета, и этот цвет — основной цвет предмета.`,
});

const shape = (id: string, prompt: string, criterion: string): Task => ({
  id: `shape-${id}`,
  category: 'shape',
  prompt,
  criterion,
});

export const TASKS: Task[] = [
  color('red', 'красное', 'красного'),
  color('blue', 'синее', 'синего'),
  color('green', 'зелёное', 'зелёного'),
  color('yellow', 'жёлтое', 'жёлтого'),
  color('white', 'белое', 'белого'),
  color('black', 'чёрное', 'чёрного'),
  shape('circle', 'Найди что-то круглое!', 'На фото виден предмет круглой формы.'),
  shape('square', 'Найди что-то квадратное!', 'На фото виден предмет квадратной формы.'),
  shape('rect', 'Найди что-то прямоугольное!', 'На фото виден предмет прямоугольной формы.'),
  shape('triangle', 'Найди что-то треугольное!', 'На фото виден предмет треугольной формы.'),
];
