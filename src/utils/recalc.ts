import { BarItem } from '../types/bbs';
import { calculateBarCuttingLength } from './shapes';
import { getUnitWeight } from './engineering';

/** Recomputes cut length and weights with the currently active code profile. */
export function recalculateBar(bar: BarItem): BarItem {
  const calc = calculateBarCuttingLength(
    bar.shapeCode,
    bar.dimA,
    bar.dimB,
    bar.dimC,
    bar.dimD,
    bar.dimE,
    bar.dimF,
    bar.diameter,
    bar.customSegments,
    bar.startHook,
    bar.endHook
  );
  const unitWeight = getUnitWeight(bar.diameter);
  const totalLength = Number((bar.totalBars * calc.cuttingLength).toFixed(3));
  return {
    ...bar,
    cuttingLength: calc.cuttingLength,
    formulaExplanation: calc.formulaExplanation,
    unitWeight,
    totalLength,
    totalWeight: Number((totalLength * unitWeight).toFixed(2)),
  };
}
