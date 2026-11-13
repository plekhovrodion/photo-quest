import type { Task } from '../data/tasks';
import { compressPhoto, type Captured } from '../camera/capture';
import { verifyPhoto } from '../api/verify';
import { claimFound } from '../api/economy';
import { album, toSticker } from '../album';
import { STARS_PER_TASK } from './state';

// Each await belongs to one task session. A navigation aborts its remaining effects.
export async function captureTask(task: Task, captured: Captured, signal: AbortSignal, onPhoto: () => void) {
  signal.throwIfAborted();
  const photo = await compressPhoto(captured.blob);
  signal.throwIfAborted();
  onPhoto();
  const verdict = await verifyPhoto(photo, task, { cropped: captured.cropped, liveClip: captured.liveClip });
  signal.throwIfAborted();
  const match = verdict.match || !!verdict.maybe;
  if (!match) return { match: false, claim: 'ok' as const };
  const claim = await claimFound(task.id, STARS_PER_TASK, signal);
  signal.throwIfAborted();
  if (claim === 'insufficient') return { match: false, claim };
  try {
    const blob = await toSticker(photo);
    signal.throwIfAborted();
    await album.put({ id: task.id, blob, ts: Date.now() });
  } catch {
    signal.throwIfAborted();
  }
  return { match: true, claim };
}
