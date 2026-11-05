export type Kind = 'color' | 'object';

// Локальная проверка без сервера: по цвету пикселей или по классам предметов (COCO-SSD) и CLIP.
export type LocalCheck =
  | { kind: 'color'; color: import('../vision/color').ColorName }
  | { kind: 'labels'; words: string[]; clip?: string } // clip — название предмета для CLIP (src/data/clip.ts)
  | { kind: 'and'; checks: LocalCheck[] }
  | { kind: 'any' } // мягкая проверка: на фото есть узнаваемый предмет
  | { kind: 'multicolor'; min: number }; // не меньше min разных цветов

export interface Task {
  id: string;
  kind: Kind;
  prompt: string;
  criterion: string;
  hint?: string;
  local?: LocalCheck;
}

export interface Level {
  id: string;
  title: string;
  tasks: Task[];
}

const t = (kind: Kind, id: string, prompt: string, criterion: string, hint?: string, local?: LocalCheck): Task => ({
  id: `${kind}-${id}`, kind, prompt, criterion, hint, local,
});

const color = (id: string, name: string, gen: string, hint: string) =>
  t('color', id, `Найди предмет с ${name} цветом`,
    `На фото виден предмет ${gen} цвета, и этот цвет — основной цвет предмета.`, hint,
    { kind: 'color', color: id as import('../vision/color').ColorName });

// Конкретный предмет. words — английские названия классов COCO (детектор): достаточно, чтобы он назвал один из них.
// Предметы вне COCO проверяет CLIP (clip). Старые названия ImageNet в списках безвредны: детектор их не выдаёт.
const thing = (id: string, accusative: string, hint: string, ...words: string[]) =>
  t('object', id, `Найди ${accusative}`, `На фото виден предмет: ${accusative}.`, hint, { kind: 'labels', words, clip: CLIP_OF[id] });

// Название предмета для CLIP по id задания.
const CLIP_OF: Record<string, string> = {
  spoon: 'spoon', cup: 'cup', plate: 'plate', bowl: 'bowl', bottle: 'bottle', fridge: 'refrigerator',
  microwave: 'microwave oven', sink: 'sink', bed: 'bed', sofa: 'sofa', chair: 'chair', tv: 'television', book: 'book',
  clock: 'wall clock', plant: 'potted plant', teddy: 'teddy bear', vase: 'vase', pen: 'pen', scissors: 'scissors',
  ruler: 'ruler', laptop: 'laptop', phone: 'mobile phone', keyboard: 'computer keyboard', mouse: 'computer mouse',
  umbrella: 'umbrella', shoe: 'shoe', backpack: 'backpack', bag: 'handbag', skateboard: 'skateboard', banana: 'banana',
  apple: 'apple', orange: 'orange fruit', carrot: 'carrot', broccoli: 'broccoli', pizza: 'pizza', sandwich: 'sandwich',
  cake: 'cake', bike: 'bicycle', car: 'car', bus: 'bus', bench: 'bench', dog: 'dog', cat: 'cat', bird: 'bird',
  butterfly: 'butterfly', flower: 'flower', mushroom: 'mushroom', toothbrush: 'toothbrush', toilet: 'toilet', towel: 'towel',
  kite: 'kite', airplane: 'airplane', train: 'train', horse: 'horse', sheep: 'sheep',
  fork: 'fork', kettle: 'kettle', toaster: 'toaster', pan: 'frying pan', pot: 'pot', wineglass: 'wine glass', guitar: 'guitar', globe: 'globe',
  frame: 'picture frame', calculator: 'calculator', eraser: 'eraser', pencilcase: 'pencil case', glue: 'glue stick',
  pencil: 'pencil', shampoo: 'shampoo bottle', hairbrush: 'hairbrush', soap: 'soap', toothpaste: 'toothpaste',
  duck: 'rubber duck', bathtub: 'bathtub', boots: 'boots', helmet: 'helmet', gloves: 'gloves', scarf: 'scarf',
  jacket: 'jacket', tie: 'necktie', egg: 'egg', cheese: 'cheese', tomato: 'tomato',
};

