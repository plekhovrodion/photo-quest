import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TASKS } from '../data/tasks';
import { captureTask } from './capture';
import { compressPhoto } from '../camera/capture';
import { verifyPhoto } from '../api/verify';
import { claimFound } from '../api/economy';
import { album } from '../album';

vi.mock('../camera/capture', () => ({ compressPhoto: vi.fn(async () => new Blob()) }));
vi.mock('../api/verify', () => ({ verifyPhoto: vi.fn(async () => ({ match: true })) }));
vi.mock('../api/economy', () => ({ claimFound: vi.fn(async () => 'ok') }));
vi.mock('../album', () => ({ toSticker: vi.fn(async () => new Blob()), album: { put: vi.fn() } }));

const captured = { blob: new Blob(), cropped: false };
beforeEach(() => vi.clearAllMocks());

describe('capture session', () => {
  it('отмена при сжатии не запускает проверку и оплату', async () => {
    let complete!: (photo: Blob) => void;
    vi.mocked(compressPhoto).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
    const session = new AbortController();
    const onPhoto = vi.fn();
    const pending = captureTask(TASKS[0], captured, session.signal, onPhoto);
    session.abort();
    complete(new Blob());
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(onPhoto).not.toHaveBeenCalled();
    expect(verifyPhoto).not.toHaveBeenCalled();
    expect(claimFound).not.toHaveBeenCalled();
  });

  it('результат проверки ушедшего задания не запускает оплату', async () => {
    let complete!: (result: { match: boolean; reason: string }) => void;
    vi.mocked(verifyPhoto).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
    const session = new AbortController();
    const pending = captureTask(TASKS[0], captured, session.signal, vi.fn());
    await vi.waitFor(() => expect(verifyPhoto).toHaveBeenCalled());
    session.abort();
    complete({ match: true, reason: 'local' });
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(claimFound).not.toHaveBeenCalled();
    expect(album.put).not.toHaveBeenCalled();
  });

  it('отклонённая находка не сохраняет наклейку', async () => {
    vi.mocked(claimFound).mockResolvedValueOnce('insufficient');
    const result = await captureTask(TASKS[0], captured, new AbortController().signal, vi.fn());
    expect(result).toEqual({ match: false, claim: 'insufficient' });
    expect(album.put).not.toHaveBeenCalled();
  });
});
