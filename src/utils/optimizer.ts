import {
  BarItem,
  RebarDiameter,
  StockBarPattern,
  OptimizationResult,
  STOCK_BAR_LENGTH,
  CutPiece,
  OptimizationStrategy,
  OffcutItem,
  OptimizerOptions,
} from '../types/bbs';
import { getUnitWeight } from './engineering';

/**
 * 1D cutting-stock optimizer.
 *
 * - Works per diameter only (a 16 mm bar is never used as 20 mm material).
 * - Never touches the source BBS: it reads bars and returns a separate cutting plan.
 * - All packing math is done in integer millimetres to avoid floating-point drift.
 * - Strategies: FFD, BFD, WORST_FIT, and MULTI_START (all of the above plus seeded
 *   randomized restarts, each followed by a bin-elimination local search; the best
 *   plan wins). MULTI_START can never be worse than plain BFD.
 * - Objective (lexicographic): fewest new stock bars, then the largest reusable
 *   offcuts (leftover concentrated in as few bars as possible), which also
 *   minimizes unusable scrap.
 * - Saved offcuts (optional) are consumed before any new stock bar is opened.
 */

const MM = 1000;
const DEFAULT_MIN_REUSABLE = 1.0;

interface Bin {
  capacity: number; // mm
  used: number; // mm
  cuts: CutPiece[];
  source: 'stock' | 'offcut';
  offcutId?: string;
  oversized?: boolean;
}

const toMm = (m: number) => Math.round(m * MM);
const toM = (mm: number) => Number((mm / MM).toFixed(3));

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Placer = 'FF' | 'BF' | 'WF';

function place(bins: Bin[], piece: CutPiece, stockMm: number, placer: Placer): void {
  const len = toMm(piece.length);
  if (len > stockMm) {
    bins.push({ capacity: len, used: len, cuts: [piece], source: 'stock', oversized: true });
    return;
  }
  let idx = -1;
  let metric = placer === 'WF' ? -1 : Infinity;
  for (let i = 0; i < bins.length; i++) {
    const b = bins[i];
    if (b.oversized) continue;
    const rem = b.capacity - b.used;
    if (rem < len) continue;
    if (placer === 'FF') {
      idx = i;
      break;
    }
    if (placer === 'BF' && rem < metric) {
      metric = rem;
      idx = i;
    } else if (placer === 'WF' && rem > metric) {
      metric = rem;
      idx = i;
    }
  }
  if (idx === -1) {
    bins.push({ capacity: stockMm, used: len, cuts: [piece], source: 'stock' });
  } else {
    bins[idx].used += len;
    bins[idx].cuts.push(piece);
  }
}

function cloneBins(bins: Bin[]): Bin[] {
  return bins.map((b) => ({ ...b, cuts: [...b.cuts] }));
}

/** Try to empty the least-filled stock bar into the remaining bars; repeat while it works. */
function eliminateBins(bins: Bin[], stockMm: number): Bin[] {
  let current = bins;
  for (;;) {
    const stockIdx = current
      .map((b, i) => ({ b, i }))
      .filter((x) => x.b.source === 'stock' && !x.b.oversized);
    if (stockIdx.length < 2) return current;
    stockIdx.sort((a, b) => a.b.used - b.b.used);
    const victim = stockIdx[0].i;
    const trial = cloneBins(current);
    const pieces = trial[victim].cuts.slice().sort((a, b) => b.length - a.length);
    trial.splice(victim, 1);
    for (const p of pieces) {
      const len = toMm(p.length);
      let idx = -1;
      let best = Infinity;
      for (let i = 0; i < trial.length; i++) {
        if (trial[i].oversized) continue;
        const rem = trial[i].capacity - trial[i].used;
        if (rem >= len && rem < best) {
          best = rem;
          idx = i;
        }
      }
      if (idx === -1) return current; // cannot eliminate; keep the current plan
      trial[idx].used += len;
      trial[idx].cuts.push(p);
    }
    current = trial;
  }
}

let activeMinReusableMm = toMm(DEFAULT_MIN_REUSABLE);

