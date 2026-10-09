import type { LocalCheck, Task } from '../data/tasks';
import type { ColorName } from '../vision/color';

// Что ищем на камере: цвет и/или слова-метки предметов (из проверки задания).
export interface Target { color?: ColorName; words?: string[] }

export function targetOfCheck(check: LocalCheck | undefined): Target {
  if (!check) return {};
  switch (check.kind) {
    case 'color': return { color: check.color };
    case 'labels': return { words: check.words };
    case 'and': {
      const parts = check.checks.map(targetOfCheck);
      return { color: parts.find((p) => p.color)?.color, words: parts.flatMap((p) => p.words ?? []) };
    }
    default: return {};
  }
}

export const targetOf = (task: Task): Target => targetOfCheck(task.local);
