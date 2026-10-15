import React, { useEffect, useMemo, useState } from 'react';
import { BarItem, RebarDiameter, OffcutItem, OptimizationStrategy, OptimizationResult, STOCK_BAR_LENGTH } from '../types/bbs';
import { optimizeAllDiameters, compareStrategies, extractReusableOffcuts } from '../utils/optimizer';
import { getUnitWeight } from '../utils/engineering';
import { Scissors, Layers, Percent, Package, Recycle, Trash2, Plus, Save, Trophy } from 'lucide-react';

interface CuttingOptimizerProps {
  bars: BarItem[];
}

const STOCK_PRESETS = [6, 9, 10, 12];
const STRATEGIES: { value: OptimizationStrategy; label: string; hint: string }[] = [
  { value: 'MULTI_START', label: 'Multi-start + local search (best)', hint: 'Tries FFD/BFD/Worst-fit plus seeded randomized restarts, then eliminates under-filled bars. Never worse than BFD.' },
  { value: 'BFD', label: 'Best Fit Decreasing', hint: 'Places each piece (longest first) in the bar it fits most tightly.' },
  { value: 'FFD', label: 'First Fit Decreasing', hint: 'Places each piece (longest first) in the first bar with room.' },
  { value: 'WORST_FIT', label: 'Worst Fit Decreasing', hint: 'Places each piece in the bar with the most room — spreads leftovers.' },
];
const INVENTORY_KEY = 'rebar-pro-offcut-inventory-v1';
const PALETTE = [
  'bg-cyan-600 hover:bg-cyan-500',
  'bg-teal-600 hover:bg-teal-500',
  'bg-indigo-600 hover:bg-indigo-500',
  'bg-sky-600 hover:bg-sky-500',
  'bg-emerald-600 hover:bg-emerald-500',
];

const card = 'bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-xl';
const field =
  'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500';

