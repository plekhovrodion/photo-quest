// Фоны (SVG из папки «Заврики»): у главной и у каждой категории свой.
export interface Background {
  file: string;
  pos: string; // какую часть широкой картинки показывать на вертикальном экране телефона
  filter?: string; // сдвиг оттенка, когда один рисунок используется для двух категорий
}

export const BACKGROUNDS: Record<string, Background> = {
  menu: { file: 'bg-menu.svg', pos: '30% bottom' },
  colors: { file: 'bg-colors.svg', pos: '22% bottom' },
  kitchen: { file: 'bg-functions.svg', pos: '62% bottom' },
  room: { file: 'bg-properties.svg', pos: '36% bottom' },
  school: { file: 'bg-shapes.svg', pos: '12% bottom' },
  bath: { file: 'bg-colors.svg', pos: '78% bottom', filter: 'hue-rotate(55deg) saturate(1.1)' },
  hall: { file: 'bg-shapes.svg', pos: '88% bottom', filter: 'hue-rotate(-45deg) saturate(1.1)' },
  food: { file: 'bg-functions.svg', pos: '30% bottom', filter: 'hue-rotate(70deg) saturate(1.1)' },
  outdoor: { file: 'bg-properties.svg', pos: '70% bottom', filter: 'hue-rotate(-60deg) saturate(1.1)' },
};

export const backgroundFor = (levelId: string | null | undefined): Background =>
  BACKGROUNDS[levelId ?? 'menu'] ?? BACKGROUNDS.menu;
