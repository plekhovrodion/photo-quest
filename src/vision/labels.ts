export interface Prediction {
  className: string;
  probability: number;
}

// Минимальная уверенность детектора, чтобы засчитать класс.
export const PROB_MIN = 0.05;

// Названия классов сравниваем по целым словам («cup» не совпадёт с «cupboard»).
export function matchesLabels(predictions: Prediction[], words: string[]): boolean {
  return predictions.some(
    (p) =>
      p.probability >= PROB_MIN &&
      words.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(p.className)),
  );
}