function loadInventory(): OffcutItem[] {
  try {
    const raw = localStorage.getItem(INVENTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const CuttingOptimizer: React.FC<CuttingOptimizerProps> = ({ bars }) => {
  const [stockLength, setStockLength] = useState<number>(STOCK_BAR_LENGTH);
  const [strategy, setStrategy] = useState<OptimizationStrategy>('MULTI_START');
  const [minReusable, setMinReusable] = useState<number>(1.0);
  const [useOffcuts, setUseOffcuts] = useState<boolean>(false);
  const [inventory, setInventory] = useState<OffcutItem[]>(loadInventory);
  const [structureFilter, setStructureFilter] = useState<string>('ALL');
  const [selectedDia, setSelectedDia] = useState<RebarDiameter | null>(null);
  const [newOffcutDia, setNewOffcutDia] = useState<number>(16);
  const [newOffcutLen, setNewOffcutLen] = useState<number>(2.0);

  useEffect(() => {
    try {
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
    } catch {
      /* storage full/unavailable — inventory simply won't persist */
    }
  }, [inventory]);

  const structures = useMemo(
    () => Array.from(new Set(bars.map((b) => b.structureName || 'Main Structure'))).sort(),
    [bars]
  );
  const filteredBars = useMemo(
    () => (structureFilter === 'ALL' ? bars : bars.filter((b) => (b.structureName || 'Main Structure') === structureFilter)),
    [bars, structureFilter]
  );

  const safeStock = Number.isFinite(stockLength) && stockLength >= 1 ? stockLength : STOCK_BAR_LENGTH;
  const safeMin = Number.isFinite(minReusable) && minReusable > 0 ? minReusable : 1.0;

  const results = useMemo(
    () =>
      optimizeAllDiameters(filteredBars, safeStock, {
        strategy,
        minReusableOffcut: safeMin,
        offcuts: useOffcuts ? inventory : [],
      }),
    [filteredBars, safeStock, strategy, safeMin, useOffcuts, inventory]
  );

  const diameters: RebarDiameter[] = Array.from(results.keys());
  const currentDia: RebarDiameter | null =
    selectedDia && results.has(selectedDia) ? selectedDia : diameters[0] ?? null;
  const optResult: OptimizationResult | null = currentDia ? results.get(currentDia) ?? null : null;

  const comparison = useMemo(
    () =>
      currentDia
        ? compareStrategies(filteredBars, currentDia, safeStock, { minReusableOffcut: safeMin, offcuts: useOffcuts ? inventory : [] })
        : [],
    [filteredBars, currentDia, safeStock, safeMin, useOffcuts, inventory]
  );

  // Dashboard totals across every diameter in the current filter
  const totals = useMemo(() => {
    let stockBars = 0, purchasedM = 0, cutM = 0, scrapM = 0, usableM = 0, purchaseKg = 0, netKg = 0, baseBars = 0, baseKg = 0, offcutsUsed = 0;
    results.forEach((r, dia) => {
      const w = getUnitWeight(dia);
      stockBars += r.stockBarsNeeded;
      purchasedM += r.totalStockLengthMeters;
      cutM += r.totalCutLengthMeters;
      scrapM += r.totalScrapMeters;
      usableM += r.usableScrapMeters;
      purchaseKg += r.totalStockLengthMeters * w;
      netKg += r.totalCutLengthMeters * w;
      baseBars += r.baselineStockBars ?? r.stockBarsNeeded;
      baseKg += (r.baselineStockBars ?? r.stockBarsNeeded) * safeStock * w;
      offcutsUsed += r.offcutsConsumed ?? 0;
    });
    const wasteM = Math.max(0, scrapM - usableM);
    return {
      stockBars, purchasedM, cutM, scrapM, usableM, wasteM, purchaseKg, netKg, offcutsUsed,
      efficiency: purchasedM > 0 ? ((purchasedM - scrapM) / purchasedM) * 100 : 100,
      wastePct: purchasedM > 0 ? (wasteM / purchasedM) * 100 : 0,
      savedBars: Math.max(0, baseBars - stockBars),
      savedKg: Math.max(0, baseKg - purchaseKg),
    };
  }, [results, safeStock]);

  const commitToInventory = () => {
    const consumed = new Set<string>();
    const fresh: OffcutItem[] = [];
    results.forEach((r) => {
      r.patterns.forEach((p) => p.source === 'offcut' && p.offcutId && consumed.add(p.offcutId));
      fresh.push(...extractReusableOffcuts(r, safeMin));
    });
    setInventory((prev) => {
      const kept = prev.filter((o) => !consumed.has(o.id));
      const ids = new Set(kept.map((o) => o.id));
      return [...kept, ...fresh.filter((o) => !ids.has(o.id))];
    });
  };

  if (bars.length === 0) {
    return (
      <div className="bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
        <Package className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No Rebar Data Available</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          Add rebar marks to the schedule or generate structural members using the Wizard to run 1D cutting optimization.
        </p>
      </div>
    );
  }

  const unitWt = currentDia ? getUnitWeight(currentDia) : 0;
  const strategyHint = STRATEGIES.find((s) => s.value === strategy)?.hint;
  const inventoryForDia = inventory.filter((o) => currentDia === null || o.diameter === currentDia);

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className={`${card} p-4 space-y-3`}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-lg">
            <Scissors className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">1D Cutting-Stock Optimizer</h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Read-only planner — never changes your BBS quantities or cutting lengths
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-4 text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-slate-600 dark:text-slate-400">Stock length (m)</span>
            <div className="flex items-center gap-1">
              {STOCK_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setStockLength(p)}
                  className={`px-2 py-1 rounded-md font-mono cursor-pointer ${
                    safeStock === p ? 'bg-cyan-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 hover:dark:bg-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))}
              <input type="number" min="1" step="0.5" value={stockLength} onChange={(e) => setStockLength(parseFloat(e.target.value))} className={`${field} w-20`} title="Custom stock length" />
            </div>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-600 dark:text-slate-400">Strategy</span>
            <select value={strategy} onChange={(e) => setStrategy(e.target.value as OptimizationStrategy)} className={field} title={strategyHint}>
              {STRATEGIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-600 dark:text-slate-400">Min reusable offcut (m)</span>
            <input type="number" min="0.1" step="0.1" value={minReusable} onChange={(e) => setMinReusable(parseFloat(e.target.value))} className={`${field} w-24`} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-600 dark:text-slate-400">Structure</span>
            <select value={structureFilter} onChange={(e) => setStructureFilter(e.target.value)} className={field}>
              <option value="ALL">All structures</option>
              {structures.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 pb-1 cursor-pointer text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={useOffcuts} onChange={(e) => setUseOffcuts(e.target.checked)} className="accent-cyan-500" />
            <Recycle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Use offcut inventory ({inventory.length})
          </label>
        </div>
        {strategyHint && <p className="text-[11px] text-slate-500 dark:text-slate-400">{strategyHint} Objective: fewest new stock bars → largest reusable offcuts → least scrap. Diameters are never mixed.</p>}
      </div>

      {results.size === 0 || !optResult || currentDia === null ? (
        <div className={`${card} p-8 text-center text-xs text-slate-600 dark:text-slate-400`}>No cut pieces for the current filter.</div>
      ) : (
        <>
          {/* Dashboard */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'New stock bars', value: `${totals.stockBars}`, sub: `${totals.purchasedM.toFixed(1)} m purchased`, icon: <Layers className="w-3.5 h-3.5 text-cyan-500" />, color: 'text-cyan-600 dark:text-cyan-300' },
              { label: 'Efficiency', value: `${totals.efficiency.toFixed(1)}%`, sub: `${totals.cutM.toFixed(2)} m cut`, icon: <Percent className="w-3.5 h-3.5 text-emerald-500" />, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: `Reusable offcut (≥${safeMin}m)`, value: `${totals.usableM.toFixed(2)} m`, sub: `Waste ${totals.wasteM.toFixed(2)} m (${totals.wastePct.toFixed(1)}%)`, icon: <Recycle className="w-3.5 h-3.5 text-blue-500" />, color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Purchase weight', value: `${(totals.purchaseKg / 1000).toFixed(3)} MT`, sub: `Net ${(totals.netKg / 1000).toFixed(3)} MT`, icon: <Package className="w-3.5 h-3.5 text-purple-500" />, color: 'text-purple-600 dark:text-purple-300' },
              { label: 'Saved vs unplanned cutting', value: `${totals.savedBars} bars`, sub: `${totals.savedKg.toFixed(0)} kg · ${totals.offcutsUsed} offcuts reused`, icon: <Trophy className="w-3.5 h-3.5 text-amber-500" />, color: 'text-amber-600 dark:text-amber-400' },
            ].map((k) => (
              <div key={k.label} className={`${card} p-3.5`}>
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400"><span>{k.label}</span>{k.icon}</div>
                <div className={`mt-2 text-xl font-bold font-mono ${k.color}`}>{k.value}</div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">{k.sub}</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-2">
            “Unplanned” = first-fit in schedule order with no sorting or offcut reuse. Figures cover {structureFilter === 'ALL' ? 'all structures' : structureFilter}.
          </p>

          {/* Per-diameter table */}
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-left text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  {['Dia', 'Cuts', 'Cut length (m)', 'Stock bars', 'Lower bound', 'Efficiency', 'Reusable (m)', 'Waste (m)', 'Purchase (kg)'].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {diameters.map((d) => {
                  const r = results.get(d)!;
                  const active = d === currentDia;
                  return (
                    <tr key={d} onClick={() => setSelectedDia(d)} className={`cursor-pointer border-b border-slate-100 dark:border-slate-900 ${active ? 'bg-cyan-500/10' : 'hover:bg-slate-100 hover:dark:bg-slate-900'} text-slate-800 dark:text-slate-200`}>
                      <td className="px-3 py-1.5 font-bold text-cyan-600 dark:text-cyan-400">T{d}</td>
                      <td className="px-3 py-1.5">{r.requiredCutsCount}</td>
                      <td className="px-3 py-1.5">{r.totalCutLengthMeters.toFixed(2)}</td>
                      <td className="px-3 py-1.5">{r.stockBarsNeeded}</td>
                      <td className="px-3 py-1.5">{r.theoreticalMinBars}</td>
                      <td className="px-3 py-1.5">{r.overallEfficiencyPercent}%</td>
                      <td className="px-3 py-1.5">{r.usableScrapMeters.toFixed(2)}</td>
                      <td className="px-3 py-1.5">{r.unrecoverableScrapMeters.toFixed(2)}</td>
                      <td className="px-3 py-1.5">{(r.totalStockLengthMeters * getUnitWeight(d)).toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Strategy comparison */}
          <div className={`${card} p-3 flex flex-wrap items-center gap-3 text-[11px]`}>
            <span className="font-semibold text-slate-700 dark:text-slate-300">T{currentDia} strategy comparison:</span>
            {comparison.map((c) => (
              <span key={c.strategy} className={`px-2 py-1 rounded-md font-mono ${c.strategy === strategy ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                {c.strategy.replace('_', ' ')}: {c.stockBars} bars · {c.efficiency}% · {c.usableScrap.toFixed(2)}m reusable
              </span>
            ))}
          </div>

          {/* Diameter selector + pattern visualizer */}
          <div className={`${card} p-5 space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Cutting layouts — T{currentDia} mm · {optResult.stockBarsNeeded} new bars of {safeStock} m
                  {optResult.offcutsConsumed ? ` + ${optResult.offcutsConsumed} saved offcuts` : ''}
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">Each cut lists its bar mark, so every piece traces back to the schedule. Unit weight {unitWt} kg/m.</p>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
                {diameters.map((dia) => (
                  <button key={dia} onClick={() => setSelectedDia(dia)} className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-md whitespace-nowrap cursor-pointer ${currentDia === dia ? 'bg-cyan-500 text-slate-950' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 hover:dark:bg-slate-800'}`}>
                    T{dia}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-xs bg-cyan-600" />Cut piece</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-xs bg-blue-400/60" />Reusable offcut</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-xs bg-rose-400/60" />Waste</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-xs bg-emerald-600" />From saved offcut</span>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {optResult.patterns.map((pat) => (
                <div key={pat.barIndex} className="bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 rounded-lg p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">
                        {pat.source === 'offcut' ? `Offcut ${pat.offcutId}` : `Stock bar #${pat.barIndex}`}
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-700 dark:text-slate-300">Ø{pat.diameter} — {pat.totalStockLength.toFixed(3)} m</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-600 dark:text-slate-400">{pat.cuts.length} cuts</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-slate-700 dark:text-slate-300">Used <strong className="text-slate-900 dark:text-white">{pat.usedLength.toFixed(3)} m</strong> ({pat.efficiencyPercent}%)</span>
                      <span className={pat.isScrapUsable ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}>
                        Remaining {pat.offCutLength.toFixed(3)} m {pat.offCutLength > 0 ? (pat.isScrapUsable ? '(reusable)' : '(waste)') : ''}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-8 bg-white dark:bg-slate-950 rounded flex overflow-hidden border border-slate-200 dark:border-slate-800">
                    {pat.cuts.map((cut, i) => (
                      <div
                        key={i}
                        style={{ width: `${(cut.length / pat.totalStockLength) * 100}%` }}
                        className={`h-full ${pat.source === 'offcut' ? 'bg-emerald-600 hover:bg-emerald-500' : PALETTE[i % PALETTE.length]} border-r border-white/40 dark:border-slate-900 flex items-center justify-center transition-colors`}
                        title={`${cut.barMark}: ${cut.length.toFixed(3)} m`}
                      >
                        <span className="text-[10px] font-mono font-bold text-white truncate px-1">{cut.barMark} ({cut.length.toFixed(2)})</span>
                      </div>
                    ))}
                    {pat.offCutLength > 0 && (
                      <div
                        style={{ width: `${(pat.offCutLength / pat.totalStockLength) * 100}%` }}
                        className={`h-full flex items-center justify-center text-[10px] font-mono ${pat.isScrapUsable ? 'bg-blue-200 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' : 'bg-rose-200 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'}`}
                        title={`Remaining ${pat.offCutLength.toFixed(3)} m`}
                      >
                        <span className="truncate px-1">{pat.offCutLength.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                    Cut sequence: {pat.cuts.map((c) => `${c.barMark} ${c.length.toFixed(3)}`).join(' → ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Offcut inventory */}
      <div className={`${card} p-4 space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Recycle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Reusable offcut inventory</h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">stored in this browser · same diameter only</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={commitToInventory} disabled={results.size === 0} title="Remove offcuts this plan consumed and add its new reusable leftovers" className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 cursor-pointer">
              <Save className="w-3.5 h-3.5" /> Commit plan to inventory
            </button>
            {inventory.length > 0 && (
              <button type="button" onClick={() => confirm('Clear the entire offcut inventory?') && setInventory([])} className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-rose-600 cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2 text-xs">
          <label className="flex flex-col gap-1"><span className="text-slate-600 dark:text-slate-400">Dia (mm)</span>
            <input type="number" value={newOffcutDia} onChange={(e) => setNewOffcutDia(parseInt(e.target.value) || 0)} className={`${field} w-20`} /></label>
          <label className="flex flex-col gap-1"><span className="text-slate-600 dark:text-slate-400">Length (m)</span>
            <input type="number" step="0.05" value={newOffcutLen} onChange={(e) => setNewOffcutLen(parseFloat(e.target.value) || 0)} className={`${field} w-24`} /></label>
          <button
            type="button"
            onClick={() => {
              if (newOffcutDia > 0 && newOffcutLen > 0) {
                setInventory((prev) => [...prev, { id: `MAN-${Date.now().toString(36)}`, diameter: newOffcutDia as RebarDiameter, length: Number(newOffcutLen.toFixed(3)), source: 'manual entry' }]);
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 cursor-pointer"
          ><Plus className="w-3.5 h-3.5" /> Add offcut</button>
        </div>

        {inventory.length === 0 ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">No saved offcuts yet. Run a plan and press “Commit plan to inventory”, or add pieces manually.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(inventoryForDia.length ? inventoryForDia : inventory).map((o) => (
              <span key={o.id} className="flex items-center gap-2 px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-800 text-[11px] font-mono text-slate-800 dark:text-slate-200" title={`${o.id} — ${o.source ?? ''}`}>
                Ø{o.diameter} · {o.length.toFixed(3)} m
                <button type="button" onClick={() => setInventory((prev) => prev.filter((x) => x.id !== o.id))} className="text-slate-500 hover:text-rose-600 cursor-pointer" aria-label="Remove offcut"><Trash2 className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