/** Lexicographic score: [new stock bars (min), usable offcut mm (max), concentration (max)]. */
function score(bins: Bin[]): [number, number, number] {
  const stock = bins.filter((b) => b.source === 'stock' && !b.oversized);
  let usable = 0;
  let concentration = 0;
  stock.forEach((b) => {
    const rem = b.capacity - b.used;
    if (rem >= activeMinReusableMm) usable += rem;
    concentration += (rem / MM) * (rem / MM);
  });
  return [bins.filter((b) => b.source === 'stock').length, usable, concentration];
}

function better(a: Bin[], b: Bin[]): boolean {
  const [a0, a1, a2] = score(a);
  const [b0, b1, b2] = score(b);
  if (a0 !== b0) return a0 < b0;
  if (a1 !== b1) return a1 > b1;
  return a2 > b2 + 1e-9;
}

function seedBins(offcuts: OffcutItem[]): Bin[] {
  return offcuts
    .filter((o) => o.length > 0)
    .sort((a, b) => a.length - b.length)
    .map((o) => ({ capacity: toMm(o.length), used: 0, cuts: [], source: 'offcut' as const, offcutId: o.id }));
}

function runStrategy(
  pieces: CutPiece[],
  stockMm: number,
  strategy: OptimizationStrategy,
  offcuts: OffcutItem[]
): Bin[] {
  const desc = [...pieces].sort((a, b) => b.length - a.length);
  const pack = (order: CutPiece[], placer: Placer) => {
    const bins = seedBins(offcuts);
    order.forEach((p) => place(bins, p, stockMm, placer));
    return bins;
  };

  if (strategy === 'FFD') return pack(desc, 'FF');
  if (strategy === 'BFD') return pack(desc, 'BF');
  if (strategy === 'WORST_FIT') return pack(desc, 'WF');

  // MULTI_START
  let best = eliminateBins(pack(desc, 'BF'), stockMm);
  for (const placer of ['FF', 'WF'] as Placer[]) {
    const cand = eliminateBins(pack(desc, placer), stockMm);
    if (better(cand, best)) best = cand;
  }
  const n = pieces.length;
  const restarts = n <= 300 ? 40 : n <= 1500 ? 8 : n <= 6000 ? 2 : 0;
  const rand = mulberry32(n * 7919 + Math.round(stockMm));
  for (let r = 0; r < restarts; r++) {
    const noisy = pieces
      .map((p) => ({ p, k: p.length * (1 + (rand() - 0.5) * 0.25) }))
      .sort((a, b) => b.k - a.k)
      .map((x) => x.p);
    const cand = eliminateBins(pack(noisy, r % 2 === 0 ? 'BF' : 'FF'), stockMm);
    if (better(cand, best)) best = cand;
  }
  return best;
}

function collectPieces(bars: BarItem[], diameter: RebarDiameter): CutPiece[] {
  const cutPieces: CutPiece[] = [];
  bars
    .filter((b) => b.diameter === diameter && b.cuttingLength > 0 && b.totalBars > 0)
    .forEach((bar) => {
      for (let i = 0; i < bar.totalBars; i++) {
        cutPieces.push({
          barItemId: bar.id,
          barMark: bar.barMark,
          diameter: bar.diameter,
          length: Number(bar.cuttingLength.toFixed(3)),
        });
      }
    });
  return cutPieces;
}

