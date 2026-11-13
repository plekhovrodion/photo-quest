import './beadsLimit.css';

export function beadsLimitHtml(): string {
  const base = `${import.meta.env.BASE_URL}art/beads`;
  const benefits = [
    'Выучить английские слова',
    'Запомнить их\u00a0произношение',
    'Подружиться с\u00a0английским через\u00a0реальный мир',
  ];
  return `<div class="beads-limit-content">
    <div class="beads-limit-illustration" aria-hidden="true">
      <div class="beads-limit-cat">
        <div class="beads-limit-cat-clip">
          <img class="beads-limit-cat-body" src="${base}/cat.svg" alt="">
          <img class="beads-limit-paws-back" src="${base}/paws-back.svg" alt="">
        </div>
        <img class="beads-limit-paws-front" src="${base}/paws-front.svg" alt="">
      </div>
    </div>
    <section class="beads-limit-card">
      <h2 id="beads-limit-title" tabindex="-1" autofocus>Позови взрослых, чтобы продолжить</h2>
      <div class="beads-limit-benefits">
        <p class="beads-limit-intro">Тренажёр «Фото-квест» поможет:</p>
        <ul>${benefits.map((text) => `<li><span class="beads-limit-paw" aria-hidden="true"><img src="${base}/paw.svg" alt=""></span><span>${text}</span></li>`).join('')}</ul>
      </div>
      <button class="beads-limit-action" type="button">Открыть полный доступ</button>
    </section>
  </div>`;
}

let activeModal: Promise<'main' | 'dismiss'> | null = null;

export function showBeadsLimit(): Promise<'main' | 'dismiss'> {
  if (activeModal) return activeModal;
  activeModal = new Promise<'main' | 'dismiss'>((resolve) => {
    const previousFocus = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'beads-limit';
    dialog.setAttribute('aria-labelledby', 'beads-limit-title');
    dialog.innerHTML = beadsLimitHtml();
    const close = (answer: 'main' | 'dismiss') => {
      dialog.close();
      dialog.remove();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
      resolve(answer);
    };
    dialog.querySelector('.beads-limit-action')!.addEventListener('click', () => close('main'));
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); close('dismiss'); });
    dialog.addEventListener('click', (event) => { if (event.target === dialog) close('dismiss'); });
    document.body.append(dialog);
    dialog.showModal();
    dialog.querySelector<HTMLHeadingElement>('h2')!.focus({ preventScroll: true });
  }).finally(() => { activeModal = null; });
  return activeModal;
}
