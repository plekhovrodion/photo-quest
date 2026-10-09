// Русские названия предметов для классов ImageNet, которые используются в rules.ts и tasks.ts.
// MobileNet отвечает по-английски («coffee mug»), а заврик должен сказать «Это кружка!».
// Ключи — целые слова; при нескольких совпадениях берём самый длинный ключ.
const RU: Record<string, string> = {
  'book jacket': 'книга', 'ice cream': 'мороженое', 'sleeping bag': 'спальный мешок', 'running shoe': 'кроссовок',
  'coffee mug': 'кружка', 'wooden spoon': 'деревянная ложка', 'table lamp': 'настольная лампа',
  ball: 'мяч', plate: 'тарелка', clock: 'часы', wheel: 'колесо', pizza: 'пицца', orange: 'апельсин', saucer: 'блюдце',
  bowl: 'миска', balloon: 'воздушный шарик', globe: 'глобус', tire: 'шина', disc: 'диск', envelope: 'конверт',
  pillow: 'подушка', tile: 'плитка', jigsaw: 'пазл', napkin: 'салфетка', crossword: 'кроссворд', carton: 'коробка',
  crate: 'ящик', box: 'коробка', block: 'кубик', laptop: 'ноутбук', notebook: 'ноутбук', monitor: 'монитор',
  screen: 'экран', television: 'телевизор', telephone: 'телефон', remote: 'пульт', wallet: 'кошелёк', binder: 'папка',
  jacket: 'куртка', door: 'дверь', pyramid: 'пирамида', tent: 'палатка', tripod: 'штатив', cone: 'конус', sail: 'парус',
  egg: 'яйцо', mirror: 'зеркало', platter: 'поднос', lemon: 'лимон', rugby: 'мяч для регби', football: 'мяч',
  avocado: 'авокадо', grapefruit: 'грейпфрут', bubble: 'пузырь', dice: 'кубик', cube: 'куб', chest: 'сундук',
  safe: 'сейф', bottle: 'бутылка', jar: 'банка', beaker: 'стакан', mug: 'кружка', cup: 'чашка', vase: 'ваза',
  barrel: 'бочка', candle: 'свеча', tin: 'жестяная банка', lipstick: 'помада', jug: 'кувшин', teddy: 'плюшевый мишка',
  quilt: 'одеяло', cardigan: 'кофта', sweater: 'свитер', sweatshirt: 'толстовка', wool: 'шерсть', towel: 'полотенце',
  stole: 'шарф', blanket: 'плед', sock: 'носок', table: 'стол', desk: 'письменный стол', rock: 'камень', stone: 'камень',
  brick: 'кирпич', hammer: 'молоток', helmet: 'шлем', chair: 'стул', glass: 'стакан', pitcher: 'кувшин',
  teapot: 'чайник', poodle: 'пудель', dog: 'собака', cat: 'кошка', sheep: 'овца', rabbit: 'кролик', hamster: 'хомяк',
  fur: 'мех', coat: 'пальто', spoon: 'ложка', ladle: 'половник', pot: 'кастрюля', kettle: 'чайник', pan: 'сковорода',
  wok: 'вок', watch: 'часы', ring: 'кольцо', bell: 'колокольчик', trophy: 'кубок', knife: 'нож', chain: 'цепочка',
  necklace: 'ожерелье', sunglasses: 'солнцезащитные очки', lamp: 'лампа', padlock: 'замок', buckle: 'пряжка',
  window: 'окно', goblet: 'бокал', goggles: 'очки', lens: 'линза', refrigerator: 'холодильник', stove: 'плита',
  washer: 'стиральная машина', dumbbell: 'гантеля', barbell: 'штанга', anvil: 'наковальня', piano: 'пианино',
  couch: 'диван', sofa: 'диван', bed: 'кровать', bookcase: 'книжный шкаф', oven: 'духовка', microwave: 'микроволновка',
  cabinet: 'шкаф', ice: 'лёд', lolly: 'фруктовый лёд', popsicle: 'фруктовый лёд', freezer: 'морозилка',
  iceberg: 'айсберг', pen: 'ручка', pencil: 'карандаш', ballpoint: 'шариковая ручка', biro: 'ручка', marker: 'маркер',
  fork: 'вилка', spatula: 'лопатка', shoe: 'ботинок', sandal: 'сандалия', loafer: 'туфля', clog: 'сабо', boot: 'сапог',
  slipper: 'тапочек', crib: 'детская кроватка', cradle: 'колыбель', bassinet: 'люлька', comic: 'комикс', book: 'книга',
  paintbrush: 'кисточка', brush: 'кисточка', lampshade: 'абажур', flashlight: 'фонарик', torch: 'фонарик',
  spotlight: 'прожектор', lantern: 'фонарь', calendar: 'календарь', calculator: 'калькулятор', keyboard: 'клавиатура',
  stopwatch: 'секундомер', scale: 'весы', speedometer: 'спидометр', glove: 'перчатка', mitten: 'варежка', toy: 'игрушка',
  doll: 'кукла', duck: 'утка', speaker: 'колонка', record: 'пластинка', shelf: 'полка', stool: 'табуретка',
  bench: 'скамейка', frame: 'рамка', drawer: 'комод', wardrobe: 'шкаф', menu: 'меню', packet: 'пакет',
};

const KEYS = Object.keys(RU).sort((a, b) => b.length - a.length);

// Возвращает русское название по строке класса ImageNet или null, если слова нет в словаре.
export function ruName(className: string): string | null {
  const s = className.toLowerCase();
  for (const k of KEYS) if (new RegExp(`(^|[^a-z])${k}([^a-z]|$)`).test(s)) return RU[k];
  return null;
}

export const COLOR_RU: Record<string, string> = {
  red: 'красный', orange: 'оранжевый', yellow: 'жёлтый', green: 'зелёный', blue: 'синий',
  purple: 'фиолетовый', pink: 'розовый', brown: 'коричневый', white: 'белый', black: 'чёрный', gray: 'серый',
};
