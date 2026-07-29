export interface MacroTargets {
  proteinG: number;
  fatG: number;
  carbsG: number;
}

/**
 * 目標カロリーからPFC目標量を算出。
 * バランス: たんぱく質30% / 脂質25% / 炭水化物45%
 * (たんぱく質・炭水化物 = 4kcal/g、脂質 = 9kcal/g)
 */
export function calcMacroTargets(targetCalories: number): MacroTargets {
  return {
    proteinG: Math.round((targetCalories * 0.3) / 4),
    fatG: Math.round((targetCalories * 0.25) / 9),
    carbsG: Math.round((targetCalories * 0.45) / 4),
  };
}
