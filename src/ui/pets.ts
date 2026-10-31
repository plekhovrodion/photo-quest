// Комнаты из Figma («Комнаты петов») и живые питомцы в них: Lottie-анимации ожидания (idle) сменяют друг друга,
// чтобы зверь моргал и дышал, а не повторял один цикл. Комнату подставляем туда, где она подходит месту по смыслу;
// у остальных мест остаётся прежняя картинка. Анимации лежат в public/anim/<питомец>/idle-<N>.json.
import lottie, { type AnimationItem } from 'lottie-web/build/player/lottie_light';

type PetName = 'capybara' | 'chick' | 'cat' | 'dog' | 'fox' | 'rabbit' | 'pony' | 'bear';

// Какая комната у какого места и кто в ней живёт (кота в архиве анимаций пока нет: комната без питомца)
const ROOMS: Record<string, { pet?: PetName }> = {
  kitchen: { pet: 'capybara' },
  room: { pet: 'cat' },
  school: { pet: 'chick' },
  bath: { pet: 'dog' },
  outdoor: { pet: 'fox' },
  food: { pet: 'rabbit' },
  hall: { pet: 'pony' },
  colors: { pet: 'bear' },
};
// Сколько вариантов idle у питомца (файлы idle-1 … idle-N)
const IDLES: Partial<Record<PetName, number>> = { capybara: 4, chick: 4, dog: 3, fox: 4, rabbit: 2, pony: 4, bear: 4, cat: 4 };
// Где стоит питомец в комнате (в процентах от комнаты): центр по горизонтали, низ по вертикали, ширина холста анимации
const PLACE: Record<PetName, { x: number; bottom: number; w: number }> = {
  capybara: { x: 49.4, bottom: 0.8, w: 47.4 },
  chick: { x: 49.8, bottom: -1.3, w: 45.1 },
  cat: { x: 47.1, bottom: -0.2, w: 46.3 },
  dog: { x: 50.1, bottom: 19.8, w: 27.2 },
  fox: { x: 48.8, bottom: 2.5, w: 41.5 },
  rabbit: { x: 48.6, bottom: -10.7, w: 54.3 },
  pony: { x: 49.9, bottom: -1.0, w: 53.9 },
  bear: { x: 46.6, bottom: -0.1, w: 45.3 },
};

const BASE = () => import.meta.env.BASE_URL;
export const hasRoom = (locId: string) => locId in ROOMS;

// Разметка комнаты: картинка во всю коробку 368:200 плюс место под питомца
export type Mood = 'happy' | 'sad' | 'happy-loop' | 'sad-loop'; // happy-loop: радость по кругу (экран «Все найдено»)
export function roomHtml(locId: string, withPet = true, set = '', mood?: Mood): string {
  const r = ROOMS[locId];
  if (!r) return '';
  const pet = withPet && r.pet && IDLES[r.pet] ? r.pet : undefined;
  const p = pet ? PLACE[pet] : undefined;
  return `<span class="room-box"><img class="room-img" src="${BASE()}art/rooms/${set}${locId}${pet ? '-bare' : ''}.svg" alt="">${
    pet && p ? `<span class="pet" data-pet="${pet}"${mood ? ` data-mood="${mood}"` : ''} style="--px:${p.x}%;--pb:${p.bottom}%;--pw:${p.w}%" aria-hidden="true"></span>` : ''}</span>`;
}

interface Live { anims: AnimationItem[]; boxes: HTMLElement[]; cur: number; dead: boolean }
const live: Live[] = [];
const json = new Map<string, Promise<object>>();
const load = (pet: PetName, i: number | Mood) => {
  if (i === 'happy-loop') i = 'happy';
  if (i === 'sad-loop') i = 'sad';
  const key = `${pet}-${i}`;
  let p = json.get(key);
  if (!p) { p = fetch(`${BASE()}anim/${pet}/${typeof i === 'number' ? `idle-${i}` : i}.json`).then((r) => r.json()); json.set(key, p); }
  return p;
};

async function mount(el: HTMLElement) {
  const pet = el.dataset.pet as PetName;
  const n = IDLES[pet];
  if (!n) return;
  const st: Live = { anims: [], boxes: [], cur: -1, dead: false };
  live.push(st);
  const mood = el.dataset.mood as Mood | undefined; // реакция на ответ: один раз, потом снова ожидание
  let data: object[];
  let emo: object | null = null;
  try {
    [data, emo] = await Promise.all([Promise.all(Array.from({ length: n }, (_, i) => load(pet, i + 1))), mood ? load(pet, mood).catch(() => null) : Promise.resolve(null)]);
  } catch { return; }
  if (st.dead || !el.isConnected) return;
  data.forEach((animationData) => {
    const box = document.createElement('span');
    box.className = 'pet-anim';
    el.appendChild(box);
    st.boxes.push(box);
    st.anims.push(lottie.loadAnimation({ container: box, renderer: 'svg', loop: false, autoplay: false, animationData }));
  });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const show = (i: number) => {
    st.cur = i;
    st.boxes.forEach((b, k) => { b.style.visibility = k === i ? 'visible' : 'hidden'; });
    if (reduce) st.anims[i].goToAndStop(0, true); else st.anims[i].goToAndPlay(0, true);
  };
  // Следующий вариант: чаще другой, иногда тот же ещё раз (дыхание), так оживает без заметного шва
  const next = () => {
    if (st.dead) return;
    const again = Math.random() < 0.3;
    let i = st.cur;
    if (!again || st.cur < 0) while (i === st.cur) i = Math.floor(Math.random() * n);
    show(i);
  };
  st.anims.forEach((a) => a.addEventListener('complete', () => { if (!reduce) next(); }));
  if (emo) {
    const box = document.createElement('span');
    box.className = 'pet-anim';
    el.appendChild(box);
    const loopEmo = (mood === 'happy-loop' || mood === 'sad-loop') && !reduce;
    const a = lottie.loadAnimation({ container: box, renderer: 'svg', loop: loopEmo, autoplay: false, animationData: emo });
    st.boxes.push(box);
    st.anims.push(a);
    const i = st.anims.length - 1;
    // реакция не входит в круг ожидания: после неё запускаем обычный idle
    st.boxes.forEach((b, k) => { b.style.visibility = k === i ? 'visible' : 'hidden'; });
    st.cur = i;
    if (reduce) { a.goToAndStop(0, true); return; }
    if (!loopEmo) a.addEventListener('complete', () => { if (!st.dead) { st.cur = -1; next(); } });
    a.goToAndPlay(0, true);
    return;
  }
  next();
}

// Питомцы грузят свои анимации, только когда попадают в экран (на главной их восемь, а видно два-три): меньше трафика и работы на телефоне.
let observer: IntersectionObserver | null = null;
export function mountPets(scope: ParentNode) {
  const els = scope.querySelectorAll<HTMLElement>('.pet[data-pet]');
  if (!('IntersectionObserver' in window)) { els.forEach((el) => { void mount(el); }); return; }
  observer ??= new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      observer?.unobserve(e.target);
      void mount(e.target as HTMLElement);
    }
  }, { rootMargin: '200px' });
  els.forEach((el) => observer!.observe(el));
}

export function unmountPets() {
  observer?.disconnect();
  observer = null;
  for (const st of live.splice(0)) {
    st.dead = true;
    st.anims.forEach((a) => a.destroy());
  }
}

// Вкладка скрыта: анимации стоят
document.addEventListener('visibilitychange', () => {
  for (const st of live) {
    const a = st.anims[st.cur];
    if (!a) continue;
    if (document.hidden) a.pause(); else a.play();
  }
});