const ALL_LEVELS: Level[] = [
  {
    id: 'colors', title: 'Цвета',
    tasks: [
      color('red', 'красным', 'красного', 'Посмотри на помидор или яблоко'),
      color('blue', 'синим', 'синего', 'Может быть, это что-то из одежды?'),
      color('green', 'зелёным', 'зелёного', 'Как трава или листики'),
      color('yellow', 'жёлтым', 'жёлтого', 'Как солнышко или банан'),
      color('white', 'белым', 'белого', 'Как снег или молоко'),
      color('black', 'чёрным', 'чёрного', 'Как ночь'),
      color('orange', 'оранжевым', 'оранжевого', 'Как апельсин'),
      color('purple', 'фиолетовым', 'фиолетового', 'Как слива или виноград'),
      color('pink', 'розовым', 'розового', 'Как зефир'),
      color('brown', 'коричневым', 'коричневого', 'Как шоколад или дерево'),
    ],
  },
  {
    id: 'kitchen', title: 'Кухня',
    tasks: [
      thing('spoon', 'ложку', 'Она лежит рядом с тарелкой', 'spoon'),
      thing('cup', 'чашку', 'Из неё пьют чай', 'cup', 'mug'),
      thing('plate', 'тарелку', 'На неё кладут еду', 'plate'),
      thing('bowl', 'миску', 'В ней бывает суп или каша', 'bowl'),
      thing('bottle', 'бутылку', 'В ней бывает вода или сок', 'bottle'),
      thing('fridge', 'холодильник', 'В нём живёт еда и холод', 'refrigerator'),
      thing('microwave', 'микроволновку', 'В ней разогревают еду', 'microwave'),
      thing('kettle', 'чайник', 'В нём кипятят воду для чая', 'kettle', 'teapot'),
      thing('toaster', 'тостер', 'В нём поджаривают хлеб', 'toaster'),
      thing('pan', 'сковородку', 'На ней жарят блины и яичницу', 'frying pan', 'skillet', 'wok'),
      thing('pot', 'кастрюлю', 'В ней варят суп', 'pot', 'saucepan', 'cooking'),
      thing('wineglass', 'бокал', 'Он на тонкой ножке', 'wine glass', 'goblet'),
      thing('fork', 'вилку', 'Ею накалывают еду', 'fork'),
    ],
  },
  {
    id: 'room', title: 'Комната',
    tasks: [
      thing('bed', 'кровать', 'На ней спят ночью', 'bed'),
      thing('sofa', 'диван', 'На нём сидят и смотрят мультики', 'couch'),
      thing('chair', 'стул', 'На нём сидят за столом', 'chair'),
      thing('tv', 'телевизор', 'В нём показывают мультики', 'television', 'tv', 'monitor'),
      thing('book', 'книгу', 'В ней страницы с буквами', 'book'),
      thing('clock', 'часы', 'Они показывают время', 'clock', 'watch'),
      thing('plant', 'комнатное растение', 'Оно растёт в горшке', 'potted plant', 'flowerpot'),
      thing('teddy', 'плюшевого мишку', 'Он мягкий, с ним спят', 'teddy'),
      thing('vase', 'вазу', 'В неё ставят цветы', 'vase'),
      thing('guitar', 'гитару', 'У неё шесть струн', 'guitar'),
      thing('globe', 'глобус', 'Это маленькая модель Земли', 'globe'),
      thing('frame', 'картину', 'Она висит на стене в рамке', 'picture frame', 'frame'),
    ],
  },
  {
    id: 'school', title: 'Школа',
    tasks: [
      thing('pen', 'ручку', 'Ею пишут в тетради', 'pen', 'ballpoint', 'biro'),
      thing('scissors', 'ножницы', 'Ими режут бумагу', 'scissors'),
      thing('ruler', 'линейку', 'Ею проводят ровные линии', 'ruler', 'rule'),
      thing('laptop', 'ноутбук', 'Он открывается, как книга', 'laptop', 'notebook'),
      thing('phone', 'телефон', 'По нему звонят и смотрят', 'cell phone', 'telephone', 'phone'),
      thing('keyboard', 'клавиатуру', 'На ней много кнопок с буквами', 'keyboard'),
      thing('mouse', 'компьютерную мышку', 'Ею двигают стрелочку на экране', 'mouse'),
      thing('calculator', 'калькулятор', 'Он умеет считать', 'calculator'),
      thing('eraser', 'ластик', 'Им стирают карандаш', 'eraser', 'rubber'),
      thing('pencilcase', 'пенал', 'В нём лежат ручки и карандаши', 'pencil case', 'pencil box'),
      thing('glue', 'клей', 'Им склеивают бумагу', 'glue'),
      thing('pencil', 'карандаш', 'Им рисуют и пишут', 'pencil'),
    ],
  },
  {
    id: 'bath', title: 'Ванная',
    tasks: [
      thing('sink', 'раковину', 'Над ней кран с водой', 'sink', 'washbasin'),
      thing('toothbrush', 'зубную щётку', 'Ею чистят зубы', 'toothbrush'),
      thing('towel', 'полотенце', 'Им вытираются после душа', 'towel'),
      thing('toilet', 'унитаз', 'Он стоит в туалете', 'toilet'),
      thing('shampoo', 'шампунь', 'Им моют волосы', 'shampoo', 'lotion'),
      thing('hairbrush', 'расчёску', 'Ею причёсывают волосы', 'hairbrush', 'comb', 'brush'),
      thing('soap', 'мыло', 'Оно пенится, когда моешь руки', 'soap', 'soap dispenser'),
      thing('toothpaste', 'зубную пасту', 'Её выдавливают на щётку', 'toothpaste'),
      thing('duck', 'уточку', 'Она плавает в ванне', 'rubber duck', 'duck'),
      thing('bathtub', 'ванну', 'В ней купаются', 'bathtub', 'tub'),
    ],
  },
  {
    id: 'hall', title: 'Прихожая',
    tasks: [
      thing('umbrella', 'зонт', 'Он спасает от дождя', 'umbrella'),
      thing('shoe', 'обувь', 'Её надевают на улицу', 'shoe', 'sandal', 'loafer', 'clog', 'boot'),
      thing('backpack', 'рюкзак', 'С ним ходят в школу', 'backpack', 'knapsack'),
      thing('bag', 'сумку', 'В неё кладут вещи', 'handbag', 'purse', 'bag'),
      thing('skateboard', 'скейтборд', 'Он стоит на четырёх колёсиках', 'skateboard'),
      thing('boots', 'сапоги', 'Их надевают в лужи и слякоть', 'boot', 'gumboot'),
      thing('helmet', 'шлем', 'Он защищает голову', 'helmet', 'crash helmet'),
      thing('gloves', 'перчатки', 'Их надевают на руки в мороз', 'glove', 'mitten'),
      thing('scarf', 'шарф', 'Он согревает шею', 'scarf', 'stole'),
      thing('jacket', 'куртку', 'Её надевают на улицу', 'jacket', 'coat'),
      thing('tie', 'галстук', 'Его носят на шее с рубашкой', 'tie', 'necktie'),
    ],
  },
  {
    id: 'food', title: 'Еда',
    tasks: [
      thing('banana', 'банан', 'Он жёлтый и в кожуре', 'banana'),
      thing('apple', 'яблоко', 'Оно растёт на дереве', 'apple', 'granny smith'),
      thing('orange', 'апельсин', 'Он круглый и оранжевый', 'orange'),
      thing('carrot', 'морковку', 'Её любят зайцы', 'carrot'),
      thing('broccoli', 'брокколи', 'Она похожа на маленькое деревце', 'broccoli'),
      thing('pizza', 'пиццу', 'Её режут на кусочки', 'pizza'),
      thing('sandwich', 'бутерброд', 'Хлеб с чем-то вкусным', 'sandwich', 'hotdog', 'cheeseburger', 'hamburger'),
      thing('cake', 'торт', 'Его едят на день рождения', 'cake'),
      thing('egg', 'яйцо', 'Из него вылупляются цыплята', 'egg'),
      thing('cheese', 'сыр', 'Он жёлтый и с дырками', 'cheese'),
      thing('tomato', 'помидор', 'Он красный и круглый', 'tomato'),
    ],
  },
  {
    id: 'outdoor', title: 'Двор и лес',
    tasks: [
      thing('bike', 'велосипед', 'У него два колеса и педали', 'bicycle', 'bike'),
      thing('car', 'машину', 'Она ездит по дороге', 'car', 'cab', 'jeep', 'minivan'),
      thing('bus', 'автобус', 'В нём ездят много людей', 'bus'),
      thing('bench', 'скамейку', 'На ней отдыхают в парке', 'bench'),
      thing('dog', 'собаку', 'Она виляет хвостом', 'dog'),
      thing('cat', 'кошку', 'Она мяукает', 'cat', 'tabby'),
      thing('bird', 'птицу', 'Она умеет летать', 'bird'),
      thing('butterfly', 'бабочку', 'У неё яркие крылья', 'butterfly'),
      thing('flower', 'цветок', 'Он красиво пахнет', 'daisy', 'sunflower', 'flower'),
      thing('mushroom', 'гриб', 'Он растёт в лесу, трогать его нельзя', 'mushroom', 'agaric', 'bolete'),
      thing('kite', 'воздушного змея', 'Он летает на длинной верёвочке', 'kite'),
      thing('airplane', 'самолёт', 'Он летит высоко в небе', 'airplane'),
      thing('train', 'поезд', 'Он едет по рельсам', 'train'),
      thing('horse', 'лошадь', 'Она скачет и говорит «иго-го»', 'horse'),
      thing('sheep', 'овцу', 'У неё мягкая шерсть', 'sheep'),
    ],
  },
];

