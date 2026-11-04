/**
 * Code profiles for the bar-bending engine. ALL code constants live here so they can be
 * corrected without touching the calculation logic.
 *
 * Source: docs/ACI318_AS3600_BBS_Rules.md (paraphrased summary; clause numbers for traceability).
 * - `verify: true`  -> written from memory of the standard / edition-dependent. Must be
 *                      confirmed by a licensed engineer against the cited edition.
 * - `null` values   -> LOAD-FROM-STANDARD tables. Never invent numbers: the app asks the user
 *                      to enter them (manual override) and blocks final exports until then.
 *
 * To change a rule, edit this file (and the rules .md) — nothing else hard-codes these values.
 */
import { DesignStandard } from '../types/bbs';

export interface Rule<T> {
  value: T | null;
  clause: string;
  verify?: boolean;
  note?: string;
}

/** Row applies to bars up to and including `maxDia` (mm, metric designation). */
export interface BendRow {
  maxDia: number;
  /** Inside bend diameter D as a multiple of bar diameter. */
  factor: number;
}

export interface ExtensionRow {
  maxDia: number;
  /** Straight extension = max(factor x db, minMm). */
  factor: number;
  minMm?: number;
}

export interface CoverRow {
  /** Row applies to bars up to and including `maxDia`. */
  maxDia: number;
  mm: number;
}

export interface CoverCategory {
  key: string;
  label: string;
  rows: CoverRow[];
}

export interface BarSize {
  designation: string;
  dia: number;
  mass: number;
}

export type HookKind = '90' | '135' | '180';
export type BarUse = 'main' | 'fitment';

export interface CodeProfile {
  id: DesignStandard;
  name: string;
  edition: string;
  /** 'legacy' = the original IS 2502 / BS 8666 formulas in shapes.ts. */
  family: 'legacy' | 'ACI' | 'AS';
  /** Bar sizes this code offers (null = the app's default list). */
  bars: Rule<BarSize[]> | null;
  mainBend: Rule<BendRow[]>;
  fitmentBend: Rule<BendRow[]>;
  hooks: Record<`${BarUse}${HookKind}`, Rule<ExtensionRow[]>>;
  cover: Rule<CoverCategory[]>;
  defaults: { fy: number; fc: number; stockLengthM: number };
  disclaimer: string;
}

export const DISCLAIMER =
  "Calculation aid only. Verify against the governing standard and the engineer of record's drawings.";

const ACI_BARS: BarSize[] = [
  { designation: '#3', dia: 10, mass: 0.56 },
  { designation: '#4', dia: 13, mass: 0.994 },
  { designation: '#5', dia: 16, mass: 1.552 },
  { designation: '#6', dia: 19, mass: 2.235 },
  { designation: '#7', dia: 22, mass: 3.042 },
  { designation: '#8', dia: 25, mass: 3.973 },
  { designation: '#9', dia: 29, mass: 5.06 },
  { designation: '#10', dia: 32, mass: 6.404 },
  { designation: '#11', dia: 36, mass: 7.907 },
  { designation: '#14', dia: 43, mass: 11.38 },
  { designation: '#18', dia: 57, mass: 20.24 },
];

const AS_BARS: BarSize[] = [
  { designation: 'N10', dia: 10, mass: 0.617 },
  { designation: 'N12', dia: 12, mass: 0.888 },
  { designation: 'N16', dia: 16, mass: 1.58 },
  { designation: 'N20', dia: 20, mass: 2.47 },
  { designation: 'N24', dia: 24, mass: 3.55 },
  { designation: 'N28', dia: 28, mass: 4.83 },
  { designation: 'N32', dia: 32, mass: 6.31 },
  { designation: 'N36', dia: 36, mass: 7.99 },
  { designation: 'N40', dia: 40, mass: 9.86 },
];

const noRule = <T,>(clause: string, note: string): Rule<T> => ({ value: null, clause, note });

