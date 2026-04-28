// Score values per kill. Tunable here.
export const SCORE = {
  enemy: 100,
  orbiter: 250,
  orbiterLoot: 500,
  missile: 50,
  boss: 10000,
};

let score = 0;

export function getScore() {
  return score;
}

export function addScore(n) {
  score += n;
}

export function resetScore() {
  score = 0;
}

export function formatScore(width = 6) {
  return score.toString().padStart(width, "0");
}
