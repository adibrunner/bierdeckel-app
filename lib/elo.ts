export function expectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

export function newRating(
  currentRating: number,
  opponentRating: number,
  actualScore: 1 | 0 | 0.5,
  kFactor = 32
): number {
  const expected = expectedScore(currentRating, opponentRating);
  return Math.round(currentRating + kFactor * (actualScore - expected));
}

export function calculateMatchElo(
  playerARating: number,
  playerBRating: number,
  winnerIsA: boolean,
  kFactor = 32
): { newRatingA: number; newRatingB: number } {
  const scoreA = winnerIsA ? 1 : 0;
  const scoreB = winnerIsA ? 0 : 1;
  return {
    newRatingA: newRating(playerARating, playerBRating, scoreA as 1 | 0, kFactor),
    newRatingB: newRating(playerBRating, playerARating, scoreB as 1 | 0, kFactor),
  };
}
