import { feedbackConfig } from '../api/feedback';
import './feedback.css';

export function feedbackButton(): string {
  if (!feedbackConfig()) return '';
  return `<button id="feedback" class="feedback-button" type="button" aria-label="Обратная связь" aria-haspopup="dialog" aria-expanded="false">
    <span class="feedback-cloud">
      <svg class="feedback-bubble" aria-hidden="true" viewBox="0 0 44 45"><path d="M22.9302 41.9179C34.5671 41.9179 44.0007 32.5343 44.0007 20.959C44.0007 9.38365 34.5671 0 22.9302 0C11.2933 0 1.85967 9.38365 1.85967 20.959C1.85967 24.6062 2.79623 28.0358 4.44317 31.0229C4.77837 35.2056 2.08638 39.2443 0.00195312 40.3324C2.37133 41.0107 8.80157 41.6248 11.4547 38.5398C14.7565 40.6765 18.6976 41.9179 22.9302 41.9179Z"/></svg>
      <svg class="feedback-heart" aria-hidden="true" viewBox="0 0 20 16"><path d="M19.5 5.52344C19.5 10.393 12.9288 14.6457 10.0472 16C6.86482 14.5259 0.5 10.393 0.5 5.52344C0.5 -0.21073 7.08655 -1.5619 10.0472 2.4562C12.9661 -1.66863 19.5 -0.56647 19.5 5.52344Z"/></svg>
    </span>
  </button>`;
}

let activeDialog: HTMLDialogElement | null = null;

export async function openFeedback(trigger: HTMLButtonElement): Promise<void> {
  const config = feedbackConfig();
  if (!config || activeDialog) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'feedback-dialog';
  dialog.setAttribute('aria-label', 'Обратная связь');
  dialog.innerHTML = `<div class="feedback-mount"><p class="feedback-status" role="status">Загрузка формы…</p></div>
    <button class="feedback-close" type="button" aria-label="Закрыть обратную связь"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="m12 12 16 16m0-16L12 28"/></svg></button>`;
  const mount = dialog.querySelector<HTMLElement>('.feedback-mount')!;
  let unmount: (() => void) | undefined;
  const close = () => {
    if (activeDialog !== dialog) return;
    activeDialog = null;
    unmount?.();
    dialog.close();
    dialog.remove();
    trigger.setAttribute('aria-expanded', 'false');
    if (trigger.isConnected) trigger.focus({ preventScroll: true });
  };
  dialog.querySelector('.feedback-close')!.addEventListener('click', close);
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  document.body.append(dialog);
  activeDialog = dialog;
  trigger.setAttribute('aria-expanded', 'true');
  dialog.showModal();
  try {
    const { mountFeedbackWindow } = await import('./feedbackWindow');
    if (activeDialog === dialog) unmount = mountFeedbackWindow(mount, config, close);
  } catch {
    if (activeDialog === dialog) {
      mount.querySelector('.feedback-status')!.textContent = 'Не удалось загрузить форму. Попробуй ещё раз.';
    }
  }
}
