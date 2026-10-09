import { closeIcon } from '../ui/icons';
import { initialRect, moveRect, resizeRect, toSource, type Handle, type Rect } from './cropMath';

// Экран обрезки: ребёнок (или родитель) двигает рамку, чтобы в кадре остался только нужный предмет.
// Возвращает обрезанный снимок, исходный (кнопка «Весь кадр») или null, если отменили.
export function cropPhoto(photo: Blob): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(photo);
    const overlay = document.createElement('div');
    overlay.className = 'crop-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Обрезка снимка');
    overlay.innerHTML = `
      <button class="crop-close secondary small" type="button" aria-label="Отмена">${closeIcon()}</button>
      <p class="crop-title">Покажи только предмет</p>
      <div class="crop-stage"><img class="crop-img" alt="" draggable="false" src="${url}">
        <div class="crop-box" role="presentation">
          <i class="h nw" data-h="nw"></i><i class="h ne" data-h="ne"></i><i class="h sw" data-h="sw"></i><i class="h se" data-h="se"></i>
        </div></div>
      <div class="crop-actions">
        <button class="crop-done" type="button">Готово</button>
        <button class="crop-all secondary" type="button">Весь кадр</button>
      </div>`;
    document.body.appendChild(overlay);

    const stage = overlay.querySelector<HTMLElement>('.crop-stage')!;
    const img = overlay.querySelector<HTMLImageElement>('.crop-img')!;
    const box = overlay.querySelector<HTMLElement>('.crop-box')!;
    let rect: Rect = { x: 0, y: 0, w: 0, h: 0 };
    let bounds = { w: 0, h: 0 };
    let natural = { w: 0, h: 0 };

    const finish = (result: Blob | null) => {
      overlay.remove();
      URL.revokeObjectURL(url);
      removeEventListener('keydown', onKey);
      resolve(result);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(null); };
    addEventListener('keydown', onKey);

    const paint = () => {
      box.style.cssText = `left:${rect.x}px;top:${rect.y}px;width:${rect.w}px;height:${rect.h}px`;
    };

    const layout = () => {
      natural = { w: img.naturalWidth, h: img.naturalHeight };
      bounds = { w: img.clientWidth, h: img.clientHeight };
      stage.style.width = `${bounds.w}px`;
      stage.style.height = `${bounds.h}px`;
      rect = initialRect(bounds);
      paint();
    };
    if (img.complete && img.naturalWidth) layout(); else img.addEventListener('load', layout, { once: true });
    addEventListener('resize', layout);

    // Перетаскивание: тело рамки двигает её, уголки меняют размер (мышь и палец одинаково).
    let drag: { handle: Handle; sx: number; sy: number; start: Rect } | null = null;
    box.addEventListener('pointerdown', (e) => {
      const handle = ((e.target as HTMLElement).dataset.h as Handle | undefined) ?? 'move';
      drag = { handle, sx: e.clientX, sy: e.clientY, start: { ...rect } };
      try { box.setPointerCapture(e.pointerId); } catch { /* синтетические события без активного указателя */ }
      e.preventDefault();
    });
    box.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      rect = drag.handle === 'move' ? moveRect(drag.start, dx, dy, bounds) : resizeRect(drag.start, drag.handle, dx, dy, bounds);
      paint();
    });
    const end = () => { drag = null; };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);

    overlay.querySelector('.crop-close')!.addEventListener('click', () => finish(null));
    overlay.querySelector('.crop-all')!.addEventListener('click', () => finish(photo));
    overlay.querySelector('.crop-done')!.addEventListener('click', async () => {
      const scale = bounds.w / natural.w;
      const s = toSource(rect, scale);
      const bmp = await createImageBitmap(photo, { imageOrientation: 'from-image' });
      const sx = Math.min(Math.max(s.x, 0), bmp.width - 1), sy = Math.min(Math.max(s.y, 0), bmp.height - 1);
      const sw = Math.min(s.w, bmp.width - sx), sh = Math.min(s.h, bmp.height - sy);
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      canvas.getContext('2d')!.drawImage(bmp, sx, sy, sw, sh, 0, 0, sw, sh);
      bmp.close();
      canvas.toBlob((b) => finish(b ?? photo), 'image/jpeg', 0.92);
    });
  });
}
