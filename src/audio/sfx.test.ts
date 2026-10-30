import { describe, expect, it } from 'vitest';
import { SFX, sfxForClick } from './sfx';

// кнопка с заданными id и классами (проверка селекторов без DOM)
const btn = (id: string, ...classes: string[]) => ({
  closest: () => ({ id, matches: (sel: string) => sel.split(',').some((p) => p.trim() === `#${id}` || classes.some((c) => p.trim() === `.${c}`)) }),
});
const notBtn = { closest: () => null };

describe('звуки интерфейса', () => {
  it('подбирает звук по кнопке', () => {
    expect(sfxForClick(btn('', 'mp-tile'))).toBe('forward');
    expect(sfxForClick(btn('', 'loc-card'))).toBe('forward');
    expect(sfxForClick(btn('back'))).toBe('back');
    expect(sfxForClick(btn('', 'cp-back'))).toBe('back');
    expect(sfxForClick(btn('', 'loc-play'))).toBe('tap-heavy');
    expect(sfxForClick(btn('', 'cp-btn'))).toBe('tap');
  });
  it('у кнопки звука свои звуки, мимо кнопок звука нет', () => {
    expect(sfxForClick(btn('snd'))).toBeNull();
    expect(sfxForClick(notBtn)).toBeNull();
    expect(sfxForClick(null)).toBeNull();
  });
  it('у каждого звука есть хотя бы один вариант', () => {
    for (const n of Object.values(SFX)) expect(n).toBeGreaterThan(0);
  });
});
