import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ENGLISH } from '../data/english';
import { ONBOARDING_CAMERA, ONBOARDING_HINT } from '../data/phrases';
import { recordedFor } from './voice';

class FakeAudio {
  static instances: FakeAudio[] = [];
  src = '';
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onpause: (() => void) | null = null;
  paused = false;
  ended = false;
  currentTime = 0;
  play = vi.fn((): Promise<void> => { this.paused = false; return Promise.resolve(); });
  pause = vi.fn();

  constructor() {
    FakeAudio.instances.push(this);
  }
}

beforeEach(() => {
  vi.resetModules();
  FakeAudio.instances = [];
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('document', new EventTarget());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('записанная озвучка', () => {
  it('находит запись по тексту задания и не путает русские фразы с английскими словами', () => {
    expect(recordedFor('Найди предмет с красным цветом')).toMatch(/voice\/task-red\.mp3$/);
    expect(recordedFor('Найди предмет с красным цветом', true)).toBeNull();
    expect(recordedFor('такой фразы нет')).toBeNull();
  });

  it('находит запись для каждого английского слова игры', () => {
    for (const word of Object.values(ENGLISH)) {
      expect(recordedFor(word.en, true)).toMatch(/voice\/word-[\w-]+\.mp3$/);
    }
  });

  it('находит записи всех новых подсказок онбординга', () => {
    for (const phrase of [...ONBOARDING_HINT, ...Object.values(ONBOARDING_CAMERA)]) {
      expect(recordedFor(phrase.text)).toMatch(/voice\/onboarding-[\w-]+\.mp3$/);
    }
  });

  it('продолжает английские слова после русской фразы в том же плеере', async () => {
    const { playRecorded } = await import('./voice');
    playRecorded('Молодец!');
    playRecorded('red', true, true);
    playRecorded('blue', true, true);

    const player = FakeAudio.instances[0];
    expect(player.src).toMatch(/praise-1\.mp3$/);
    player.onended?.();
    expect(player.src).toMatch(/word-red\.mp3$/);
    player.onended?.();
    expect(player.src).toMatch(/word-blue\.mp3$/);
    expect(FakeAudio.instances).toHaveLength(1);
  });

  it('сохраняет добавленные слова, пока браузер ожидает касание', async () => {
    const { playRecorded } = await import('./voice');
    playRecorded('Молодец!');
    const player = FakeAudio.instances[0];
    player.play.mockRejectedValueOnce({ name: 'NotAllowedError' });
    player.onended?.();
    playRecorded('red', true, true);
    await Promise.resolve();

    playRecorded('blue', true, true);
    expect(player.play).toHaveBeenCalledTimes(2);
    document.dispatchEvent(new Event('click'));
    expect(player.src).toMatch(/word-red\.mp3$/);
    player.onended?.();
    expect(player.src).toMatch(/word-blue\.mp3$/);
  });

  it('отмена предыдущей записи не удаляет новую очередь', async () => {
    const { playRecorded } = await import('./voice');
    playRecorded('Молодец!');
    const player = FakeAudio.instances[0];
    let rejectPrevious!: (reason: unknown) => void;
    player.play.mockImplementationOnce(() => new Promise<void>((_, reject) => {
      rejectPrevious = reject;
    }));
    playRecorded('red', false, true);
    playRecorded('blue', false, true);
    playRecorded('green', true, true);

    rejectPrevious({ name: 'AbortError' });
    await Promise.resolve();
    player.onended?.();
    expect(player.src).toMatch(/word-green\.mp3$/);
  });

  it('после ошибки файла проигрывает следующее английское слово', async () => {
    const { playRecorded } = await import('./voice');
    playRecorded('Молодец!');
    playRecorded('red', true, true);
    const player = FakeAudio.instances[0];
    player.onerror?.();
    expect(player.src).toMatch(/word-red\.mp3$/);
  });

  it('смена экрана отменяет ожидание касания и старую очередь', async () => {
    const { playRecorded, stopRecorded } = await import('./voice');
    playRecorded('Молодец!');
    const player = FakeAudio.instances[0];
    player.play.mockRejectedValueOnce({ name: 'NotAllowedError' });
    player.onended?.();
    playRecorded('red', true, true);
    await Promise.resolve();

    stopRecorded();
    document.dispatchEvent(new Event('click'));
    expect(player.play).toHaveBeenCalledTimes(2);
    playRecorded('blue', false, true);
    expect(player.src).toMatch(/word-blue\.mp3$/);
  });

  it('возвращается к английскому слову после паузы для повторения', async () => {
    vi.useFakeTimers();
    const { playRecorded, pauseRecorded } = await import('./voice');
    playRecorded('red', false, true);
    pauseRecorded(2800);
    playRecorded('red', true, true);
    const player = FakeAudio.instances[0];
    player.onended?.();
    expect(player.play).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2800);
    expect(player.play).toHaveBeenCalledTimes(2);
    expect(player.src).toMatch(/word-red\.mp3$/);
  });

  it('вызывает завершение после конца фразы, даже если она длиннее 1,8 секунды', async () => {
    vi.useFakeTimers();
    const { playRecorded } = await import('./voice');
    const onEnd = vi.fn();
    playRecorded('Молодец!', false, false, onEnd);
    await vi.advanceTimersByTimeAsync(5000);
    expect(onEnd).not.toHaveBeenCalled();
    FakeAudio.instances[0].onended?.();
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('автоматический результат даёт договорить текущей фразе перед похвалой', async () => {
    const { playRecorded, stopRecorded } = await import('./voice');
    playRecorded('Найди предмет с красным цветом');
    playRecorded('Наведи камеру!', true);
    const player = FakeAudio.instances[0];
    stopRecorded('finish-current');
    playRecorded('Молодец!', true);
    expect(player.pause).not.toHaveBeenCalled();
    expect(player.src).toMatch(/task-red\.mp3$/);
    player.onended?.();
    expect(player.src).toMatch(/praise-1\.mp3$/);
  });

  it('отмена фразы или паузы не запускает переход со старого экрана', async () => {
    vi.useFakeTimers();
    const { playRecorded, pauseRecorded, stopRecorded } = await import('./voice');
    const onEnd = vi.fn();
    playRecorded('Молодец!', false, false, onEnd);
    const oldEnded = FakeAudio.instances[0].onended;
    stopRecorded();
    oldEnded?.();
    pauseRecorded(1000, undefined, onEnd);
    stopRecorded();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('завершение фразы может открыть новую очередь, не пропуская её начало', async () => {
    const { playRecorded } = await import('./voice');
    playRecorded('Молодец!', false, false, () => {
      playRecorded('red', false, true);
      playRecorded('blue', true, true);
    });
    const player = FakeAudio.instances[0];
    player.onended?.();
    expect(player.src).toMatch(/word-red\.mp3$/);
    expect(player.play).toHaveBeenCalledTimes(2);
    player.onended?.();
    expect(player.src).toMatch(/word-blue\.mp3$/);
  });

  it('после системной паузы продолжает запись с прежней позиции', async () => {
    const { playRecorded } = await import('./voice');
    playRecorded('red', false, true);
    const player = FakeAudio.instances[0];
    player.currentTime = 0.3;
    player.paused = true;
    player.onpause?.();
    expect(player.play).toHaveBeenCalledTimes(2);
    expect(player.currentTime).toBe(0.3);
    expect(player.src).toMatch(/word-red\.mp3$/);
  });

  it('ожидает возврата на страницу, если система приостановила озвучку в фоне', async () => {
    const { playRecorded } = await import('./voice');
    playRecorded('red', false, true);
    const player = FakeAudio.instances[0];
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    player.paused = true;
    player.onpause?.();
    expect(player.play).toHaveBeenCalledOnce();
    Object.defineProperty(document, 'hidden', { value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it('выключение звука завершает ожидание похвалы для перехода к следующему заданию', async () => {
    const { playRecorded, stopRecorded } = await import('./voice');
    const onEnd = vi.fn();
    playRecorded('Молодец!', false, false, onEnd);
    const player = FakeAudio.instances[0];
    const oldEnded = player.onended;
    stopRecorded('complete');
    expect(player.pause).toHaveBeenCalledOnce();
    expect(onEnd).toHaveBeenCalledOnce();
    oldEnded?.();
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('выключение звука завершает паузу и отложенные действия один раз', async () => {
    vi.useFakeTimers();
    const { playRecorded, pauseRecorded, stopRecorded } = await import('./voice');
    const afterPause = vi.fn();
    const afterWord = vi.fn();
    pauseRecorded(2800, undefined, afterPause);
    playRecorded('red', true, true, afterWord);
    stopRecorded('complete');
    await vi.advanceTimersByTimeAsync(2800);
    expect(afterPause).toHaveBeenCalledOnce();
    expect(afterWord).toHaveBeenCalledOnce();
    expect(FakeAudio.instances).toHaveLength(0);
  });
});
