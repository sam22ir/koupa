/** Never present an unscored 0.0 as if it were a real rating. */
export function directoryRatingText(
  average: number | null | undefined,
  noneLabel: string,
): string {
  if (average == null || !Number.isFinite(average) || average <= 0) return noneLabel;
  return `★ ${average.toFixed(1)}`;
}
