// Заврики растут: ребёнок кормит их вспышками, и они получают новые возможности.
import type { Progress } from './progress';

export type ZavrikId = 'grisha' | 'sonya';
export const ZAVRIKS: ZavrikId[] = ['grisha', 'sonya'];
export const ZAVRIK_NAME: Record<ZavrikId, string> = { grisha: 'Гриша', sonya: 'Соня' };

// Сколько вспышек всего нужно скормить, чтобы достичь 1, 2, 3, 4, 5 уровня.
export const STAGE_AT = [0, 4, 10, 20, 35];
export const MAX_STAGE = STAGE_AT.length;

// Что открывается на каком уровне.
export const UNLOCK_STAGE = { color: 2, hat: 3, badge: 4, crown: 5 } as const;

export interface Look {
  hue: number; // поворот цвета в градусах
  hat: string | null;
  badge: string | null;
}
export const DEFAULT_LOOK: Look = { hue: 0, hat: null, badge: null };

export const HUES = [0, 45, 120, 190, 260, 320];
export const HATS = [
  { id: 'party', name: 'Колпак', stage: UNLOCK_STAGE.hat },
  { id: 'cap', name: 'Кепка', stage: UNLOCK_STAGE.hat },
  { id: 'crown', name: 'Корона', stage: UNLOCK_STAGE.crown },
];
export const BADGES = [
  { id: 'star', name: 'Звезда', stage: UNLOCK_STAGE.badge },
  { id: 'bolt', name: 'Молния', stage: UNLOCK_STAGE.badge },
  { id: 'heart', name: 'Сердце', stage: UNLOCK_STAGE.badge },
];

export const fedOf = (p: Pick<Progress, 'fed'>, id: ZavrikId): number => p.fed?.[id] ?? 0;
export const lookOf = (p: Pick<Progress, 'look'>, id: ZavrikId): Look => ({ ...DEFAULT_LOOK, ...(p.look?.[id] ?? {}) });

export function stageOf(fed: number): { stage: number; into: number; need: number | null } {
  let stage = 1;
  for (let i = 1; i < STAGE_AT.length; i++) if (fed >= STAGE_AT[i]) stage = i + 1;
  if (stage >= MAX_STAGE) return { stage, into: fed - STAGE_AT[MAX_STAGE - 1], need: null };
  return { stage, into: fed - STAGE_AT[stage - 1], need: STAGE_AT[stage] - STAGE_AT[stage - 1] };
}

// Покормить заврика одной вспышкой. Возвращает новый прогресс и уровень, если он вырос.
export function feed(p: Progress, id: ZavrikId): { progress: Progress; levelUp: number | null } {
  if (p.flashes < 1) return { progress: p, levelUp: null };
  const before = stageOf(fedOf(p, id)).stage;
  const fed = { grisha: fedOf(p, 'grisha'), sonya: fedOf(p, 'sonya'), [id]: fedOf(p, id) + 1 };
  const after = stageOf(fed[id]).stage;
  return { progress: { ...p, flashes: p.flashes - 1, fed }, levelUp: after > before ? after : null };
}

// Применяем выбор внешнего вида, только если предмет уже открыт.
export function setLook(p: Progress, id: ZavrikId, patch: Partial<Look>): Progress {
  const stage = stageOf(fedOf(p, id)).stage;
  const cur = lookOf(p, id);
  const next = { ...cur };
  if (patch.hue !== undefined && stage >= UNLOCK_STAGE.color && HUES.includes(patch.hue)) next.hue = patch.hue;
  if (patch.hat !== undefined) {
    const h = HATS.find((x) => x.id === patch.hat);
    if (patch.hat === null || (h && stage >= h.stage)) next.hat = patch.hat;
  }
  if (patch.badge !== undefined) {
    const b = BADGES.find((x) => x.id === patch.badge);
    if (patch.badge === null || (b && stage >= b.stage)) next.badge = patch.badge;
  }
  return { ...p, look: { grisha: lookOf(p, 'grisha'), sonya: lookOf(p, 'sonya'), [id]: next } };
}

// Чьё изображение: по имени файла картинки.
export const zavrikOfArt = (name: string): ZavrikId => (name.startsWith('sonya') ? 'sonya' : 'grisha');
