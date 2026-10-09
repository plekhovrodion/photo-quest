// Предметы, которые CLIP различает между собой: английское название для описания «a photo of a …» и русское для реплики заврика.
// Список замерялся целиком (58 вариантов), поэтому лишние предметы остаются как «отвлекающие» варианты.
export const CLIP_OBJECTS: Record<string, string> = {
  spoon: 'ложка', fork: 'вилка', cup: 'чашка', plate: 'тарелка', bowl: 'миска', bottle: 'бутылка',
  refrigerator: 'холодильник', 'frying pan': 'сковорода', 'microwave oven': 'микроволновка', sink: 'раковина',
  bed: 'кровать', sofa: 'диван', chair: 'стул', television: 'телевизор', book: 'книга', 'wall clock': 'часы',
  'potted plant': 'комнатное растение', 'teddy bear': 'плюшевый мишка', vase: 'ваза', pen: 'ручка',
  scissors: 'ножницы', ruler: 'линейка', laptop: 'ноутбук', 'mobile phone': 'телефон',
  'computer keyboard': 'клавиатура', 'computer mouse': 'компьютерная мышка', umbrella: 'зонт', shoe: 'обувь',
  backpack: 'рюкзак', handbag: 'сумка', skateboard: 'скейтборд', banana: 'банан', apple: 'яблоко',
  carrot: 'морковка', broccoli: 'брокколи', pizza: 'пицца', sandwich: 'бутерброд', bicycle: 'велосипед',
  car: 'машина', bus: 'автобус', truck: 'грузовик', 'fire hydrant': 'пожарный гидрант', dog: 'собака',
  cat: 'кошка', bird: 'птица', towel: 'полотенце', sock: 'носок', bench: 'скамейка', flower: 'цветок',
  mushroom: 'гриб', eraser: 'ластик', toothbrush: 'зубная щётка', butterfly: 'бабочка', cake: 'торт',
  'orange fruit': 'апельсин', ball: 'мяч', 'pencil case': 'пенал', 'hair dryer': 'фен', toilet: 'унитаз',
};

export const clipPrompt = (en: string) => `a photo of a ${en}.`;
