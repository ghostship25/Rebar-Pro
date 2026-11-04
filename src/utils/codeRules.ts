/**
 * Code-profile rules engine for ACI 318 / AS 3600 (see docs/ACI318_AS3600_BBS_Rules.md).
 * Constants come from src/data/codeProfiles.ts; this file only holds formulas.
 * All internal maths is in mm. IS 2502 / BS 8666 / IRC:112 keep the original engine in shapes.ts.
 */
import { BarItem, CodeSettings, DesignStandard, ProjectMetadata, ShapeCode } from '../types/bbs';
import {
  BarUse,
  CodeProfile,
  ExtensionRow,
  HookKind,
  PROFILES,
  BendRow,
} from '../data/codeProfiles';

/* ------------------------------------------------------------------ active context */

let activeStandard: DesignStandard = 'IS 2502 / SP 34';
let activeSettings: CodeSettings = {};

/** Set from the app whenever the project standard / settings change; read by the calculators. */
export function setActiveCodeContext(standard: DesignStandard | undefined, settings?: CodeSettings) {
  activeStandard = standard && PROFILES[standard] ? standard : 'IS 2502 / SP 34';
  activeSettings = settings ?? {};
}

export const getActiveProfile = (): CodeProfile => PROFILES[activeStandard];
export const getActiveSettings = (): CodeSettings => activeSettings;
export const isCodeEngineActive = (): boolean => getActiveProfile().family !== 'legacy';

/** Standard-specific unit weight (kg/m), or undefined to use the default IS table. */
export function profileUnitWeight(dia: number, profile: CodeProfile = getActiveProfile()): number | undefined {
  return profile.bars?.value?.find((b) => b.dia === dia)?.mass;
}

export function isBarAvailable(dia: number, profile: CodeProfile = getActiveProfile()): boolean {
  const sizes = profile.bars?.value;
  return !sizes || sizes.some((b) => b.dia === dia);
}

export function barDesignation(dia: number, profile: CodeProfile = getActiveProfile()): string {
  return profile.bars?.value?.find((b) => b.dia === dia)?.designation ?? `T${dia}`;
}

/* ------------------------------------------------------------------ rule resolution */

export interface Resolved {
  /** Value in mm (D for bends, extension for hooks), or null when missing. */
  mm: number | null;
  /** Human-readable rule, e.g. "6db". */
  label: string;
  clause: string;
  verify: boolean;
  manual: boolean;
  /** Name of the missing LOAD-FROM-STANDARD table, if any. */
  missing?: string;
}

function pickRow<T extends { maxDia: number }>(rows: T[], dia: number): T | undefined {
  return rows.find((r) => dia <= r.maxDia) ?? rows[rows.length - 1];
}

/** Minimum inside bend diameter D for a bar (ACI 25.3.1/25.3.2; AS 3600 Cl 17.2.3 needs manual input). */
export function resolveBendDiameter(
  profile: CodeProfile,
  settings: CodeSettings,
  dia: number,
  use: BarUse
): Resolved {
  const rule = use === 'main' ? profile.mainBend : profile.fitmentBend;
  const manualFactor = use === 'main' ? settings.manualBendMain : settings.manualBendFitment;
  let rows: BendRow[] | null = rule.value;
  let clause = rule.clause;
  if (use === 'fitment' && rows && dia > Math.max(...rows.map((r) => r.maxDia))) {
    rows = profile.mainBend.value;
    clause = profile.mainBend.clause;
  }
  if (rows) {
    const row = pickRow(rows, dia)!;
    return { mm: row.factor * dia, label: `${row.factor}db`, clause, verify: !!rule.verify, manual: false };
  }
  if (manualFactor && manualFactor > 0) {
    return { mm: manualFactor * dia, label: `${manualFactor}db (manual)`, clause, verify: true, manual: true };
  }
  return {
    mm: null,
    label: 'missing',
    clause,
    verify: true,
    manual: false,
    missing: `${profile.name} ${use === 'main' ? 'main-bar' : 'fitment'} bend diameter (${rule.clause})`,
  };
}

