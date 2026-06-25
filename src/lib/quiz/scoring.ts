const QUESTION_BASE_POINTS = 200;
const MIN_TIME_FACTOR = 0.25;

export function calculateQuestionPoints(correct: boolean, elapsedMs: number, limitSeconds: number) {
  if (!correct) return 0;
  const maxMs = limitSeconds * 1000;
  if (elapsedMs > maxMs) return 0;
  const remainingRatio = Math.max(0, 1 - elapsedMs / maxMs);
  const timeFactor = MIN_TIME_FACTOR + (1 - MIN_TIME_FACTOR) * remainingRatio;
  return Math.round(QUESTION_BASE_POINTS * timeFactor);
}
