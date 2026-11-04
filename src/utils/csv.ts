import {
  BarItem,
  RebarDiameter,
  ShapeCode,
  StructuralMemberType,
  STANDARD_DIAMETERS,
} from '../types/bbs';
import { SHAPE_LIBRARY, calculateBarCuttingLength } from './shapes';
import { getUnitWeight } from './engineering';

export type DimensionUnit = 'm' | 'mm';

const MEMBER_TYPES: StructuralMemberType[] = [
  'Footing', 'Column', 'Beam', 'Slab', 'Retaining Wall', 'Culvert', 'Staircase', 'Miscellaneous',
];

const MAX_ROWS = 5000;

/** Neutralises spreadsheet formula injection for text cells (OWASP CSV injection). */
function safeText(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  const s = typeof value === 'number' ? String(value) : safeText(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_HEADERS = [
  'Bar Mark', 'Structure', 'Sub-Component', 'Component', 'Grid/Section', 'Member',
  'Description', 'Dia (mm)', 'No. of Elements', 'Bars per Element', 'Shape Code',
  'A (m)', 'B (m)', 'C (m)', 'D (m)', 'E (m)', 'F (m)', 'Remarks',
  'Cutting Length (m)', 'Total Bars', 'Total Length (m)', 'Total Weight (kg)',
];

/** Exports the schedule as CSV (dimensions in metres, UTF-8 with BOM for Excel). */
export function barsToCsv(bars: BarItem[]): string {
  const lines = [CSV_HEADERS.map(csvCell).join(',')];
  for (const b of bars) {
    lines.push([
      b.barMark, b.structureName, b.subComponent, b.component, b.gridOrSection, b.member,
      b.description, b.diameter, b.numElements, b.numBarsPerElement, b.shapeCode,
      b.dimA, b.dimB, b.dimC, b.dimD, b.dimE, b.dimF, b.remarks,
      b.cuttingLength, b.totalBars, b.totalLength, b.totalWeight,
    ].map(csvCell).join(','));
  }
  return '\uFEFF' + lines.join('\r\n');
}

/** Parses CSV/TSV/semicolon text (quotes supported). Delimiter is auto-detected from the first line. */
export function parseDelimited(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] || '';
  const counts = { '\t': 0, ';': 0, ',': 0 } as Record<string, number>;
  for (const ch of firstLine) if (ch in counts) counts[ch]++;
  const delim = counts['\t'] > 0 ? '\t' : counts[';'] > counts[','] ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"' && clean[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(cell); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      if (rows.length > MAX_ROWS) throw new Error(`Too many rows (max ${MAX_ROWS}).`);
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

type Field =
  | 'barMark' | 'structure' | 'subComponent' | 'component' | 'grid' | 'member'
  | 'description' | 'dia' | 'elements' | 'barsPer' | 'shape'
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'remarks';

const ALIASES: Record<Field, string[]> = {
  barMark: ['barmark', 'mark', 'bar', 'barno', 'marks'],
  structure: ['structure', 'structurename'],
  subComponent: ['subcomponent', 'floor', 'level', 'zone'],
  component: ['component', 'element', 'part'],
  grid: ['grid', 'gridsection', 'section', 'location'],
  member: ['member', 'membertype', 'type'],
  description: ['description', 'desc', 'details', 'item'],
  dia: ['dia', 'diamm', 'diameter', 'diametermm', 'd', 'size', 'phi'],
  elements: ['noofelements', 'elements', 'nosofmembers', 'members', 'nom', 'noofmembers', 'numelements'],
  barsPer: ['barsperelement', 'barsperelem', 'noofbars', 'barsperunit', 'nobars', 'nos', 'numbarsperelement'],
  shape: ['shapecode', 'shape', 'code'],
  A: ['a', 'am', 'amm', 'dima'],
  B: ['b', 'bm', 'bmm', 'dimb'],
  C: ['c', 'cm', 'cmm', 'dimc'],
  D: ['dm', 'dmm', 'dimd'],
  E: ['e', 'em', 'emm', 'dime'],
  F: ['f', 'fm', 'fmm', 'dimf'],
  remarks: ['remarks', 'remark', 'notes', 'note', 'comments'],
};

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

export interface CsvImportResult {
  bars: BarItem[];
  errors: string[];
}

/**
 * Converts parsed rows (first row = headers) into fully calculated bars.
 * Unknown/invalid rows are skipped and reported with their line number.
 */
export function rowsToBars(rows: string[][], unit: DimensionUnit): CsvImportResult {
  const errors: string[] = [];
  if (rows.length < 2) return { bars: [], errors: ['No data rows found.'] };

  const headers = rows[0].map(norm);
  const col: Partial<Record<Field, number>> = {};
  (Object.keys(ALIASES) as Field[]).forEach((f) => {
    const idx = headers.findIndex((h) => ALIASES[f].includes(h));
    if (idx >= 0) col[f] = idx;
  });

  const required: Field[] = ['dia', 'shape', 'A'];
  const missing = required.filter((f) => col[f] === undefined);
  if (missing.length) {
    return { bars: [], errors: [`Missing required column(s): ${missing.map((m) => ({ dia: 'Dia', shape: 'Shape Code', A: 'A' }[m as 'dia'])).join(', ')}.`] };
  }

  const scale = unit === 'mm' ? 0.001 : 1;
  const get = (r: string[], f: Field) => (col[f] === undefined ? '' : (r[col[f] as number] ?? '').trim());
  const num = (s: string) => {
    const n = parseFloat(s.replace(/,/g, ''));
    return Number.isFinite(n) ? n : NaN;
  };

  const bars: BarItem[] = [];
  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const dia = num(get(r, 'dia')) as RebarDiameter;
    if (!(STANDARD_DIAMETERS as readonly number[]).includes(dia)) {
      errors.push(`Line ${line}: unsupported diameter "${get(r, 'dia')}" (use ${STANDARD_DIAMETERS.join('/')}).`);
      return;
    }
    const shapeRaw = get(r, 'shape').padStart(2, '0');
    const shapeCode = shapeRaw as ShapeCode;
    if (!SHAPE_LIBRARY[shapeCode] || shapeCode === '99') {
      errors.push(`Line ${line}: unknown or unsupported shape code "${get(r, 'shape')}".`);
      return;
    }
    const dims: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    for (const k of Object.keys(dims) as (keyof typeof dims)[]) {
      const raw = get(r, k);
      if (raw === '') continue;
      const n = num(raw);
      if (!Number.isFinite(n) || n < 0 || n > 1e6) {
        errors.push(`Line ${line}: invalid dimension ${k} "${raw}".`);
        return;
      }
      dims[k] = Number((n * scale).toFixed(4));
    }
    const required = SHAPE_LIBRARY[shapeCode].dimensionsRequired;
    const absent = required.filter((k) => (dims as Record<string, number>)[k] <= 0);
    if (absent.length) {
      errors.push(`Line ${line}: shape ${shapeCode} needs dimension(s) ${absent.join(', ')}.`);
      return;
    }

    const numElements = Math.max(1, Math.round(num(get(r, 'elements')) || 1));
    const numBarsPerElement = Math.max(1, Math.round(num(get(r, 'barsPer')) || 1));
    const totalBars = numElements * numBarsPerElement;
    const calc = calculateBarCuttingLength(shapeCode, dims.A, dims.B, dims.C, dims.D, dims.E, dims.F, dia);
    const unitWeight = getUnitWeight(dia);
    const totalLength = Number((totalBars * calc.cuttingLength).toFixed(3));
    const memberRaw = get(r, 'member');
    const member = MEMBER_TYPES.find((m) => m.toLowerCase() === memberRaw.toLowerCase()) || 'Miscellaneous';
    const sub = get(r, 'subComponent') || undefined;

    bars.push({
      id: `bar-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      barMark: get(r, 'barMark') || `BM-${String(i + 1).padStart(2, '0')}`,
      structureName: get(r, 'structure') || undefined,
      subComponent: sub,
      component: get(r, 'component') || undefined,
      gridOrSection: get(r, 'grid') || undefined,
      member,
      floorOrSection: sub,
      description: get(r, 'description') || SHAPE_LIBRARY[shapeCode].name,
      diameter: dia,
      numElements,
      numBarsPerElement,
      totalBars,
      shapeCode,
      dimA: dims.A,
      dimB: required.includes('B') ? dims.B : undefined,
      dimC: required.includes('C') ? dims.C : undefined,
      dimD: required.includes('D') ? dims.D : undefined,
      dimE: required.includes('E') ? dims.E : undefined,
      dimF: required.includes('F') ? dims.F : undefined,
      cuttingLength: calc.cuttingLength,
      totalLength,
      unitWeight,
      totalWeight: Number((totalLength * unitWeight).toFixed(2)),
      formulaExplanation: calc.formulaExplanation,
      remarks: get(r, 'remarks') || undefined,
    });
  });

  return { bars, errors };
}
