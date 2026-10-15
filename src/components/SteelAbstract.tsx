import React from 'react';
import { BarItem, ProjectMetadata } from '../types/bbs';
import { computeSteelAbstract } from '../utils/optimizer';
import { estimateBindingWireKg } from '../utils/engineering';
import { FileSpreadsheet, Anchor, Percent, Scale, TrendingUp } from 'lucide-react';

interface SteelAbstractProps {
  bars: BarItem[];
  metadata: ProjectMetadata;
  onUpdateMetadata: (updates: Partial<ProjectMetadata>) => void;
}

export const SteelAbstract: React.FC<SteelAbstractProps> = ({
  bars,
  metadata,
  onUpdateMetadata,
}) => {
  const abstract = computeSteelAbstract(bars, metadata.wastagePercent);
  const bindingWireTotalKg = estimateBindingWireKg(abstract.totalGrossWeightKg, metadata.bindingWireRateKgPerMT);

  // Maximum weight for proportional bar widths
  const maxWeightKg = Math.max(...abstract.items.map((i) => i.netWeightKg), 1);

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Modifiers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Diameter-Wise Steel Procurement Abstract</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Rebar tonnage breakdown, rolling margins, site cutting wastage modifiers, and binding wire estimation.
          </p>
        </div>

        {/* Modifiers */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-100 dark:bg-slate-900/90 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-cyan-400" />
              Wastage Allowance:
            </span>
            <input
              type="number"
              step="0.5"
              min="0"
              max="15"
              value={metadata.wastagePercent}
              onChange={(e) => onUpdateMetadata({ wastagePercent: Math.max(0, parseFloat(e.target.value) || 0) })}
              className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200 font-mono text-right focus:outline-none focus:border-cyan-500"
            />
            <span className="text-slate-600 dark:text-slate-400 font-mono">%</span>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Anchor className="w-3.5 h-3.5 text-amber-400" />
              Binding Wire Rate:
            </span>
            <input
              type="number"
              step="0.5"
              min="5"
              max="20"
              value={metadata.bindingWireRateKgPerMT}
              onChange={(e) => onUpdateMetadata({ bindingWireRateKgPerMT: Math.max(0, parseFloat(e.target.value) || 0) })}
              className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200 font-mono text-right focus:outline-none focus:border-cyan-500"
            />
            <span className="text-slate-600 dark:text-slate-400 font-mono">kg/MT</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Net Steel Weight</span>
            <Scale className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-cyan-300">
              {abstract.totalNetWeightMT.toFixed(3)}
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400 ml-1">MT</span>
            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5">
              {abstract.totalNetWeightKg.toLocaleString()} kg (Theoretical)
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Gross Steel with Wastage</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {abstract.totalGrossWeightMT.toFixed(3)}
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400 ml-1">MT</span>
            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5">
              {abstract.totalGrossWeightKg.toLocaleString()} kg (+{metadata.wastagePercent}% allowance)
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Commercial 12m Bars</span>
            <span className="font-mono text-xs text-purple-400">12.0m</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-purple-300">
              {abstract.totalStock12mBars}
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400 ml-1">standard mill rebars</span>
            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5">
              Standard commercial supply length
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Estimated Binding Wire</span>
            <Anchor className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-amber-400">
              {bindingWireTotalKg.toFixed(1)}
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400 ml-1">kg</span>
            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5">
              18-gauge GI annealed wire (@ {metadata.bindingWireRateKgPerMT} kg/MT)
            </div>
          </div>
        </div>
      </div>

      {/* Abstract Table */}
      <div className="bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100 dark:bg-slate-900/60">
          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Rebar Procurement Schedule by Diameter
          </h4>
          <span className="text-xs text-slate-600 dark:text-slate-400">IS 1786 / SP 34 / BS 4449</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Diameter</th>
                <th className="py-2.5 px-3 text-right">Unit Wt (kg/m)</th>
                <th className="py-2.5 px-3 text-right">Running Length (m)</th>
                <th className="py-2.5 px-3 text-right">Net Weight (kg)</th>
                <th className="py-2.5 px-3 text-right">Net Weight (MT)</th>
                <th className="py-2.5 px-3 text-right">Wastage ({metadata.wastagePercent}%)</th>
                <th className="py-2.5 px-3 text-right">Gross Weight (kg)</th>
                <th className="py-2.5 px-3 text-right font-bold text-emerald-400">Gross (MT)</th>
                <th className="py-2.5 px-4 text-right font-bold text-cyan-400">12m Rebars (Nos)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono text-[12px]">
              {abstract.items.map((item) => (
                <tr key={item.diameter} className="hover:bg-slate-100 hover:dark:bg-slate-900/50 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">T{item.diameter} mm</td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">{item.unitWeight.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">{item.totalLengthMeters.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">{item.netWeightKg.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">{item.netWeightMT.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right text-amber-400/80">+{item.wastageWeightKg.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-800 dark:text-slate-200">{item.grossWeightKg.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">{item.grossWeightMT.toFixed(3)}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-cyan-400">{item.stockBars12mNeeded}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 dark:bg-slate-900/90 font-mono text-xs font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
              <tr>
                <td className="py-3 px-4">TOTALS</td>
                <td className="py-3 px-3 text-right">-</td>
                <td className="py-3 px-3 text-right">
                  {abstract.items.reduce((s, i) => s + i.totalLengthMeters, 0).toFixed(2)} m
                </td>
                <td className="py-3 px-3 text-right text-cyan-300">{abstract.totalNetWeightKg.toLocaleString()} kg</td>
                <td className="py-3 px-3 text-right text-cyan-300">{abstract.totalNetWeightMT.toFixed(3)} MT</td>
                <td className="py-3 px-3 text-right text-amber-400">
                  +{(abstract.totalGrossWeightKg - abstract.totalNetWeightKg).toFixed(1)} kg
                </td>
                <td className="py-3 px-3 text-right text-emerald-400">{abstract.totalGrossWeightKg.toLocaleString()} kg</td>
                <td className="py-3 px-3 text-right text-emerald-400">{abstract.totalGrossWeightMT.toFixed(3)} MT</td>
                <td className="py-3 px-4 text-right text-cyan-400">{abstract.totalStock12mBars} nos</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Visual Weight Distribution Bars */}
      <div className="bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
        <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Diameter Steel Weight Distribution (Proportional Breakdown)
        </h4>
        <div className="space-y-2 pt-1">
          {abstract.items.map((item) => {
            const pct = (item.netWeightKg / maxWeightKg) * 100;
            const overallSharePct = ((item.netWeightKg / (abstract.totalNetWeightKg || 1)) * 100).toFixed(1);

            return (
              <div key={item.diameter} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">T{item.diameter} mm</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {item.netWeightKg.toLocaleString()} kg ({overallSharePct}% of total steel)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                  <div
                    style={{ width: `${pct}%` }}
                    className="h-full bg-linear-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-300"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
