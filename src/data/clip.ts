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
  kettle: 'чайник', pot: 'кастрюля', toaster: 'тостер', knife: 'нож', 'wine glass': 'бокал',
  lamp: 'лампа', mirror: 'зеркало', 'picture frame': 'картина', 'remote control': 'пульт', guitar: 'гитара', pillow: 'подушка',
  pencil: 'карандаш', 'glue stick': 'клей', calculator: 'калькулятор', globe: 'глобус', notebook: 'тетрадь',
  soap: 'мыло', 'shampoo bottle': 'шампунь', hairbrush: 'расчёска', bathtub: 'ванна', toothpaste: 'зубная паста', 'rubber duck': 'уточка', sponge: 'губка',
  suitcase: 'чемодан', necktie: 'галстук', jacket: 'куртка', boots: 'сапоги', hat: 'шапка', gloves: 'перчатки', scarf: 'шарф', helmet: 'шлем',
  'hot dog': 'хот-дог', donut: 'пончик', strawberry: 'клубника', watermelon: 'арбуз', egg: 'яйцо', tomato: 'помидор', bread: 'хлеб', cheese: 'сыр', lemon: 'лимон',
  kite: 'воздушный змей', airplane: 'самолёт', train: 'поезд', horse: 'лошадь', sheep: 'овца',
};
