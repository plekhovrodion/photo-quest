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
export function roomHtml(locId: string, withPet = true, set = '', mood?: Mood, useBareArt = false, staticPet = false): string {
  const r = ROOMS[locId];
  if (!r) return '';
  const pet = withPet && r.pet && IDLES[r.pet] ? r.pet : undefined;
  const p = pet ? PLACE[pet] : undefined;
  return `<span class="room-box"><img class="room-img" src="${BASE()}art/rooms/${set}${locId}${pet || useBareArt ? '-bare' : ''}.svg" alt="">${
    pet && p ? staticPet
      ? `<span class="pet" style="--px:${p.x}%;--pb:${p.bottom}%;--pw:${p.w}%" aria-hidden="true"><img class="pet-static" src="${BASE()}art/pets/${pet}-${mood?.startsWith('happy') ? 'happy' : 'sad'}.svg" alt=""></span>`
      : `<span class="pet" data-pet="${pet}"${mood ? ` data-mood="${mood}"` : ''} style="--px:${p.x}%;--pb:${p.bottom}%;--pw:${p.w}%" aria-hidden="true"></span>` : ''}</span>`;
}

interface Live { el: HTMLElement; anims: AnimationItem[]; boxes: HTMLElement[]; cur: number; visible: boolean; dead: boolean }
const live: Live[] = [];
const json = new Map<string, Promise<object>>();
const load = (pet: PetName, i: number | Mood) => {
  if (i === 'happy-loop') i = 'happy';
  if (i === 'sad-loop') i = 'sad';
  const key = `${pet}-${i}`;
  let p = json.get(key);
  if (!p) {
    p = fetch(`${BASE()}anim/${pet}/${typeof i === 'number' ? `idle-${i}` : i}.json`)
      .then((r) => { if (!r.ok) throw new Error(`pet animation ${r.status}`); return r.json(); });
    json.set(key, p);
    void p.catch(() => { if (json.get(key) === p) json.delete(key); });
  }
  return p;
};

function markPetAssetsReady(el: HTMLElement) {
  if (el.classList.contains('pet-assets-ready')) return;
  el.classList.add('pet-assets-ready');
  el.dispatchEvent(new Event('pet-assets-ready', { bubbles: true }));
}

function showStaticPet(el: HTMLElement, pet: PetName, mood?: Mood) {
  if (!el.isConnected || el.querySelector('.pet-static')) { markPetAssetsReady(el); return; }
  const img = document.createElement('img');
  img.className = 'pet-static';
  img.alt = '';
  img.addEventListener('load', () => markPetAssetsReady(el), { once: true });
  img.addEventListener('error', () => markPetAssetsReady(el), { once: true });
  img.src = `${BASE()}art/pets/${pet}-${mood?.startsWith('sad') ? 'sad' : 'happy'}.svg`;
  el.appendChild(img);
  if (img.complete) markPetAssetsReady(el);
}

// Не больше двух питомцев одновременно создают свои анимации (разбор Lottie тяжёлый для слабого телефона).
let busy = 0;
const waiters: (() => void)[] = [];
const slot = async () => {
  if (busy >= 2) await new Promise<void>((ok) => waiters.push(ok));
  busy++;
  setTimeout(() => { busy--; waiters.shift()?.(); }, 120);
};

