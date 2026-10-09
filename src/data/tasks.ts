export type Kind = 'color' | 'object';

// Локальная проверка без сервера: по цвету пикселей или по классам предметов (MobileNet и COCO-SSD).
export type LocalCheck =
  | { kind: 'color'; color: import('../vision/color').ColorName }
  | { kind: 'labels'; words: string[] }
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
  price: number; // сколько вспышек стоит открыть место; 0 — открыто сразу
  tasks: Task[];
}

// Доля верных заданий, нужная для открытия следующего уровня.
export const PASS_RATIO = 0.7;

const t = (kind: Kind, id: string, prompt: string, criterion: string, hint?: string, local?: LocalCheck): Task => ({
  id: `${kind}-${id}`, kind, prompt, criterion, hint, local,
});

const color = (id: string, name: string, gen: string, hint: string) =>
  t('color', id, `Найди предмет с ${name} цветом!`,
    `На фото виден предмет ${gen} цвета, и этот цвет — основной цвет предмета.`, hint,
    { kind: 'color', color: id as import('../vision/color').ColorName });

// Конкретный предмет. words — английские названия классов ImageNet (MobileNet) и COCO (детектор):
// достаточно, чтобы любая из моделей назвала один из них. Проверено по реальным спискам классов.
const thing = (id: string, accusative: string, hint: string, ...words: string[]) =>
  t('object', id, `Найди ${accusative}!`, `На фото виден предмет: ${accusative}.`, hint, { kind: 'labels', words });

export const LEVELS: Level[] = [
  {
    id: 'colors', title: 'Цвета', price: 0,
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
    id: 'kitchen', title: 'Кухня', price: 10,
    tasks: [
      thing('spoon', 'ложку', 'Она лежит рядом с тарелкой', 'spoon'),
      thing('fork', 'вилку', 'Ею накалывают еду', 'fork'),
      thing('cup', 'чашку', 'Из неё пьют чай', 'cup', 'mug'),
      thing('plate', 'тарелку', 'На неё кладут еду', 'plate'),
      thing('bowl', 'миску', 'В ней бывает суп или каша', 'bowl'),
      thing('bottle', 'бутылку', 'В ней бывает вода или сок', 'bottle'),
      thing('fridge', 'холодильник', 'В нём живёт еда и холод', 'refrigerator'),
      thing('microwave', 'микроволновку', 'В ней разогревают еду', 'microwave'),
      thing('sink', 'раковину', 'Над ней кран с водой', 'sink', 'washbasin'),
    ],
  },
  {
    id: 'room', title: 'Комната', price: 15,
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
    ],
  },
  {
    id: 'school', title: 'Школа', price: 20,
    tasks: [
      thing('pen', 'ручку', 'Ею пишут в тетради', 'pen', 'ballpoint', 'biro'),
      thing('scissors', 'ножницы', 'Ими режут бумагу', 'scissors'),
      thing('ruler', 'линейку', 'Ею проводят ровные линии', 'ruler', 'rule'),
      thing('laptop', 'ноутбук', 'Он открывается, как книга', 'laptop', 'notebook'),
      thing('phone', 'телефон', 'По нему звонят и смотрят', 'cell phone', 'telephone', 'phone'),
      thing('keyboard', 'клавиатуру', 'На ней много кнопок с буквами', 'keyboard'),
      thing('mouse', 'компьютерную мышку', 'Ею двигают стрелочку на экране', 'mouse'),
    ],
  },
  {
    id: 'hall', title: 'Прихожая', price: 25,
    tasks: [
      thing('umbrella', 'зонт', 'Он спасает от дождя', 'umbrella'),
      thing('shoe', 'обувь', 'Её надевают на улицу', 'shoe', 'sandal', 'loafer', 'clog', 'boot'),
      thing('backpack', 'рюкзак', 'С ним ходят в школу', 'backpack', 'knapsack'),
      thing('bag', 'сумку', 'В неё кладут вещи', 'handbag', 'purse', 'bag'),
      thing('skateboard', 'скейтборд', 'Он стоит на четырёх колёсиках', 'skateboard'),
    ],
  },
  {
    id: 'food', title: 'Еда', price: 30,
    tasks: [
      thing('banana', 'банан', 'Он жёлтый и в кожуре', 'banana'),
      thing('apple', 'яблоко', 'Оно растёт на дереве', 'apple', 'granny smith'),
      thing('carrot', 'морковку', 'Её любят зайцы', 'carrot'),
      thing('broccoli', 'брокколи', 'Она похожа на маленькое деревце', 'broccoli'),
      thing('pizza', 'пиццу', 'Её режут на кусочки', 'pizza'),
      thing('sandwich', 'бутерброд', 'Хлеб с чем-то вкусным', 'sandwich', 'hotdog', 'cheeseburger', 'hamburger'),
    ],
  },
  {
    id: 'outdoor', title: 'Двор', price: 35,
    tasks: [
      thing('bike', 'велосипед', 'У него два колеса и педали', 'bicycle', 'bike'),
      thing('car', 'машину', 'Она ездит по дороге', 'car', 'cab', 'jeep', 'minivan'),
      thing('bus', 'автобус', 'В нём ездят много людей', 'bus'),
      thing('truck', 'грузовик', 'Он возит тяжёлые грузы', 'truck', 'pickup'),
      thing('hydrant', 'пожарный гидрант', 'Он красный и стоит у дороги', 'fire hydrant', 'hydrant'),
      thing('dog', 'собаку', 'Она виляет хвостом', 'dog'),
      thing('cat', 'кошку', 'Она мяукает', 'cat', 'tabby'),
      thing('bird', 'птицу', 'Она умеет летать', 'bird'),
    ],
  },
];

export const TASKS: Task[] = LEVELS.flatMap((l) => l.tasks);
