export interface Prediction {
  className: string;
  probability: number;
}

// Минимальная уверенность MobileNet, чтобы засчитать класс.
export const PROB_MIN = 0.08;

// MobileNet отдаёт классы ImageNet вида «coffee mug, mug»; сравниваем по целым словам.
export function matchesLabels(predictions: Prediction[], words: string[]): boolean {
  return predictions.some(
    (p) =>
      p.probability >= PROB_MIN &&
      words.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(p.className)),
  );
}
