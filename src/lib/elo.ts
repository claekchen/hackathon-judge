const K = 32;

export function calculateElo(
  ratingA: number,
  ratingB: number,
  aWins: boolean
): { newA: number; newB: number; change: number } {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const scoreA = aWins ? 1 : 0;
  const change = Math.round(K * (scoreA - expectedA));

  return {
    newA: ratingA + change,
    newB: ratingB - change,
    change: Math.abs(change),
  };
}
