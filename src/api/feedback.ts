function feedbackApiUrl(key: string): string {
  // Read dynamically so Shaman can replace the placeholder after the Vite build.
  return String(import.meta.env[key] ?? '');
}

export function feedbackConfig(baseUrl = feedbackApiUrl('VITE_FEEDBACK_API_URL')) {
  const url = baseUrl.trim().replace(/\/+$/, '');
  if (!url || url.includes('<%')) return null;
  return { apiVersion: 1, baseUrl: url, projectName: 'photo_quest', formName: 'feedback' };
}
