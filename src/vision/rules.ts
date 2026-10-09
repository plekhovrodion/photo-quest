import type { LocalCheck } from '../data/tasks';

const labels = (...words: string[]): LocalCheck => ({ kind: 'labels', words });
const color = (c: import('./color').ColorName): LocalCheck => ({ kind: 'color', color: c });
const and = (...checks: LocalCheck[]): LocalCheck => ({ kind: 'and', checks });
const any: LocalCheck = { kind: 'any' };

// Слова — английские названия классов ImageNet (их возвращает MobileNet).
// MobileNet не знает форм, свойств и числа предметов, поэтому здесь грубое соответствие
// «задание → типичные предметы». Задания на счёт без подходящих классов засчитываются мягко (any).
const CIRCLE = ['ball', 'plate', 'clock', 'wheel', 'pizza', 'orange', 'saucer', 'bowl', 'balloon', 'globe', 'tire', 'disc'];
const SQUARE = ['envelope', 'pillow', 'tile', 'jigsaw', 'napkin', 'crossword', 'carton', 'crate', 'box', 'block'];
const SOFT = ['teddy', 'pillow', 'quilt', 'cardigan', 'sweater', 'sweatshirt', 'wool', 'towel', 'sleeping', 'stole', 'blanket', 'sock'];

export const LOCAL_RULES: Record<string, LocalCheck> = {
  // Формы
  'shape-circle': labels(...CIRCLE),
  'shape-square': labels(...SQUARE),
  'shape-rect': labels('laptop', 'notebook', 'monitor', 'screen', 'television', 'telephone', 'remote', 'wallet', 'binder', 'jacket', 'envelope', 'door'),
  'shape-triangle': labels('pyramid', 'tent', 'tripod', 'cone', 'sail', 'pizza'),
  'shape-oval': labels('egg', 'mirror', 'platter', 'lemon', 'rugby', 'football', 'avocado'),
  'shape-ball': labels('ball', 'orange', 'balloon', 'globe', 'bubble', 'grapefruit'),
  'shape-cube': labels('dice', 'cube', 'carton', 'crate', 'box', 'chest', 'safe', 'block'),
  'shape-cylinder': labels('bottle', 'jar', 'beaker', 'mug', 'cup', 'vase', 'barrel', 'candle', 'tin', 'lipstick', 'jug'),
  // Свойства
  'property-soft': labels(...SOFT),
  'property-hard': labels('table', 'desk', 'rock', 'stone', 'brick', 'hammer', 'helmet', 'chair', 'laptop', 'bottle', 'cup', 'plate', 'mug', 'bowl', 'pot'),
  'property-smooth': labels('plate', 'bowl', 'mug', 'cup', 'mirror', 'bottle', 'vase', 'jar', 'glass', 'laptop', 'monitor', 'pitcher', 'teapot', 'tile'),
  'property-fluffy': labels('teddy', 'sweater', 'cardigan', 'wool', 'towel', 'poodle', 'dog', 'cat', 'sheep', 'rabbit', 'hamster', 'fur', 'coat', 'blanket', 'pillow'),
  'property-shiny': labels('mirror', 'spoon', 'ladle', 'pot', 'kettle', 'teapot', 'pan', 'wok', 'watch', 'ring', 'bell', 'trophy', 'knife', 'bottle', 'chain', 'necklace', 'sunglasses', 'lamp', 'padlock', 'buckle'),
  'property-transparent': labels('glass', 'bottle', 'beaker', 'jar', 'vase', 'goblet', 'window', 'pitcher', 'jug', 'bowl', 'cup', 'goggles', 'sunglasses', 'lens'),
  'property-heavy': labels('table', 'desk', 'safe', 'refrigerator', 'stove', 'washer', 'dumbbell', 'barbell', 'anvil', 'rock', 'stone', 'chest', 'piano', 'couch', 'sofa', 'bed', 'bookcase', 'oven', 'microwave', 'cabinet'),
  'property-cold': labels('refrigerator', 'ice', 'cream', 'lolly', 'popsicle', 'freezer', 'iceberg', 'bottle'),
  // Сочетания: цвет + предмет
  'combo-red-round': and(color('red'), labels(...CIRCLE)),
  'combo-blue-square': and(color('blue'), labels(...SQUARE, 'laptop', 'notebook', 'book', 'monitor', 'screen')),
  'combo-green-soft': and(color('green'), labels(...SOFT)),
  'combo-white-cup': and(color('white'), labels('cup', 'mug', 'plate', 'bowl', 'saucer', 'coffee', 'teapot', 'dish')),
  'combo-yellow-toy': and(color('yellow'), labels('teddy', 'toy', 'ball', 'duck', 'doll', 'jigsaw', 'block', 'balloon')),
  'combo-black-round': and(color('black'), labels(...CIRCLE, 'speaker', 'record')),
  'combo-wood-brown': and(color('brown'), labels('table', 'desk', 'chair', 'pencil', 'cabinet', 'drawer', 'wardrobe', 'bookcase', 'door', 'spoon', 'bench', 'crate', 'chest', 'shelf', 'stool', 'barrel', 'box', 'frame')),
  'combo-shiny-round': labels('ball', 'plate', 'clock', 'mirror', 'bell', 'pot', 'ring', 'watch', 'wok', 'pan', 'kettle', 'lid'),
  // Счёт: точного подсчёта у MobileNet нет, поэтому где можно — по типичным предметам, иначе мягко
  'count-three-same': any,
  'count-two-colors': { kind: 'multicolor', min: 2 },
  'count-digit': labels('clock', 'calendar', 'remote', 'telephone', 'calculator', 'keyboard', 'watch', 'stopwatch', 'scale', 'speedometer'),
  'count-letter-a': labels('book', 'jacket', 'menu', 'envelope', 'notebook', 'keyboard', 'crossword', 'packet', 'carton', 'comic'),
  'count-five': any,
  'count-pair': labels('sock', 'shoe', 'sandal', 'glove', 'mitten', 'slipper', 'boot', 'loafer', 'clog'),
  'count-big-small': any,
  'count-more-than-two': labels('book', 'toy', 'teddy', 'doll', 'jigsaw', 'block'),
};
