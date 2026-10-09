import type { Task } from '../data/tasks';
import { localVerify } from '../vision/local';

export interface VerifyResult {
  match: boolean;
  reason: string;
  label?: string; // русское название найденного предмета, если удалось определить
}

const API_URL = import.meta.env.VITE_API_URL ?? '/photo-quests/api';
const TIMEOUT_MS = 20_000;

export function parseVerifyResponse(data: unknown): VerifyResult {
  if (
    typeof data !== 'object' || data === null ||
    typeof (data as VerifyResult).match !== 'boolean'
  ) {
    throw new Error('Некорректный ответ проверки');
  }
  const { match, reason } = data as VerifyResult;
  return { match, reason: typeof reason === 'string' ? reason : '' };
}

export async function verifyPhoto(photo: Blob, task: Task): Promise<VerifyResult> {
  // Цвета и предметы проверяем на устройстве: фото не уходит в сеть.
  if (task.local) return localVerify(photo, task.local);
  if (import.meta.env.VITE_MOCK === '1') {
    await new Promise((r) => setTimeout(r, 800));
    return { match: Math.random() > 0.4, reason: 'mock' };
  }
  const body = new FormData();
  body.append('photo', photo, 'photo.jpg');
  body.append('taskId', task.id);
  body.append('criterion', task.criterion);
  const res = await fetch(`${API_URL}/verify`, {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Проверка недоступна (${res.status})`);
  return parseVerifyResponse(await res.json());
}