/** Straight extension at the free end of a hook (ACI 25.3.1/25.3.2; AS 3600 Cl 17.2.2 needs manual input). */
export function resolveHookExtension(
  profile: CodeProfile,
  settings: CodeSettings,
  kind: HookKind,
  use: BarUse,
  dia: number
): Resolved {
  const rule = profile.hooks[`${use}${kind}`];
  const manualFactor = kind === '90' ? settings.manualExt90 : kind === '135' ? settings.manualExt135 : settings.manualExt180;
  const rows: ExtensionRow[] | null = rule?.value ?? null;
  if (rows) {
    const row = pickRow(rows, dia)!;
    const mm = Math.max(row.factor * dia, row.minMm ?? 0);
    return {
      mm,
      label: row.minMm ? `max(${row.factor}db, ${row.minMm}mm)` : `${row.factor}db`,
      clause: rule.clause,
      verify: !!rule.verify,
      manual: false,
    };
  }
  if (manualFactor && manualFactor > 0) {
    return { mm: manualFactor * dia, label: `${manualFactor}db (manual)`, clause: rule?.clause ?? '', verify: true, manual: true };
  }
  return {
    mm: null,
    label: 'missing',
    clause: rule?.clause ?? '',
    verify: true,
    manual: false,
    missing: `${profile.name} ${kind}° ${use} hook extension (${rule?.clause ?? 'n/a'})`,
  };
}

/* ------------------------------------------------------------------ bend geometry (mm) */

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Bend deduction for a turn of `alphaDeg` with inside diameter D and bar diameter d (Section 5.2):
 * 2*Ro*tan(a/2) - a*(D+d)/2, with Ro = D/2 + d. For 90°: 0.2146 D + 1.2146 d.
 */
export function bendDeductionMm(alphaDeg: number, D: number, d: number): number {
  const ro = D / 2 + d;
  return 2 * ro * Math.tan(rad(alphaDeg) / 2) - rad(alphaDeg) * ((D + d) / 2);
}

/** Centerline hook allowance (Section 5.3): arc length + straight extension. */
export function hookAllowanceMm(alphaDeg: number, D: number, d: number, ext: number): number {
  return rad(alphaDeg) * ((D + d) / 2) + ext;
}

/* ------------------------------------------------------------------ cut length */

export interface ProfileCutResult {
  cuttingLength: number;
  formulaExplanation: string;
  totalStraightLength: number;
  totalBendDeductions: number;
  hookExtensions: number;
  missingData?: string[];
  codeNotes?: string[];
}

const FITMENT_SHAPES: ShapeCode[] = ['51', '81', '61', '77'];
export const shapeUse = (code: ShapeCode): BarUse => (FITMENT_SHAPES.includes(code) ? 'fitment' : 'main');

/**
 * Cut length under an ACI/AS profile. Dimensions are out-to-out (metres, as stored on the bar).
 * Bends < 135° use the deduction formula; 135° hooks use the centerline method where the
 * adjoining leg stops at the tangent point (out-to-out leg minus the outer radius Ro).
 * Returns null for shapes handled elsewhere (custom 99).
 */
