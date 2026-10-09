const API_URL = import.meta.env.VITE_API_URL ?? '/photo-quests/api';
const TIMEOUT_MS = 7000;

// Ответы кэшируем: ребёнок часто находит одни и те же предметы.
const cache = new Map<string, string>();

// Просит ИИ коротко объяснить предмет. В запрос уходит только название («кружка»), фото никуда не отправляется.
// Если сервер недоступен, возвращаем null: игра просто идёт дальше без объяснения.
export async function explainObject(label: string): Promise<string | null> {
  const key = label.trim().toLowerCase();
  if (!key) return null;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const res = await fetch(`${API_URL}/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: key }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: unknown };
    if (typeof data.text !== 'string' || !data.text.trim()) return null;
    cache.set(key, data.text.trim());
    return data.text.trim();
  } catch {
    return null;
  }
}

export const clearExplainCache = (): void => cache.clear();
