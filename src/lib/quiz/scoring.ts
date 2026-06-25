const QUESTION_BASE_POINTS = 500;
const QUESTION_SPEED_BONUS = 500;

export function calculateQuestionPoints(correct: boolean, elapsedMs: number, limitSeconds: number) {
  if (!correct) return 0;
  const maxMs = limitSeconds * 1000;
  if (elapsedMs > maxMs) return 0;
  const timeRatio = Math.max(0, 1 - elapsedMs / maxMs);
  return QUESTION_BASE_POINTS + Math.round(QUESTION_SPEED_BONUS * timeRatio);
}