// Задания, отключённые по замеру распознавания (docs/detection-eval.md): на 8 размеченных фото предмет узнавался реже чем в 85% случаев
// или его принимали за соседний. Чтобы вернуть задание, уберите его id отсюда: иконка и озвучка остались.
const DISABLED = new Set([
  'horse', 'sheep', // улица: лошадь и овца скрыты по просьбе
  'spoon', 'cup', 'bowl', // кухня: ложка 63%, чашка 75%, миска 63% (и путается с тарелкой)
  'sofa', 'book', // комната: диван 38%, книга 75%
  'pen', 'ruler', // школа: тонкие предметы, уверенность CLIP низкая, друг с другом путаются
  'bag', // прихожая: сумка 63% (путается с рюкзаком)
  'carrot', // еда: 75%
  'butterfly', // двор: 80%
  // замер на LVIS (docs/detection-eval-lvis.md): крупный предмет узнаётся реже 80%
  'jacket', 'scarf', // прихожая: куртка 46%, шарф 50%
  'towel', 'frame', 'flower', // ванная 50%, картина 21%, цветок 48%
  'plate', 'pot', // кухня: тарелка 71% (и 12% ложных), кастрюля 70%
  'chair', 'bench', // стул 71%, скамейка 76%
  'pencil', // школа: карандаш 0% на мелких кадрах
  'fork', // кухня: убрана по просьбе, пока вообще
  'wineglass', // кухня: бокал убран по просьбе
  'helmet', 'boots', // прихожая: шлем и сапоги скрыты по просьбе
].map((id) => `object-${id}`));

