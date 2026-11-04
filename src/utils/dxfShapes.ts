import { BarItem } from '../types/bbs';
import { SHAPE_LIBRARY } from './shapes';
import { getSeismicHookExtensionMeters } from './engineering';
import { buildCustomShapeGeometry } from './rebarGeometry';

export type Pt = [number, number];

export interface DimSpec {
  p1: Pt;
  p2: Pt;
  label: string;
  /** Preferred outward direction of the dimension line; auto-chosen (away from the sketch centre) when omitted. */
  side?: Pt;
}

export interface BarSketch {
  /** True-size geometry in mm. */
  paths: Pt[][];
  circle?: { c: Pt; r: number };
  dims: DimSpec[];
  notes: string[];
}

const fin = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) ? n : 0);
const mm = (m: number) => Math.round(m * 1000);

export function buildBarSketch(bar: BarItem): BarSketch {
  const def = SHAPE_LIBRARY[bar.shapeCode] ?? SHAPE_LIBRARY['00'];
  const dia = fin(bar.diameter) || 12;
  const given = (v: number | undefined) => fin(v) > 0;
  const dimsRaw: Record<string, number | undefined> = {
    A: bar.dimA, B: bar.dimB, C: bar.dimC, D: bar.dimD, E: bar.dimE,
  };
  const missing: string[] = [];
  // Missing dimensions fall back to the shape defaults for drawing only and are labelled n/a.
  const d = (k: 'A' | 'B' | 'C' | 'D' | 'E', optional = false): number => {
    const v = dimsRaw[k];
    if (given(v)) return mm(v as number);
    if (optional) return 0;
    missing.push(k);
    return mm(def.defaultDimensions[k] ?? 0.3);
  };
  const lab = (k: string, v: number) => `${k}=${missing.includes(k) ? 'n/a' : v}`;
  const notes: string[] = [];
  let s: BarSketch;

  switch (bar.shapeCode) {
    case '11': {
      const A = d('A'), B = d('B');
      s = { paths: [[[0, 0], [A, 0], [A, B]]], dims: [
        { p1: [0, 0], p2: [A, 0], label: lab('A', A), side: [0, -1] },
        { p1: [A, 0], p2: [A, B], label: lab('B', B), side: [1, 0] },
      ], notes };
      break;
    }
    case '21': {
      const A = d('A'), B = d('B'), C = d('C');
      s = { paths: [[[0, A], [0, 0], [B, 0], [B, C]]], dims: [
        { p1: [0, 0], p2: [0, A], label: lab('A', A), side: [-1, 0] },
        { p1: [0, 0], p2: [B, 0], label: lab('B', B), side: [0, -1] },
        { p1: [B, 0], p2: [B, C], label: lab('C', C), side: [1, 0] },
      ], notes };
      break;
    }
    case '71': {
      const A = d('A'), B = d('B'), C = d('C');
      s = { paths: [[[0, -A], [0, 0], [B, 0], [B, -C]]], dims: [
        { p1: [0, 0], p2: [0, -A], label: lab('A', A), side: [-1, 0] },
        { p1: [0, 0], p2: [B, 0], label: lab('B', B), side: [0, 1] },
        { p1: [B, 0], p2: [B, -C], label: lab('C', C), side: [1, 0] },
      ], notes };
      break;
    }
    case '51': {
      const A = d('A'), B = d('B');
      const e = mm(getSeismicHookExtensionMeters(dia));
      const k = Math.min(e * Math.SQRT1_2, A / 2, B / 3);
      const g = Math.min(e * 0.5, B / 3);
      s = { paths: [[[k, B - k], [0, B], [A, B], [A, 0], [0, 0], [0, B - g], [k, B - g - k]]], dims: [
        { p1: [0, 0], p2: [A, 0], label: lab('A', A), side: [0, -1] },
        { p1: [0, 0], p2: [0, B], label: lab('B', B), side: [-1, 0] },
      ], notes };
      notes.push(`135deg hooks, ext ${e}`);
      break;
    }
    case '41': {
      const A = d('A'), B = d('B'), C = d('C');
      const D = d('D', true) || B;
      const E = d('E', true);
      const pts: Pt[] = [[0, 0], [A, 0], [A + B, B], [A + B + C, B], [A + B + C + D, B - D]];
      if (E > 0) pts.push([A + B + C + D + E, B - D]);
      s = { paths: [pts], dims: [
        { p1: [0, 0], p2: [A, 0], label: lab('A', A), side: [0, -1] },
        { p1: [0, 0], p2: [0, B], label: lab('B', B), side: [-1, 0] },
        { p1: [A + B, B], p2: [A + B + C, B], label: lab('C', C), side: [0, 1] },
      ], notes };
      if (given(bar.dimD)) s.dims.push({ p1: [A + B + C + D, B - D], p2: [A + B + C + D, B], label: lab('D', D), side: [1, 0] });
      if (E > 0) s.dims.push({ p1: [A + B + C + D, B - D], p2: [A + B + C + D + E, B - D], label: lab('E', E), side: [0, -1] });
      break;
    }
    case '31': {
      const A = d('A'), B = d('B'), C = d('C');
      s = { paths: [[[0, 0], [C, 0], [C, B], [C + A, B], [C + A, 0], [2 * C + A, 0]]], dims: [
        { p1: [C, B], p2: [C + A, B], label: lab('A', A), side: [0, 1] },
        { p1: [C, 0], p2: [C, B], label: lab('B', B), side: [-1, 0] },
        { p1: [0, 0], p2: [C, 0], label: lab('C', C), side: [0, -1] },
      ], notes };
      break;
    }
    case '61': {
      const A = d('A'), B = d('B');
      const a = A * Math.SQRT1_2;
      s = { paths: [[[0, 0], [B, 0], [B + a, a], [2 * B + a, a]]], dims: [
        { p1: [0, 0], p2: [B, 0], label: lab('B', B), side: [0, -1] },
        { p1: [B, 0], p2: [B + a, a], label: lab('A', A), side: [1, -1] },
      ], notes };
      break;
    }
    case '81': {
      const A = d('A'), B = d('B');
      s = { paths: [[[A / 2, B], [A, B / 2], [A / 2, 0], [0, B / 2], [A / 2, B]]], dims: [
        { p1: [0, B / 2], p2: [A, B / 2], label: lab('A', A), side: [0, -1] },
        { p1: [A / 2, 0], p2: [A / 2, B], label: lab('B', B), side: [1, 0] },
      ], notes };
      notes.push(`135deg hooks, ext ${mm(getSeismicHookExtensionMeters(dia))}`);
      break;
    }
    case '77': {
      const A = d('A');
      const r = A / 2;
      s = { paths: [], circle: { c: [r, r], r }, dims: [
        { p1: [0, r], p2: [A, r], label: missing.includes('A') ? 'Dia=n/a' : `Dia=${A}`, side: [0, -1] },
      ], notes };
      const lap = given(bar.dimB) ? mm(bar.dimB as number) : Math.max(40 * dia, 300);
      notes.push(`Lap ${lap}`);
      break;
    }
    case '99': {
      const segs = bar.customSegments && bar.customSegments.length > 0
        ? bar.customSegments
        : [{ id: '1', length: given(bar.dimA) ? (bar.dimA as number) : 1, angle: 0, direction: 'straight' as const }];
      const geo = buildCustomShapeGeometry(segs, bar.startHook, bar.endHook, dia);
      const pts: Pt[] = [];
      const push = (p: { x: number; y: number }) => pts.push([fin(p.x) * 1000, fin(p.y) * 1000]);
      if (geo.startHook) push(geo.startHook.tipPoint);
      geo.segments.forEach((sg, i) => { if (i === 0) push(sg.start); push(sg.end); });
      if (geo.endHook) push(geo.endHook.tipPoint);
      s = { paths: [pts], dims: geo.segments.map((sg) => ({
        p1: [fin(sg.start.x) * 1000, fin(sg.start.y) * 1000] as Pt,
        p2: [fin(sg.end.x) * 1000, fin(sg.end.y) * 1000] as Pt,
        label: `${sg.label}=${mm(sg.length)}`,
      })), notes };
      if (geo.startHook && geo.startHook.additionMeters > 0) notes.push(`Start hook ext ${mm(geo.startHook.extensionLength)}`);
      if (geo.endHook && geo.endHook.additionMeters > 0) notes.push(`End hook ext ${mm(geo.endHook.extensionLength)}`);
      break;
    }
    case '00':
    default: {
      const A = d('A');
      s = { paths: [[[0, 0], [A, 0]]], dims: [
        { p1: [0, 0], p2: [A, 0], label: lab('A', A), side: [0, -1] },
      ], notes };
    }
  }
  if (missing.length) notes.push(`Dims missing (${missing.join(',')}) - drawn with defaults`);
  return s;
}

export function sketchBounds(s: BarSketch): { minX: number; minY: number; maxX: number; maxY: number } {
  const xs: number[] = [];
  const ys: number[] = [];
  s.paths.forEach((p) => p.forEach(([x, y]) => { xs.push(x); ys.push(y); }));
  if (s.circle) {
    xs.push(s.circle.c[0] - s.circle.r, s.circle.c[0] + s.circle.r);
    ys.push(s.circle.c[1] - s.circle.r, s.circle.c[1] + s.circle.r);
  }
  if (!xs.length) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}
