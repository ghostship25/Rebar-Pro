import React from 'react';
import { BarItem } from '../types/bbs';
import { SHAPE_LIBRARY, calculateBarCuttingLength } from '../utils/shapes';
import { getUnitWeight } from '../utils/engineering';
import { X, AlertTriangle } from 'lucide-react';

interface CalcBreakdownModalProps {
  bar: BarItem | null;
  onClose: () => void;
}

export const CalcBreakdownModal: React.FC<CalcBreakdownModalProps> = ({ bar, onClose }) => {
  if (!bar) return null;

  const isCustom = bar.shapeCode === '99';
  const shape = SHAPE_LIBRARY[bar.shapeCode];
  const calc = calculateBarCuttingLength(
    bar.shapeCode,
    bar.dimA,
    bar.dimB ?? 0,
    bar.dimC ?? 0,
    bar.dimD ?? 0,
    bar.dimE ?? 0,
    bar.dimF ?? 0,
    bar.diameter,
    bar.customSegments,
    bar.startHook,
    bar.endHook
  );
  const unitWeight = getUnitWeight(bar.diameter);
  const totalLength = bar.totalBars * calc.cuttingLength;
  const totalWeight = totalLength * unitWeight;
  const stale = Math.abs(calc.cuttingLength - bar.cuttingLength) > 0.0005 || Math.abs(totalWeight - bar.totalWeight) > 0.01;

  const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <div className={`flex justify-between gap-4 py-1 border-b border-slate-200 dark:border-slate-800 ${strong ? 'font-bold' : ''}`}>
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className="font-mono text-right text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );

  const dims = (['A', 'B', 'C', 'D', 'E', 'F'] as const)
    .map((k) => [k, bar[`dim${k}` as keyof BarItem] as number | undefined] as const)
    .filter(([, v]) => v !== undefined && v > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs" role="dialog" aria-modal="true">
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Calculation — Bar {bar.barMark}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              How the cutting length and weight were derived
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 hover:dark:bg-slate-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {stale && (
            <div className="flex items-start gap-2 border border-amber-500/40 bg-amber-500/10 rounded-lg p-3 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Stored values ({bar.cuttingLength.toFixed(3)} m, {bar.totalWeight.toFixed(2)} kg) differ from this recalculation.
                Edit and re-save the bar to refresh it.
              </span>
            </div>
          )}

          <section>
            <h4 className="font-semibold uppercase tracking-wider text-[10px] text-slate-500 mb-1">Inputs</h4>
            <Row label="Shape" value={`${bar.shapeCode} — ${isCustom ? 'Custom shape' : shape?.name ?? 'Unknown'}`} />
            {shape && !isCustom && <Row label="Reference" value={`IS ${shape.isCode} · BS ${shape.bsCode}`} />}
            <Row label="Bar diameter" value={`${bar.diameter} mm`} />
            {dims.map(([k, v]) => (
              <Row key={k} label={`Dimension ${k}`} value={`${(v as number).toFixed(3)} m`} />
            ))}
            <Row label="Elements × bars/element" value={`${bar.numElements} × ${bar.numBarsPerElement} = ${bar.totalBars}`} />
          </section>

          <section>
            <h4 className="font-semibold uppercase tracking-wider text-[10px] text-slate-500 mb-1">Cutting length</h4>
            <div className="font-mono text-[11px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 break-words text-slate-800 dark:text-slate-200">
              {calc.formulaExplanation}
            </div>
            <div className="mt-2">
              <Row label="Sum of straight lengths" value={`${calc.totalStraightLength.toFixed(3)} m`} />
              <Row label="Hook / extension additions" value={`+ ${calc.hookExtensions.toFixed(3)} m`} />
              <Row label="Bend deductions" value={`− ${calc.totalBendDeductions.toFixed(3)} m`} />
              <Row label="Cutting length" value={`${calc.cuttingLength.toFixed(3)} m`} strong />
            </div>
          </section>

          <section>
            <h4 className="font-semibold uppercase tracking-wider text-[10px] text-slate-500 mb-1">Quantity & weight</h4>
            <Row label="Unit weight (d² / 162.28)" value={`${bar.diameter}² / 162.28 = ${unitWeight.toFixed(3)} kg/m`} />
            <Row label="Total length" value={`${bar.totalBars} × ${calc.cuttingLength.toFixed(3)} = ${totalLength.toFixed(3)} m`} />
            <Row label="Total weight" value={`${totalLength.toFixed(3)} × ${unitWeight.toFixed(3)} = ${totalWeight.toFixed(2)} kg`} strong />
          </section>
        </div>
      </div>
    </div>
  );
};