export const LEVELS: Level[] = ALL_LEVELS.map((l) => ({ ...l, tasks: l.tasks.filter((t) => !DISABLED.has(t.id)) }));

// Номер иконки задания в спрайте места: по порядку заданий в макете (в «Кухне» между ложкой и чашкой лежит удалённая вилка).
export const ICON_INDEX: Record<string, number> = Object.fromEntries(
  ALL_LEVELS.flatMap((l) => {
    const ids = l.tasks.map((t) => t.id);
    if (l.id === 'kitchen') ids.splice(1, 0, 'object-fork');
    return ids.map((id, i) => [id, i] as const);
  }),
);

// Иконки заданий, добавленных после первой раскладки спрайта: номер ячейки с начала спрайта (по рядам, 8 в ряду).
export const ICON_ABS: Record<string, number> = {
  'object-kite': 62, 'object-airplane': 63, 'object-train': 64, 'object-horse': 65, 'object-sheep': 66,
  'object-fork': 1, 'object-kettle': 67, 'object-toaster': 68, 'object-pan': 69, 'object-pot': 70, 'object-wineglass': 71, 'object-guitar': 72, 'object-globe': 73, 'object-frame': 74, 'object-calculator': 75, 'object-eraser': 76, 'object-pencilcase': 77, 'object-glue': 78, 'object-pencil': 79, 'object-shampoo': 80, 'object-hairbrush': 81, 'object-soap': 82, 'object-toothpaste': 83, 'object-duck': 84, 'object-bathtub': 85, 'object-boots': 86, 'object-helmet': 87, 'object-gloves': 88, 'object-scarf': 89, 'object-jacket': 90, 'object-tie': 91, 'object-egg': 92, 'object-cheese': 93, 'object-tomato': 94, 'object-backpack': 95,
};

export const TASKS: Task[] = LEVELS.flatMap((l) => l.tasks);