export const PROFILES: Record<DesignStandard, CodeProfile> = {
  'IS 2502 / SP 34': {
    id: 'IS 2502 / SP 34',
    name: 'IS 2502 / SP 34',
    edition: 'IS 2502:1963',
    family: 'legacy',
    bars: null,
    mainBend: noRule('IS 2502', 'Uses the built-in IS 2502 / BS 8666 deduction rules.'),
    fitmentBend: noRule('IS 2502', 'Uses the built-in IS 2502 / BS 8666 deduction rules.'),
    hooks: {} as CodeProfile['hooks'],
    cover: noRule('IS 456 Cl 26.4', 'Not modelled.'),
    defaults: { fy: 500, fc: 25, stockLengthM: 12 },
    disclaimer: DISCLAIMER,
  },
  'BS 8666:2020': {
    id: 'BS 8666:2020',
    name: 'BS 8666:2020',
    edition: 'BS 8666:2020',
    family: 'legacy',
    bars: null,
    mainBend: noRule('BS 8666', 'Uses the built-in IS 2502 / BS 8666 deduction rules.'),
    fitmentBend: noRule('BS 8666', 'Uses the built-in IS 2502 / BS 8666 deduction rules.'),
    hooks: {} as CodeProfile['hooks'],
    cover: noRule('BS 8110 / EN 1992', 'Not modelled.'),
    defaults: { fy: 500, fc: 30, stockLengthM: 12 },
    disclaimer: DISCLAIMER,
  },
  'IRC:112': {
    id: 'IRC:112',
    name: 'IRC:112',
    edition: 'IRC:112-2020',
    family: 'legacy',
    bars: null,
    mainBend: noRule('IRC:112', 'Uses the built-in IS 2502 / BS 8666 deduction rules.'),
    fitmentBend: noRule('IRC:112', 'Uses the built-in IS 2502 / BS 8666 deduction rules.'),
    hooks: {} as CodeProfile['hooks'],
    cover: noRule('IRC:112 Cl 14.3', 'Not modelled.'),
    defaults: { fy: 500, fc: 30, stockLengthM: 12 },
    disclaimer: DISCLAIMER,
  },

  'ACI 318-19': {
    id: 'ACI 318-19',
    name: 'ACI 318-19',
    edition: 'ACI CODE-318-19',
    family: 'ACI',
    bars: { value: ACI_BARS, clause: 'ASTM A615M / A706M soft-metric', verify: true },
    mainBend: {
      value: [
        { maxDia: 25, factor: 6 },
        { maxDia: 36, factor: 8 },
        { maxDia: 57, factor: 10 },
      ],
      clause: 'ACI 318-19 25.3.1',
    },
    fitmentBend: {
      value: [
        { maxDia: 16, factor: 4 },
        { maxDia: 25, factor: 6 },
      ],
      clause: 'ACI 318-19 25.3.2',
      note: 'Bars above #8 (25 mm) use the main-bar bend diameter.',
    },
    hooks: {
      main90: { value: [{ maxDia: 57, factor: 12 }], clause: 'ACI 318-19 25.3.1' },
      main135: noRule('ACI 318-19 25.3.1', 'Not a standard hook for main bars.'),
      main180: { value: [{ maxDia: 57, factor: 4, minMm: 65 }], clause: 'ACI 318-19 25.3.1' },
      fitment90: {
        value: [
          { maxDia: 16, factor: 6 },
          { maxDia: 25, factor: 12 },
        ],
        clause: 'ACI 318-19 25.3.2',
        verify: true,
      },
      fitment135: { value: [{ maxDia: 57, factor: 6, minMm: 75 }], clause: 'ACI 318-19 25.3.2 / Ch. 18', verify: true },
      fitment180: { value: [{ maxDia: 57, factor: 4, minMm: 65 }], clause: 'ACI 318-19 25.3.2', verify: true },
    },
    cover: {
      value: [
        { key: 'ground', label: 'Cast against and permanently in contact with ground', rows: [{ maxDia: 57, mm: 75 }] },
        {
          key: 'weather',
          label: 'Exposed to weather or in contact with ground',
          rows: [
            { maxDia: 16, mm: 40 },
            { maxDia: 57, mm: 50 },
          ],
        },
        {
          key: 'interior-slab',
          label: 'Not exposed - slabs, walls, joists',
          rows: [
            { maxDia: 36, mm: 20 },
            { maxDia: 57, mm: 40 },
          ],
        },
        {
          key: 'interior-beam-column',
          label: 'Not exposed - beams, columns, pedestals, ties',
          rows: [{ maxDia: 57, mm: 40 }],
        },
      ],
      clause: 'ACI 318-19 20.5.1.3',
      verify: true,
      note: 'Corrosive environments, fire rating and the specification may require more.',
    },
    defaults: { fy: 420, fc: 30, stockLengthM: 12 },
    disclaimer: DISCLAIMER,
  },

  'AS 3600:2018': {
    id: 'AS 3600:2018',
    name: 'AS 3600:2018',
    edition: 'AS 3600:2018 (with amendments)',
    family: 'AS',
    bars: { value: AS_BARS, clause: 'AS/NZS 4671', verify: true },
    mainBend: noRule('AS 3600 Cl 17.2.3', 'LOAD-FROM-STANDARD: enter the minimum internal bend diameter in Project Settings.'),
    fitmentBend: noRule('AS 3600 Cl 17.2.3', 'LOAD-FROM-STANDARD: enter the minimum internal bend diameter in Project Settings.'),
    hooks: {
      main90: noRule('AS 3600 Cl 17.2.2', 'LOAD-FROM-STANDARD: enter the 90° cog extension.'),
      main135: noRule('AS 3600 Cl 17.2.2', 'Not a standard hook for main bars.'),
      main180: noRule('AS 3600 Cl 17.2.2', 'LOAD-FROM-STANDARD: enter the 180° hook extension.'),
      fitment90: noRule('AS 3600 Cl 17.2.2', 'LOAD-FROM-STANDARD: enter the 90° fitment extension.'),
      fitment135: noRule('AS 3600 Cl 17.2.2', 'LOAD-FROM-STANDARD: enter the 135° fitment hook extension.'),
      fitment180: noRule('AS 3600 Cl 17.2.2', 'LOAD-FROM-STANDARD: enter the 180° fitment hook extension.'),
    },
    cover: noRule('AS 3600 Cl 4.10 / Section 5', 'LOAD-FROM-STANDARD: cover must be entered manually.'),
    defaults: { fy: 500, fc: 32, stockLengthM: 12 },
    disclaimer: DISCLAIMER,
  },
};

export const STANDARD_OPTIONS: { value: DesignStandard; label: string }[] = [
  { value: 'IS 2502 / SP 34', label: 'IS 2502:1963 / SP 34' },
  { value: 'BS 8666:2020', label: 'BS 8666:2020' },
  { value: 'IRC:112', label: 'IRC:112 (Bridges & Culverts)' },
  { value: 'ACI 318-19', label: 'ACI 318-19' },
  { value: 'AS 3600:2018', label: 'AS 3600:2018' },
];