export function profileCuttingLength(
  shapeCode: ShapeCode,
  dims: { A: number; B: number; C: number; D: number; E: number },
  dia: number,
  profile: CodeProfile = getActiveProfile(),
  settings: CodeSettings = getActiveSettings()
): ProfileCutResult | null {
  if (profile.family === 'legacy' || shapeCode === '99') return null;

  const A = dims.A * 1000;
  const B = dims.B * 1000;
  const C = dims.C * 1000;
  const Dd = dims.D * 1000;
  const E = dims.E * 1000;
  const d = dia;
  const use = shapeUse(shapeCode);

  const missing: string[] = [];
  const notes: string[] = [];
  const bend = resolveBendDiameter(profile, settings, d, use);
  if (bend.missing) missing.push(bend.missing);
  if (bend.verify && !bend.manual) notes.push(`${bend.clause}: bend diameter ${bend.label} (VERIFY)`);
  const D = bend.mm ?? 0;
  const ro = D / 2 + d;
  const ded90 = bendDeductionMm(90, D, d);

  const useExt = (kind: HookKind) => {
    const r = resolveHookExtension(profile, settings, kind, use, d);
    if (r.missing) missing.push(r.missing);
    return r.mm ?? 0;
  };

  let straight = 0;
  let deductions = 0;
  let hookExt = 0;
  let cut = 0;
  let formula = '';
  const f = (n: number) => n.toFixed(1);

  switch (shapeCode) {
    case '00':
      straight = cut = A;
      formula = `L = A = ${f(A)} mm (no bends)`;
      break;
    case '11':
      straight = A + B;
      deductions = ded90;
      cut = straight - deductions;
      formula = `L = A + B - ded(90°) = ${f(A)} + ${f(B)} - ${f(ded90)} = ${f(cut)} mm [D=${bend.label}=${f(D)} mm]`;
      break;
    case '21':
      straight = A + B + C;
      deductions = 2 * ded90;
      cut = straight - deductions;
      formula = `L = A + B + C - 2×ded(90°) = ${f(A)} + ${f(B)} + ${f(C)} - 2×${f(ded90)} = ${f(cut)} mm [D=${bend.label}=${f(D)} mm]`;
      break;
    case '31':
      straight = A + 2 * B + 2 * C;
      deductions = 4 * ded90;
      cut = straight - deductions;
      formula = `L = A + 2B + 2C - 4×ded(90°) = ${f(cut)} mm [D=${bend.label}=${f(D)} mm, ded=${f(ded90)}]`;
      break;
    case '71':
      straight = A + B + C;
      deductions = 2 * ded90;
      cut = straight - deductions;
      formula = `L = A + B + C - 2×ded(90°) = ${f(cut)} mm [D=${bend.label}=${f(D)} mm, ded=${f(ded90)}]`;
      break;
    case '61':
      straight = A + 2 * B;
      deductions = 2 * ded90;
      cut = straight - deductions;
      formula = `L = A + 2B - 2×ded(90°) = ${f(cut)} mm [D=${bend.label}=${f(D)} mm, ded=${f(ded90)}]`;
      break;
    case '41': {
      const h1 = B;
      const h2 = Dd > 0 ? Dd : B;
      const second = Dd > 0 || E > 0 ? h2 : 0;
      const crankExtra = (Math.SQRT2 - 1) * (h1 + second);
      const ded45 = bendDeductionMm(45, D, d);
      straight = A + C + E + h1 + second;
      deductions = 4 * ded45;
      cut = A + C + E + crankExtra - deductions;
      formula = `L = A + C + E + 0.414(H1+H2) - 4×ded(45°) = ${f(A + C + E)} + ${f(crankExtra)} - ${f(deductions)} = ${f(cut)} mm [D=${bend.label}=${f(D)} mm]`;
      break;
    }
    case '51': {
      const ext = useExt('135');
      const hook = hookAllowanceMm(135, D, d, ext);
      straight = 2 * (A + B);
      hookExt = 2 * ext;
      deductions = 3 * ded90 + 2 * ro;
      cut = straight - deductions + 2 * hook;
      formula = `L = 2(A+B) - 3×ded(90°) + 2×[hook135 = arc + ${f(ext)} ext - Ro] = ${f(straight)} - ${f(3 * ded90)} + 2×(${f(hook)} - ${f(ro)}) = ${f(cut)} mm [D=${bend.label}=${f(D)} mm]`;
      break;
    }
    case '81': {
      const ext = useExt('135');
      const hook = hookAllowanceMm(135, D, d, ext);
      const hA = A / 2;
      const hB = B / 2;
      const side = Math.hypot(hA, hB);
      const a1 = 180 - 2 * (Math.atan2(hB, hA) * 180) / Math.PI; // corners on the A axis
      const a2 = 180 - 2 * (Math.atan2(hA, hB) * 180) / Math.PI; // corners on the B axis
      const d1 = bendDeductionMm(a1, D, d);
      const d2 = bendDeductionMm(a2, D, d);
      straight = 4 * side;
      hookExt = 2 * ext;
      deductions = 2 * d1 + d2 + 2 * ro;
      cut = straight - deductions + 2 * hook;
      formula = `L = 4×√((A/2)²+(B/2)²) - Σded(corners) + 2×[hook135 - Ro] = ${f(straight)} - ${f(2 * d1 + d2)} + 2×(${f(hook)} - ${f(ro)}) = ${f(cut)} mm [D=${bend.label}=${f(D)} mm]`;
      break;
    }
    case '77': {
      const lap = B > 0 ? B : Math.max(40 * d, 300);
      straight = Math.PI * Math.max(A - d, 0) + lap;
      cut = straight;
      formula = `L = π×(A - d) + lap = π×(${f(A)} - ${f(d)}) + ${f(lap)} = ${f(cut)} mm (A is the outside diameter; lap ${B > 0 ? 'from B' : 'default max(40db, 300 mm) - set B to override'})`;
      break;
    }
    default:
      straight = cut = A;
      formula = `L = A = ${f(A)} mm`;
  }

  const roundTo = settings.roundUpMm ?? 5;
  let roundedNote = '';
  if (roundTo > 0 && cut > 0) {
    const rounded = Math.ceil(cut / roundTo - 1e-9) * roundTo;
    if (rounded !== cut) roundedNote = ` → rounded up to ${rounded} mm (${roundTo} mm steps)`;
    cut = rounded;
  }

  return {
    cuttingLength: Number(Math.max(0.01, cut / 1000).toFixed(3)),
    formulaExplanation: `[${profile.name}] ${formula}${roundedNote}`,
    totalStraightLength: Number((straight / 1000).toFixed(3)),
    totalBendDeductions: Number((deductions / 1000).toFixed(3)),
    hookExtensions: Number((hookExt / 1000).toFixed(3)),
    missingData: missing.length ? Array.from(new Set(missing)) : undefined,
    codeNotes: notes.length ? notes : undefined,
  };
}

