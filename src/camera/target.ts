import type { LocalCheck, Task } from '../data/tasks';
import type { ColorName } from '../vision/color';

// Что ищем на камере: цвет и/или слова-метки предметов (из проверки задания).
export interface Target { color?: ColorName; words?: string[]; clip?: string; requiresModels?: boolean }

export function targetOfCheck(check: LocalCheck | undefined): Target {
  if (!check) return {};
  switch (check.kind) {
    case 'color': return { color: check.color, requiresModels: false };
    case 'labels': return { words: check.words, clip: check.clip, requiresModels: true };
    case 'and': {
      const parts = check.checks.map(targetOfCheck);
      return { color: parts.find((p) => p.color)?.color, words: parts.flatMap((p) => p.words ?? []), clip: parts.find((p) => p.clip)?.clip, requiresModels: parts.some((p) => p.requiresModels) };
    }
    case 'multicolor': return { requiresModels: false };
    case 'any': return { requiresModels: true };
    default: return {};
  }
}

export const targetOf = (task: Task): Target => targetOfCheck(task.local);