export function optimizeCuttingStock(
  bars: BarItem[],
  diameter: RebarDiameter,
  stockLength: number = STOCK_BAR_LENGTH,
  options: OptimizerOptions = {}
): OptimizationResult {
  const strategy: OptimizationStrategy = options.strategy ?? 'MULTI_START';
  const minReusable = options.minReusableOffcut ?? DEFAULT_MIN_REUSABLE;
  const offcuts = (options.offcuts ?? []).filter((o) => o.diameter === diameter);
  const stockMm = toMm(stockLength);
  activeMinReusableMm = toMm(minReusable);
  const cutPieces = collectPieces(bars, diameter);

  if (cutPieces.length === 0) {
    return {
      diameter,
      requiredCutsCount: 0,
      totalCutLengthMeters: 0,
      stockBarsNeeded: 0,
      totalStockLengthMeters: 0,
      totalUsedLengthMeters: 0,
      totalScrapMeters: 0,
      usableScrapMeters: 0,
      unrecoverableScrapMeters: 0,
      overallEfficiencyPercent: 100,
      patterns: [],
      strategy,
      stockLength,
      offcutsConsumed: 0,
      reusedOffcutLengthMeters: 0,
      baselineStockBars: 0,
      theoreticalMinBars: 0,
    };
  }

  const bins = runStrategy(cutPieces, stockMm, strategy, offcuts).filter((b) => b.cuts.length > 0);

  // Baseline: first-fit in schedule order, no sorting, no offcuts (how it is cut without planning).
  const baselineBins: Bin[] = [];
  cutPieces.forEach((p) => place(baselineBins, p, stockMm, 'FF'));

  const stockBins = bins.filter((b) => b.source === 'stock');
  const offcutBins = bins.filter((b) => b.source === 'offcut');
  const ordered = [...stockBins, ...offcutBins];

  const patterns: StockBarPattern[] = ordered.map((b, i) => {
    const used = toM(b.used);
    const total = toM(b.capacity);
    const offCut = toM(Math.max(0, b.capacity - b.used));
    return {
      barIndex: i + 1,
      diameter,
      totalStockLength: total,
      cuts: b.cuts,
      usedLength: used,
      offCutLength: offCut,
      isScrapUsable: offCut >= minReusable,
      efficiencyPercent: total > 0 ? Number(((used / total) * 100).toFixed(1)) : 100,
      source: b.source,
      offcutId: b.offcutId,
    };
  });

  const stockPatterns = patterns.filter((p) => p.source === 'stock');
  const offcutPatterns = patterns.filter((p) => p.source === 'offcut');

  const totalCutLengthMeters = Number(cutPieces.reduce((acc, c) => acc + c.length, 0).toFixed(3));
  const totalStockLengthMeters = Number(stockPatterns.reduce((a, p) => a + p.totalStockLength, 0).toFixed(3));
  const totalUsedLengthMeters = Number(stockPatterns.reduce((a, p) => a + p.usedLength, 0).toFixed(3));
  const totalScrapMeters = Number(Math.max(0, totalStockLengthMeters - totalUsedLengthMeters).toFixed(3));

  let usableScrapMeters = 0;
  let unrecoverableScrapMeters = 0;
  stockPatterns.forEach((p) => {
    if (p.offCutLength >= minReusable) usableScrapMeters += p.offCutLength;
    else unrecoverableScrapMeters += p.offCutLength;
  });

  return {
    diameter,
    requiredCutsCount: cutPieces.length,
    totalCutLengthMeters,
    stockBarsNeeded: stockPatterns.length,
    totalStockLengthMeters,
    totalUsedLengthMeters,
    totalScrapMeters,
    usableScrapMeters: Number(usableScrapMeters.toFixed(3)),
    unrecoverableScrapMeters: Number(unrecoverableScrapMeters.toFixed(3)),
    overallEfficiencyPercent:
      totalStockLengthMeters > 0 ? Number(((totalUsedLengthMeters / totalStockLengthMeters) * 100).toFixed(2)) : 100,
    patterns,
    strategy,
    stockLength,
    offcutsConsumed: offcutPatterns.length,
    reusedOffcutLengthMeters: Number(offcutPatterns.reduce((a, p) => a + p.usedLength, 0).toFixed(3)),
    baselineStockBars: baselineBins.length,
    theoreticalMinBars: Math.ceil(totalCutLengthMeters / stockLength - 1e-9),
  };
}

/**
 * Runs cutting stock optimization across ALL diameters present in the schedule
 */
export function optimizeAllDiameters(
  bars: BarItem[],
  stockLength: number = STOCK_BAR_LENGTH,
  options: OptimizerOptions = {}
): Map<RebarDiameter, OptimizationResult> {
  const map = new Map<RebarDiameter, OptimizationResult>();
  const presentDiameters = Array.from(new Set(bars.map((b) => b.diameter))).sort((a, b) => a - b);
  presentDiameters.forEach((dia) => {
    const res = optimizeCuttingStock(bars, dia, stockLength, options);
    if (res.requiredCutsCount > 0) map.set(dia, res);
  });
  return map;
}