/* ------------------------------------------------------------------ development & lap lengths */

export interface LengthResult {
  mm: number | null;
  formula: string;
  clause: string;
  verify: boolean;
  missing?: string;
}

const psiG = (fy: number) => (fy <= 420 ? 1.0 : fy <= 550 ? 1.15 : 1.3);

/** ACI 318-19 25.4.2.3 simplified tension development length (VERIFY constants). */
export function aciTensionDevelopment(dia: number, s: CodeSettings, profile: CodeProfile = PROFILES['ACI 318-19']): LengthResult {
  const fy = s.fy ?? profile.defaults.fy;
  const fc = s.fc ?? profile.defaults.fc;
  const psiT = s.topBar ? 1.3 : 1.0;
  const psiE = s.epoxyCoated ? 1.5 : 1.0; // conservative: coated bars with cover < 3db or spacing < 6db
  const psiTE = Math.min(psiT * psiE, 1.7);
  const small = dia <= 19;
  const k = s.aciFavourable ? (small ? 2.1 : 1.7) : small ? 1.4 : 1.1;
  const ld = Math.max(((fy * psiTE * psiG(fy)) / (k * Math.sqrt(fc))) * dia, 300);
  return {
    mm: ld,
    formula: `ld = fy·ψt·ψe·ψg/(${k}·λ·√f'c)·db = ${fy}×${psiTE.toFixed(2)}×${psiG(fy)}/(${k}×√${fc})×${dia} ≥ 300`,
    clause: 'ACI 318-19 25.4.2.3',
    verify: true,
  };
}

