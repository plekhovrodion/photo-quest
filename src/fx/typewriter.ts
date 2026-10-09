let timer = 0;

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Печатает текст по буквам, пока заврик «говорит» (класс talking на его картинке).
// Повторный вызов или нажатие на реплику сразу показывает весь текст.
export function typeText(el: HTMLElement, text: string, speaker?: Element | null, msPerChar = 26): void {
  clearInterval(timer);
  if (reduced()) { el.textContent = text; return; }
  let i = 0;
  speaker?.classList.add('talking');
  const finish = () => {
    clearInterval(timer);
    el.textContent = text;
    speaker?.classList.remove('talking');
  };
  timer = window.setInterval(() => {
    i++;
    el.textContent = text.slice(0, i);
    if (i >= text.length) finish();
  }, msPerChar);
  el.closest('.bubble')?.addEventListener('click', finish, { once: true });
}

export function stopTyping(): void {
  clearInterval(timer);
}