/** Runs every strategy on one diameter so the user can compare them side by side. */
export function compareStrategies(
  bars: BarItem[],
  diameter: RebarDiameter,
  stockLength: number = STOCK_BAR_LENGTH,
  options: Omit<OptimizerOptions, 'strategy'> = {}
): { strategy: OptimizationStrategy; stockBars: number; efficiency: number; usableScrap: number }[] {
  const list: OptimizationStrategy[] = ['FFD', 'BFD', 'WORST_FIT', 'MULTI_START'];
  return list.map((strategy) => {
    const r = optimizeCuttingStock(bars, diameter, stockLength, { ...options, strategy });
    return { strategy, stockBars: r.stockBarsNeeded, efficiency: r.overallEfficiencyPercent, usableScrap: r.usableScrapMeters };
  });
}

/** Leftovers from a plan that are long enough to be saved into the offcut inventory. */
export function extractReusableOffcuts(result: OptimizationResult, minLength = DEFAULT_MIN_REUSABLE): OffcutItem[] {
  return result.patterns
    .filter((p) => p.offCutLength >= minLength)
    .map((p) => ({
      id: `OC-${p.diameter}-${p.source === 'offcut' ? p.offcutId + 'r' : 'B' + p.barIndex}-${Math.round(p.offCutLength * 1000)}`,
      diameter: p.diameter,
      length: p.offCutLength,
      source: p.source === 'offcut' ? `offcut ${p.offcutId}` : `stock bar #${p.barIndex}`,
    }));
}

/**
 * Computes steel procurement abstract summary by diameter
 */
export function computeSteelAbstract(
  bars: BarItem[],
  wastagePercent: number = 3.5
) {
  const diaMap = new Map<RebarDiameter, { totalLength: number; count: number }>();

  bars.forEach((bar) => {
    if (bar.totalLength > 0) {
      const prev = diaMap.get(bar.diameter) || { totalLength: 0, count: 0 };
      diaMap.set(bar.diameter, {
        totalLength: prev.totalLength + bar.totalLength,
        count: prev.count + bar.totalBars,
      });
    }
  });

  const items = Array.from(diaMap.entries())
    .map(([dia, data]) => {
      const unitWeight = getUnitWeight(dia);
      const netWeightKg = Number((data.totalLength * unitWeight).toFixed(2));
      const netWeightMT = Number((netWeightKg / 1000).toFixed(3));
      const wastageWeightKg = Number((netWeightKg * (wastagePercent / 100)).toFixed(2));
      const grossWeightKg = Number((netWeightKg + wastageWeightKg).toFixed(2));
      const grossWeightMT = Number((grossWeightKg / 1000).toFixed(3));

      // Commercial 12m stock bars theoretically needed with wastage
      const grossLength = data.totalLength * (1 + wastagePercent / 100);
      const stockBars12mNeeded = Math.ceil(grossLength / STOCK_BAR_LENGTH);
      const purchasedWeightKg = Number((stockBars12mNeeded * STOCK_BAR_LENGTH * unitWeight).toFixed(2));

      return {
        diameter: dia,
        unitWeight,
        totalLengthMeters: Number(data.totalLength.toFixed(3)),
        netWeightKg,
        netWeightMT,
        wastageWeightKg,
        grossWeightKg,
        grossWeightMT,
        stockBars12mNeeded,
        purchasedWeightKg,
      };
    })
    .sort((a, b) => a.diameter - b.diameter);

  const totalNetWeightKg = Number(items.reduce((s, i) => s + i.netWeightKg, 0).toFixed(2));
  const totalNetWeightMT = Number((totalNetWeightKg / 1000).toFixed(3));
  const totalGrossWeightKg = Number(items.reduce((s, i) => s + i.grossWeightKg, 0).toFixed(2));
  const totalGrossWeightMT = Number((totalGrossWeightKg / 1000).toFixed(3));
  const totalStock12mBars = items.reduce((s, i) => s + i.stockBars12mNeeded, 0);

  return {
    items,
    totalNetWeightKg,
    totalNetWeightMT,
    totalGrossWeightKg,
    totalGrossWeightMT,
    totalStock12mBars,
  };
}