/** ACI 318-19 25.5.2 tension lap: Class A = 1.0 ld, Class B = 1.3 ld, min 300 mm. */
export function aciTensionLap(dia: number, s: CodeSettings, profile: CodeProfile = PROFILES['ACI 318-19']): LengthResult & { lapClass: 'A' | 'B' } {
  const ld = aciTensionDevelopment(dia, s, profile);
  const ratio = s.aciAsRatio ?? 1;
  const pct = s.percentSpliced ?? 100;
  const lapClass: 'A' | 'B' = ratio >= 2 && pct <= 50 ? 'A' : 'B';
  const mult = lapClass === 'A' ? 1.0 : 1.3;
  return {
    mm: Math.max((ld.mm ?? 0) * mult, 300),
    formula: `Class ${lapClass} lap = ${mult}·ld ≥ 300 mm (As prov/req = ${ratio}, ${pct}% spliced)`,
    clause: 'ACI 318-19 25.5.2',
    verify: true,
    lapClass,
  };
}

/** ACI 318-19 25.5.5 compression lap (VERIFY). */
export function aciCompressionLap(dia: number, s: CodeSettings, profile: CodeProfile = PROFILES['ACI 318-19']): LengthResult {
  const fy = s.fy ?? profile.defaults.fy;
  const fc = s.fc ?? profile.defaults.fc;
  let lap = fy <= 420 ? 0.071 * fy * dia : (0.13 * fy - 24) * dia;
  lap = Math.max(lap, 300);
  if (fc < 21) lap *= 4 / 3;
  return { mm: lap, formula: `lap = ${fy <= 420 ? '0.071·fy·db' : '(0.13·fy − 24)·db'} ≥ 300 mm${fc < 21 ? ', +1/3 for f\'c < 21' : ''}`, clause: 'ACI 318-19 25.5.5', verify: true };
}

/** AS 3600:2018 Cl 13.1.2 tension development length, simple option k4 = k5 = 1.0 (VERIFY). */
export function asTensionDevelopment(dia: number, s: CodeSettings, profile: CodeProfile = PROFILES['AS 3600:2018']): LengthResult {
  const fsy = s.fy ?? profile.defaults.fy;
  const fc = s.fc ?? profile.defaults.fc;
  const k1 = s.topBar ? 1.3 : 1.0;
  const k2 = (132 - dia) / 100;
  const k3 = s.asCd ? Math.min(1, Math.max(0.7, 1 - (0.15 * (s.asCd - dia)) / dia)) : 1.0;
  const lsytb = Math.max((0.5 * k1 * k3 * fsy * dia) / (k2 * Math.sqrt(fc)), 0.058 * fsy * k1 * dia);
  return {
    mm: lsytb,
    formula: `Lsy.t = max(0.5·k1·k3·fsy·db/(k2·√f'c), 0.058·fsy·k1·db); k1=${k1}, k2=${k2.toFixed(2)}, k3=${k3.toFixed(2)}, k4=k5=1.0`,
    clause: 'AS 3600:2018 Cl 13.1.2',
    verify: true,
  };
}

/** AS 3600:2018 Cl 13.2 tension lap = k7·Lsy.t. k7 is LOAD-FROM-STANDARD, so it must be supplied. */
export function asTensionLap(dia: number, s: CodeSettings, profile: CodeProfile = PROFILES['AS 3600:2018']): LengthResult {
  const dev = asTensionDevelopment(dia, s, profile);
  if (!s.asK7 || s.asK7 <= 0) {
    return { mm: null, formula: 'lap = k7·Lsy.t', clause: 'AS 3600:2018 Cl 13.2', verify: true, missing: 'AS 3600 lap factor k7 (Cl 13.2)' };
  }
  return { mm: (dev.mm ?? 0) * s.asK7, formula: `lap = k7·Lsy.t = ${s.asK7}×${Math.round(dev.mm ?? 0)}`, clause: 'AS 3600:2018 Cl 13.2', verify: true };
}

