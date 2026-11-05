const KEY = 'photoquest.onboarded.video.v1';

export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // без хранилища онбординг просто покажется снова
  }
}