async function mount(el: HTMLElement) {
  const pet = el.dataset.pet as PetName;
  const n = IDLES[pet];
  if (!n) return;
  const st: Live = { el, anims: [], boxes: [], cur: -1, visible: true, dead: false };
  live.push(st);
  const mood = el.dataset.mood as Mood | undefined; // реакция на ответ: один раз, потом снова ожидание
  // Не оставляем скелетон навсегда, если загрузчик анимации не прислал DOMLoaded/data_failed.
  const readyTimeout = setTimeout(() => {
    if (!st.dead && el.isConnected && !el.classList.contains('pet-assets-ready')) showStaticPet(el, pet, mood);
  }, 4_000);
  el.addEventListener('pet-assets-ready', () => clearTimeout(readyTimeout), { once: true });
  let idleData: object | null;
  let emo: object | null = null;
  const loopMood = mood === 'happy-loop' || mood === 'sad-loop'; // зацикленная реакция сама крутится, idle-анимация ей не нужна
  try {
    const idle = loopMood ? Promise.resolve(null) : load(pet, 1 + Math.floor(Math.random() * n));
    [idleData, emo] = await Promise.all([idle, mood ? load(pet, mood).catch(() => null) : Promise.resolve(null)]);
  } catch {
    // Если Lottie не загрузилась из-за краткого обрыва сети, показываем питомца
    // статичной картинкой.
    if (!st.dead) showStaticPet(el, pet, mood);
    return;
  }
  if (st.dead || !el.isConnected) return;
  await slot(); // ограничиваем одновременную инициализацию SVG-анимаций на телефоне
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const show = (i: number) => {
    st.cur = i;
    st.boxes.forEach((b, k) => { b.style.visibility = k === i ? 'visible' : 'hidden'; });
    if (reduce) st.anims[i].goToAndStop(0, true);
    else if (st.visible && !document.hidden) st.anims[i].goToAndPlay(0, true);
    else st.anims[i].pause();
  };
  if (idleData) {
    const box = document.createElement('span');
    box.className = 'pet-anim';
    el.appendChild(box);
    st.boxes.push(box);
    let animation: AnimationItem;
    try { animation = lottie.loadAnimation({ container: box, renderer: 'svg', loop: true, autoplay: false, animationData: idleData }); }
    catch { box.remove(); showStaticPet(el, pet, mood); return; }
    animation.addEventListener('DOMLoaded', () => markPetAssetsReady(el));
    animation.addEventListener('data_failed', () => showStaticPet(el, pet, mood));
    st.anims.push(animation);
  }
  const idleIndex = st.anims.length ? 0 : -1;
  if (idleIndex >= 0 && !emo) { show(idleIndex); return; }
  if (emo) {
    const box = document.createElement('span');
    box.className = 'pet-anim';
    el.appendChild(box);
    const loopEmo = (mood === 'happy-loop' || mood === 'sad-loop') && !reduce;
    let a: AnimationItem;
    try { a = lottie.loadAnimation({ container: box, renderer: 'svg', loop: loopEmo, autoplay: false, animationData: emo }); }
    catch { box.remove(); if (idleIndex >= 0) { show(idleIndex); } else showStaticPet(el, pet, mood); return; }
    a.addEventListener('DOMLoaded', () => markPetAssetsReady(el));
    a.addEventListener('data_failed', () => { if (idleIndex >= 0) show(idleIndex); else showStaticPet(el, pet, mood); });
    st.boxes.push(box);
    st.anims.push(a);
    const i = st.anims.length - 1;
    // После короткой реакции показываем одну зацикленную idle-анимацию.
    st.boxes.forEach((b, k) => { b.style.visibility = k === i ? 'visible' : 'hidden'; });
    st.cur = i;
    if (reduce) { a.goToAndStop(0, true); return; }
    if (!loopEmo) a.addEventListener('complete', () => { if (!st.dead && idleIndex >= 0) show(idleIndex); });
    if (st.visible && !document.hidden) a.goToAndPlay(0, true); else a.pause();
    return;
  }
  if (idleIndex < 0) showStaticPet(el, pet, mood);
}

// Питомцы грузят свои анимации, только когда попадают в экран (на главной их восемь, а видно два-три): меньше трафика и работы на телефоне.
let observer: IntersectionObserver | null = null;
export function mountPets(scope: ParentNode) {
  const els = scope.querySelectorAll<HTMLElement>('.pet[data-pet]');
  if (!('IntersectionObserver' in window)) { els.forEach((el) => { void mount(el); }); return; }
  observer ??= new IntersectionObserver((entries) => {
    for (const e of entries) {
      const el = e.target as HTMLElement;
      const st = live.find((item) => item.el === el);
      if (!st) {
        if (e.isIntersecting && !live.some((item) => item.el === el)) void mount(el);
        continue;
      }
      st.visible = e.isIntersecting;
      if (!e.isIntersecting || document.hidden) st.anims.forEach((a) => a.pause());
      else st.anims[st.cur]?.play();
    }
  }, { rootMargin: '200px' });
  els.forEach((el) => {
    observer!.observe(el);
    // Immediately start pets that are already on screen. Some mobile/browser
    // combinations delay the first IntersectionObserver callback indefinitely.
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth
      && !live.some((item) => item.el === el)) void mount(el);
  });
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
    if (document.hidden || !st.visible) st.anims.forEach((a) => a.pause());
    else st.anims[st.cur]?.play();
  }
});