/** Tension lap length in mm for the active profile, or null when not code-driven / data missing. */
export function codeTensionLapMm(dia: number, profile: CodeProfile = getActiveProfile(), s: CodeSettings = getActiveSettings()): number | null {
  if (profile.family === 'ACI') return aciTensionLap(dia, s, profile).mm;
  if (profile.family === 'AS') return asTensionLap(dia, s, profile).mm;
  return null;
}

/* ------------------------------------------------------------------ cover */

export function resolveCover(profile: CodeProfile, s: CodeSettings, dia: number): { mm: number | null; clause: string; label: string } {
  const cats = profile.cover.value;
  if (cats) {
    const cat = cats.find((c) => c.key === s.coverExposure) ?? cats[cats.length - 1];
    const row = pickRow(cat.rows, dia)!;
    return { mm: row.mm, clause: profile.cover.clause, label: cat.label };
  }
  if (s.manualCoverMm && s.manualCoverMm > 0) return { mm: s.manualCoverMm, clause: profile.cover.clause, label: 'manual' };
  return { mm: null, clause: profile.cover.clause, label: 'Cover must be entered manually' };
}

/* ------------------------------------------------------------------ compliance checks */

export interface CodeIssue {
  barId: string;
  barMark: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  recommendation: string;
}

/** Run the Section 10 checks that can be evaluated from the stored bar data. */
export function auditCodeCompliance(bars: BarItem[], meta: Pick<ProjectMetadata, 'standard' | 'codeSettings'>): CodeIssue[] {
  const profile = PROFILES[meta.standard] ?? PROFILES['IS 2502 / SP 34'];
  if (profile.family === 'legacy') return [];
  const s = meta.codeSettings ?? {};
  const issues: CodeIssue[] = [];
  const add = (b: BarItem, severity: CodeIssue['severity'], message: string, recommendation: string) =>
    issues.push({ barId: b.id, barMark: b.barMark, severity, message, recommendation });

  const stockM = profile.defaults.stockLengthM;
  for (const b of bars) {
    const d = b.diameter;
    const use = shapeUse(b.shapeCode);

    if (!isBarAvailable(d, profile)) {
      add(b, 'error', `${d} mm is not a standard ${profile.name} bar size (${profile.bars?.clause}).`, `Use one of: ${profile.bars?.value?.map((x) => x.designation).join(', ')}.`);
    }

    if (b.shapeCode === '99') {
      add(b, 'warning', 'Custom shapes use the shape designer\'s own bend rules, not the selected code profile.', `Check bend diameters and hooks manually against ${profile.name}.`);
      continue;
    }

    const bend = resolveBendDiameter(profile, s, d, use);
    if (bend.missing) {
      add(b, 'error', `Missing code data: ${bend.missing}.`, 'Enter the value in Project Settings → Code rules (manual override).');
    } else if (bend.manual && profile.family === 'ACI') {
      add(b, 'info', `Manual bend diameter ${bend.label} used.`, 'Confirm it is not below the code minimum.');
    }

    const mainMin = profile.mainBend.value ? resolveBendDiameter({ ...profile }, {}, d, use) : null;
    if (mainMin?.mm && bend.mm && bend.manual && bend.mm < mainMin.mm) {
      add(b, 'error', `Bend diameter ${bend.label} is below the ${profile.name} minimum ${mainMin.label} (${mainMin.clause}).`, 'Increase the pin diameter.');
    }

    // Hook extension vs leg lengths for L / U bars (leg must hold the standard 90° extension).
    if (b.shapeCode === '11' || b.shapeCode === '21') {
      const ext = resolveHookExtension(profile, s, '90', 'main', d);
      if (ext.missing) {
        add(b, 'error', `Missing code data: ${ext.missing}.`, 'Enter the value in Project Settings → Code rules.');
      } else if (ext.mm) {
        const legs = b.shapeCode === '11' ? [b.dimB ?? 0] : [b.dimA, b.dimC ?? 0];
        if (legs.some((l) => l * 1000 < ext.mm! - 0.5)) {
          add(b, 'error', `Hook leg shorter than the standard 90° extension ${ext.label} = ${ext.mm.toFixed(0)} mm (${ext.clause}).`, 'Lengthen the hook leg.');
        }
      }
    } else if (b.shapeCode === '51' || b.shapeCode === '81') {
      const ext = resolveHookExtension(profile, s, '135', 'fitment', d);
      if (ext.missing) add(b, 'error', `Missing code data: ${ext.missing}.`, 'Enter the value in Project Settings → Code rules.');
    }

    // Minimum practical straight leg: 4 db (check 7).
    const legsMm = [b.dimA, b.dimB, b.dimC].filter((v): v is number => !!v && v > 0).map((v) => v * 1000);
    if (b.shapeCode !== '77' && legsMm.some((l) => l < 4 * d)) {
      add(b, 'warning', `A leg is shorter than 4 db (${4 * d} mm).`, 'Check the dimension; very short legs are hard to fabricate.');
    }

    if (b.cuttingLength > stockM) {
      const lap = codeTensionLapMm(d, profile, s);
      add(b, 'warning', `Cut length ${b.cuttingLength.toFixed(3)} m exceeds ${stockM} m stock.`, lap ? `Schedule a lap of about ${(lap / 1000).toFixed(2)} m (${profile.name}) or a coupler.` : 'Schedule a lap or coupler; lap data is incomplete.');
    }

    if (s.epoxyCoated) {
      add(b, 'warning', 'Epoxy-coated bars: the specification may require larger bend diameters.', 'Edit the bend multiplier or confirm with the specification.');
    }
  }
  return issues;
}

