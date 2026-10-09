import { beforeEach, describe, expect, it } from 'vitest';
import { SLIDES, isOnboarded, markOnboarded } from './onboarding';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };
});

describe('onboarding', () => {
  it('сначала не пройден, потом помечается пройденным', () => {
    expect(isOnboarded()).toBe(false);
    markOnboarded();
    expect(isOnboarded()).toBe(true);
  });
  it('без localStorage не падает', () => {
    (globalThis as any).localStorage = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } };
    expect(isOnboarded()).toBe(false);
    expect(() => markOnboarded()).not.toThrow();
  });
  it('у каждого слайда есть текст', () => {
    expect(SLIDES.every((s) => s.title && s.text && s.art)).toBe(true);
  });
});
