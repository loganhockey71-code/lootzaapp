/**
 * XP is pure progression — it can never be spent (see lib/types.ts CoinTxn for
 * the separate, spendable Lootza Coins currency). Each level needs
 * `level * 1500` XP, matching the pace already shown on creator profiles
 * (e.g. the seed "pixelmax" profile sits at Level 4 needing 6,000 XP).
 */
export function xpThresholdForLevel(level: number): number {
  return level * 1500;
}

export interface LevelUpResult {
  level: number;
  xp: number;
  levelsGained: number;
}

/** Applies an XP gain, rolling over into as many level-ups as it earns. */
export function applyXpGain(currentLevel: number, currentXp: number, gain: number): LevelUpResult {
  let level = currentLevel;
  let xp = currentXp + gain;
  let levelsGained = 0;

  let threshold = xpThresholdForLevel(level);
  while (xp >= threshold) {
    xp -= threshold;
    level += 1;
    levelsGained += 1;
    threshold = xpThresholdForLevel(level);
  }

  return { level, xp, levelsGained };
}
