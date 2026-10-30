// Небольшое окно с сообщением и одной или двумя кнопками (оформление как у окна запроса камеры).
// Главная кнопка отвечает 'main', вторая 'second', Esc и тап по фону 'dismiss'.
export type NoticeAnswer = 'main' | 'second' | 'dismiss';
export function showNotice(opts: { title: string; text: string; button: string; second?: string }): Promise<NoticeAnswer> {
  return new Promise<NoticeAnswer>((resolve) => {
    const el = document.createElement('div');
    el.className = 'cam-ask';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', opts.title);
    el.innerHTML = `<div class="ca-card"><h2></h2><p></p><button class="ca-btn" type="button"></button>${opts.second ? '<button class="ca-second" type="button"></button>' : ''}</div>`;
    el.querySelector('h2')!.textContent = opts.title;
    el.querySelector('p')!.textContent = opts.text;
    const btn = el.querySelector<HTMLButtonElement>('.ca-btn')!;
    btn.textContent = opts.button;
    const done = (a: NoticeAnswer) => { removeEventListener('keydown', onKey); el.remove(); resolve(a); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') done('dismiss'); };
    addEventListener('keydown', onKey);
    btn.addEventListener('click', () => done('main'));
    const second = el.querySelector<HTMLButtonElement>('.ca-second');
    if (second) { second.textContent = opts.second!; second.addEventListener('click', () => done('second')); }
    el.addEventListener('click', (e) => { if (e.target === el) done('dismiss'); });
    document.body.appendChild(el);
    btn.focus({ preventScroll: true });
  });
}
