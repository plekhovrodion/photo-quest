// Английские слова к заданиям: после удачной находки Соня называет предмет по-английски.
// Ключ — id задания (`color-red`, `object-spoon`). ru — слово в начальной форме для карточки.
export interface Word { en: string; ru: string }

const W = (en: string, ru: string): Word => ({ en, ru });

export const ENGLISH: Record<string, Word> = {
  'color-red': W('red', 'красный'), 'color-blue': W('blue', 'синий'), 'color-green': W('green', 'зелёный'),
  'color-yellow': W('yellow', 'жёлтый'), 'color-white': W('white', 'белый'), 'color-black': W('black', 'чёрный'),
  'color-orange': W('orange', 'оранжевый'), 'color-purple': W('purple', 'фиолетовый'), 'color-pink': W('pink', 'розовый'),
  'color-brown': W('brown', 'коричневый'),
  'object-spoon': W('spoon', 'ложка'), 'object-fork': W('fork', 'вилка'), 'object-cup': W('cup', 'чашка'),
  'object-plate': W('plate', 'тарелка'), 'object-bowl': W('bowl', 'миска'), 'object-bottle': W('bottle', 'бутылка'),
  'object-fridge': W('fridge', 'холодильник'), 'object-microwave': W('microwave', 'микроволновка'),
  'object-bed': W('bed', 'кровать'), 'object-sofa': W('sofa', 'диван'), 'object-chair': W('chair', 'стул'),
  'object-tv': W('TV', 'телевизор'), 'object-book': W('book', 'книга'), 'object-clock': W('clock', 'часы'),
  'object-plant': W('plant', 'растение'), 'object-teddy': W('teddy bear', 'плюшевый мишка'), 'object-vase': W('vase', 'ваза'),
  'object-pen': W('pen', 'ручка'), 'object-scissors': W('scissors', 'ножницы'), 'object-ruler': W('ruler', 'линейка'),
  'object-laptop': W('laptop', 'ноутбук'), 'object-phone': W('phone', 'телефон'), 'object-keyboard': W('keyboard', 'клавиатура'),
  'object-mouse': W('mouse', 'компьютерная мышка'),
  'object-sink': W('sink', 'раковина'), 'object-toothbrush': W('toothbrush', 'зубная щётка'), 'object-towel': W('towel', 'полотенце'),
  'object-toilet': W('toilet', 'унитаз'),
  'object-umbrella': W('umbrella', 'зонт'), 'object-shoe': W('shoe', 'обувь'), 'object-backpack': W('backpack', 'рюкзак'),
  'object-bag': W('bag', 'сумка'), 'object-skateboard': W('skateboard', 'скейтборд'),
  'object-banana': W('banana', 'банан'), 'object-apple': W('apple', 'яблоко'), 'object-orange': W('orange', 'апельсин'),
  'object-carrot': W('carrot', 'морковка'), 'object-broccoli': W('broccoli', 'брокколи'), 'object-pizza': W('pizza', 'пицца'),
  'object-sandwich': W('sandwich', 'бутерброд'), 'object-cake': W('cake', 'торт'),
  'object-bike': W('bike', 'велосипед'), 'object-car': W('car', 'машина'), 'object-bus': W('bus', 'автобус'),
  'object-bench': W('bench', 'скамейка'), 'object-dog': W('dog', 'собака'), 'object-cat': W('cat', 'кошка'),
  'object-bird': W('bird', 'птица'), 'object-butterfly': W('butterfly', 'бабочка'), 'object-flower': W('flower', 'цветок'),
  'object-mushroom': W('mushroom', 'гриб'),
};

export const englishFor = (taskId: string): Word | undefined => ENGLISH[taskId];
