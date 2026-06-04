export interface ScoringRuleDefinition {
  correctScore?: number;
  correctWinner?: number;
  correctDraw?: number;
}

export interface FootballPrediction {
  homeGoals: number;
  awayGoals: number;
}

export interface FootballResult {
  homeGoals: number;
  awayGoals: number;
}

export function scoreFootballPrediction(
  prediction: FootballPrediction,
  result: FootballResult,
  rules: ScoringRuleDefinition
): number {
  let points = 0;

  const predictedWinner =
    prediction.homeGoals > prediction.awayGoals
      ? "home"
      : prediction.homeGoals < prediction.awayGoals
      ? "away"
      : "draw";

  const actualWinner =
    result.homeGoals > result.awayGoals
      ? "home"
      : result.homeGoals < result.awayGoals
      ? "away"
      : "draw";

  const exactScore =
    prediction.homeGoals === result.homeGoals &&
    prediction.awayGoals === result.awayGoals;

  if (exactScore && rules.correctScore) {
    points += rules.correctScore;
  } else if (predictedWinner === actualWinner) {
    if (actualWinner === "draw" && rules.correctDraw) {
      points += rules.correctDraw;
    } else if (actualWinner !== "draw" && rules.correctWinner) {
      points += rules.correctWinner;
    }
  }

  return points;
}