/** Missing LOAD-FROM-STANDARD data used by any bar (blocks final exports). */
export function getMissingCodeData(bars: BarItem[], meta: Pick<ProjectMetadata, 'standard' | 'codeSettings'>): string[] {
  const profile = PROFILES[meta.standard] ?? PROFILES['IS 2502 / SP 34'];
  if (profile.family === 'legacy') return [];
  const s = meta.codeSettings ?? {};
  const out = new Set<string>();
  for (const b of bars) {
    if (b.shapeCode === '99') continue;
    const r = profileCuttingLength(b.shapeCode, { A: 0.1, B: 0.1, C: 0.1, D: 0, E: 0 }, b.diameter, profile, s);
    r?.missingData?.forEach((m) => out.add(m));
  }
  return Array.from(out);
}

/** Lines for the "Assumptions and clauses" section of exports. */
export function codeAssumptions(meta: Pick<ProjectMetadata, 'standard' | 'codeSettings'>): string[] {
  const profile = PROFILES[meta.standard] ?? PROFILES['IS 2502 / SP 34'];
  if (profile.family === 'legacy') return [];
  const s = meta.codeSettings ?? {};
  const lines = [
    `Code: ${profile.name} (${profile.edition}); fy = ${s.fy ?? profile.defaults.fy} MPa; f'c = ${s.fc ?? profile.defaults.fc} MPa`,
    `Cut-length method: out-to-out dimensions with bend deductions; 135° hooks by centerline; rounded up to ${s.roundUpMm ?? 5} mm`,
  ];
  const addRule = (label: string, r: { clause: string; verify?: boolean }) => lines.push(`${label}: ${r.clause}${r.verify ? ' (VERIFY)' : ''}`);
  addRule('Bend diameters', profile.mainBend);
  if (profile.hooks.main90) addRule('Hook extensions', profile.hooks.fitment135);
  if (s.manualBendMain || s.manualBendFitment || s.manualExt90 || s.manualExt135 || s.manualExt180) {
    lines.push('Manual overrides entered for LOAD-FROM-STANDARD values (bend diameter / hook extension).');
  }
  if (s.epoxyCoated) lines.push('Epoxy-coated bars assumed.');
  return lines;
}
