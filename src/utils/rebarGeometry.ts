/**
 * rebarGeometry.ts
 * ============================================================================
 * Centralized parametric 2D geometry engine for custom (shape-code "99") rebar.
 *
 * This is the single source of truth for:
 *   - resolving a list of CustomSegment[] into real (x, y) vector geometry
 *   - resolving start/end hooks at ANY angle (0-360°, decimals allowed)
 *   - computing bend deductions for arbitrary bend angles
 *   - computing the final fabrication cutting length
 *   - producing validation warnings (never silently "fixing" engineering data)
 *
 * Both the CAD preview (RebarCanvas) and the BBS cutting-length calculation
 * (shapes.ts -> calculateCustomShapeCuttingLength) are built on top of this
 * module, so the geometry a user sees is mathematically the same geometry
 * used to compute quantities. There is no separate/duplicate calculation.
 *
 * BACKWARD COMPATIBILITY
 * -----------------------------------------------------------------------
 * Every CustomSegment/CustomHook saved before this engine existed used
 * `direction` (up/down/left/right/crank-up/crank-down/hook-return/straight)
 * and a fixed HookType ('none'|'hook-90'|'hook-135'|'hook-180'). Those are
 * still fully supported and render/calculate EXACTLY as before — nothing
 * about old data changes meaning.
 *
 * Arbitrary-angle geometry is unlocked additively via:
 *   - CustomSegment.direction === 'custom'   (new)
 *   - CustomHook.type === 'custom'           (new)
 * Old shapes never use these values, so they are unaffected.
 * ============================================================================
 */

import { CustomSegment, CustomHook, HookType } from '../types/bbs';
import { getSeismicHookExtensionMeters, get180HookExtensionMeters } from './engineering';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AngleMode = 'absolute' | 'relative';

/**
 * How a bend's deduction (or hook's bend allowance) is calculated.
 *  - IS_2502_LINEAR: the standard code-table approach. Matches IS 2502 / BS
 *    8666 exactly at 45°/90°/135°/180° (1d/2d/3d/4d) and linearly
 *    interpolates/extrapolates for any other angle. This is the default and
 *    is what nearly all commercial BBS software uses for non-tabulated
 *    angles — it is a defensible simplification, not a guarantee of code
 *    compliance for every angle.
 *  - CUSTOM_RADIUS: derives the deduction directly from a user-specified (or
 *    diameter-derived) bend radius using real bend-allowance geometry
 *    (tangent setback vs. neutral-axis arc length). Labelled as approximate
 *    in the UI — always verify against the governing standard.
 */
export type BendCalculationMethod = 'IS_2502_LINEAR' | 'CUSTOM_RADIUS';

export interface GeomPoint {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface SegmentGeometry {
  id: string;
  label: string;
  length: number;
  start: GeomPoint;
  end: GeomPoint;
  /** Resolved absolute orientation of this segment, normalized 0-360°. 0°=+X, 90°=+Y. */
  absoluteAngle: number;
  /** Signed bend relative to the previous segment (0 for the first segment). */
  turnAngle: number;
  bendDeductionMeters: number;
}

export interface HookGeometry {
  label: string;
  basePoint: GeomPoint;
  baseHeading: number;
  hookHeading: number;
  turnAngle: number;
  radius: number;
  tipPoint: GeomPoint;
  extensionLength: number;
  additionMeters: number;
  deductionMeters: number;
  desc: string;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
}

export interface HookLengthResult {
  hookAddition: number;
  hookDeduction: number;
  desc: string;
}

export interface BuildGeometryOptions {
  method?: BendCalculationMethod;
  /** Global bend-radius override (meters), used only by CUSTOM_RADIUS method when a segment/hook doesn't specify its own. */
  radiusMeters?: number;
  stockLengthMeters?: number;
}

export interface CustomShapeGeometryResult {
  segments: SegmentGeometry[];
  startHook: HookGeometry | null;
  endHook: HookGeometry | null;
  boundingBox: BoundingBox;
  totalCenterlineLength: number;
  totalBendDeductions: number;
  cuttingLength: number;
  formulaExplanation: string;
  warnings: ValidationIssue[];
}

// ---------------------------------------------------------------------------
// Basic angle / vector math
// ---------------------------------------------------------------------------

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Normalizes any angle (e.g. -30 or 390) to the range [0, 360). */
export function normalizeAngle(deg: number): number {
  let a = deg % 360;
  if (a < 0) a += 360;
  return a;
}

/** Normalizes a bend/turn to the range (-180, 180], preserving turn direction (sign). */
export function normalizeTurn(deg: number): number {
  let a = normalizeAngle(deg);
  if (a > 180) a -= 360;
  return a;
}

export function vectorFromAngle(length: number, angleDeg: number): GeomPoint {
  const rad = toRad(angleDeg);
  return { x: length * Math.cos(rad), y: length * Math.sin(rad) };
}

export function calculateBoundingBox(points: GeomPoint[]): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

// ---------------------------------------------------------------------------
// Bend deduction (generalized, arbitrary-angle capable)
// ---------------------------------------------------------------------------

/**
 * Computes the fabrication bend deduction for a bend of the given (unsigned)
 * angle. `turnAngleAbsDeg` should be the actual physical change of direction
 * at the bend (0-180°) — not a raw heading value that could exceed 180°.
 */
export function calculateBendDeductionMeters(
  turnAngleAbsDeg: number,
  diameterMm: number,
  method: BendCalculationMethod = 'IS_2502_LINEAR',
  radiusMeters?: number
): number {
  const dMeters = diameterMm / 1000;
  const angle = Math.max(0, Math.min(180, Math.abs(turnAngleAbsDeg)));

  if (method === 'CUSTOM_RADIUS') {
    // Real bend-allowance geometry: setback (tangent length to the theoretical
    // sharp corner) vs. the neutral-axis arc length actually consumed by the bend.
    const R = radiusMeters && radiusMeters > 0 ? radiusMeters : 2 * dMeters;
    const rad = toRad(angle);
    const setback = R * Math.tan(rad / 2);
    const arcLength = R * rad;
    return Math.max(0, Number((2 * setback - arcLength).toFixed(4)));
  }

  // IS_2502_LINEAR (default) — exact at the four tabulated angles, linear elsewhere.
  if (Math.abs(angle - 45) < 0.01) return Number((1 * dMeters).toFixed(4));
  if (Math.abs(angle - 90) < 0.01) return Number((2 * dMeters).toFixed(4));
  if (Math.abs(angle - 135) < 0.01) return Number((3 * dMeters).toFixed(4));
  if (Math.abs(angle - 180) < 0.01) return Number((4 * dMeters).toFixed(4));
  return Number(((angle / 45) * dMeters).toFixed(4));
}

// ---------------------------------------------------------------------------
// Segment heading resolution
// ---------------------------------------------------------------------------

/**
 * Resolves the absolute heading of a segment given the previous segment's
 * heading. Legacy `direction` values reproduce the exact historical
 * behavior (including using the raw entered angle, not the true heading
 * delta, for deduction purposes — preserving old cutting-length results).
 * `direction === 'custom'` unlocks true arbitrary-angle absolute/relative
 * geometry with no 180° cap and full decimal precision.
 */
export function resolveSegmentHeading(
  prevHeading: number,
  seg: CustomSegment,
  isFirst: boolean
): { heading: number; turnForDeduction: number } {
  if (seg.direction === 'custom') {
    const angle = seg.angle || 0;
    let heading: number;
    if (isFirst) {
      heading = seg.angleMode === 'relative' ? 0 : normalizeAngle(angle);
    } else if (seg.angleMode === 'absolute') {
      heading = normalizeAngle(angle);
    } else {
      heading = normalizeAngle(prevHeading + angle);
    }
    const turnForDeduction = isFirst ? 0 : normalizeTurn(heading - prevHeading);
    return { heading, turnForDeduction };
  }

  if (isFirst) {
    return { heading: 0, turnForDeduction: 0 };
  }

  // --- Legacy direction model (unchanged from the original implementation) ---
  const ang = seg.angle || 90;
  let delta = 0;
  if (seg.direction === 'up' || seg.direction === 'crank-up') delta = -ang;
  else if (seg.direction === 'down' || seg.direction === 'crank-down') delta = ang;
  else if (seg.direction === 'hook-return') delta = 180;
  else if (seg.direction === 'left') delta = 180 - ang;
  else delta = 0; // 'straight' / 'right'

  const heading = normalizeAngle(prevHeading + delta);
  // Legacy behavior always deducted based on the raw entered angle, regardless
  // of direction — preserved here so old saved bars keep the same cutting length.
  return { heading, turnForDeduction: ang };
}

// ---------------------------------------------------------------------------
// Hooks (arbitrary angle)
// ---------------------------------------------------------------------------

function legacyHookAngleMagnitude(type: HookType): number {
  if (type === 'hook-135') return 135;
  if (type === 'hook-180') return 180;
  if (type === 'hook-90') return 90;
  return 0;
}

/**
 * Resolves a hook's length addition and bend deduction. Legacy hook types
 * (none/90/135/180) reproduce the exact original formulas. `type === 'custom'`
 * uses the hook's own angle/extension/radius/mandrel fields.
 */
export function resolveHookLength(
  hook: CustomHook | undefined,
  diameterMm: number,
  method: BendCalculationMethod = 'IS_2502_LINEAR'
): HookLengthResult {
  if (!hook || hook.type === 'none') {
    return { hookAddition: 0, hookDeduction: 0, desc: 'None' };
  }

  const dMeters = diameterMm / 1000;

  if (hook.type === 'hook-90') {
    const len = hook.lengthMeters !== undefined && hook.lengthMeters > 0 ? hook.lengthMeters : Math.max(12 * dMeters, 0.1);
    const ded = 2 * dMeters;
    return { hookAddition: Number(len.toFixed(3)), hookDeduction: Number(ded.toFixed(3)), desc: `90° Hook (+${len.toFixed(3)}m, -2d)` };
  }

  if (hook.type === 'hook-135') {
    const defaultLen = getSeismicHookExtensionMeters(diameterMm);
    const len = hook.lengthMeters !== undefined && hook.lengthMeters > 0 ? hook.lengthMeters : defaultLen;
    const ded = 3 * dMeters;
    return { hookAddition: Number(len.toFixed(3)), hookDeduction: Number(ded.toFixed(3)), desc: `135° Seismic Hook (+${len.toFixed(3)}m, -3d)` };
  }

  if (hook.type === 'hook-180') {
    const defaultLen = get180HookExtensionMeters(diameterMm) + 2 * dMeters;
    const len = hook.lengthMeters !== undefined && hook.lengthMeters > 0 ? hook.lengthMeters : defaultLen;
    const ded = 4 * dMeters;
    return { hookAddition: Number(len.toFixed(3)), hookDeduction: Number(ded.toFixed(3)), desc: `180° Hook (+${len.toFixed(3)}m, -4d)` };
  }

  if (hook.type === 'custom') {
    const angleAbs = Math.min(180, Math.abs(hook.angle ?? 90));
    const mandrelFactor = hook.mandrelFactor ?? (angleAbs >= 135 ? 4 : angleAbs >= 90 ? 2.5 : 2);
    const radius = hook.radius && hook.radius > 0 ? hook.radius : mandrelFactor * dMeters;
    const minExtension = Math.max(4 * dMeters, 0.065);
    const extension = hook.extensionLength && hook.extensionLength > 0 ? hook.extensionLength : Math.max(minExtension, 6 * dMeters);
    const ded = calculateBendDeductionMeters(angleAbs, diameterMm, method, radius);
    return {
      hookAddition: Number(extension.toFixed(3)),
      hookDeduction: Number(ded.toFixed(3)),
      desc: `Custom Hook @ ${angleAbs.toFixed(1)}° (+${extension.toFixed(3)}m, R=${radius.toFixed(3)}m) — verify`,
    };
  }

  return { hookAddition: 0, hookDeduction: 0, desc: 'None' };
}

export function buildHookGeometry(
  basePoint: GeomPoint,
  baseHeading: number,
  hook: CustomHook | undefined,
  diameterMm: number,
  method: BendCalculationMethod,
  radiusOverride: number | undefined,
  isStart: boolean
): HookGeometry | null {
  if (!hook || hook.type === 'none') return null;

  const dMeters = diameterMm / 1000;
  const lengthResult = resolveHookLength(hook, diameterMm, method);

  let hookHeading: number;
  let radius: number;

  if (hook.type === 'custom') {
    const angle = hook.angle ?? 90;
    if (hook.angleMode === 'absolute') {
      hookHeading = normalizeAngle(angle);
    } else {
      const sign = hook.rotation === 'cw' ? -1 : 1;
      hookHeading = normalizeAngle(baseHeading + sign * angle);
    }
    radius = hook.radius && hook.radius > 0 ? hook.radius : (hook.mandrelFactor ?? 2) * dMeters;
  } else {
    const mag = legacyHookAngleMagnitude(hook.type);
    hookHeading = normalizeAngle(isStart ? baseHeading - mag : baseHeading + mag);
    radius = radiusOverride && radiusOverride > 0 ? radiusOverride : (mag >= 135 ? 4 : 2) * dMeters;
  }

  const turn = normalizeTurn(hookHeading - baseHeading);
  const extension = Math.max(0.02, lengthResult.hookAddition);
  const vec = vectorFromAngle(extension, hookHeading);
  const tipPoint = { x: basePoint.x + vec.x, y: basePoint.y + vec.y };

  return {
    label: isStart ? 'Start Hook' : 'End Hook',
    basePoint,
    baseHeading,
    hookHeading,
    turnAngle: turn,
    radius: Math.max(0.01, radius),
    tipPoint,
    extensionLength: extension,
    additionMeters: lengthResult.hookAddition,
    deductionMeters: lengthResult.hookDeduction,
    desc: lengthResult.desc,
  };
}

/** Rounded-corner (fillet) helper for rendering a bend of the given radius between two headings, meeting at `corner`. */
export function computeFilletArc(
  corner: GeomPoint,
  headingIn: number,
  headingOut: number,
  radius: number
): { p1: GeomPoint; p2: GeomPoint; sweepCcw: boolean; largeArc: boolean } {
  const inVec = vectorFromAngle(radius, headingIn);
  const outVec = vectorFromAngle(radius, headingOut);
  const p1 = { x: corner.x - inVec.x, y: corner.y - inVec.y };
  const p2 = { x: corner.x + outVec.x, y: corner.y + outVec.y };
  const turn = normalizeTurn(headingOut - headingIn);
  return { p1, p2, sweepCcw: turn > 0, largeArc: Math.abs(turn) > 180 };
}

// ---------------------------------------------------------------------------
// Self-intersection detection (simple, non-adjacent segment pairs)
// ---------------------------------------------------------------------------

function cross(o: GeomPoint, a: GeomPoint, b: GeomPoint): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function segmentsIntersect(p1: GeomPoint, p2: GeomPoint, p3: GeomPoint, p4: GeomPoint): boolean {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
}

export function detectSelfIntersection(segGeo: SegmentGeometry[]): boolean {
  for (let i = 0; i < segGeo.length; i++) {
    for (let j = i + 2; j < segGeo.length; j++) {
      if (segmentsIntersect(segGeo[i].start, segGeo[i].end, segGeo[j].start, segGeo[j].end)) {
        return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Validation (never silently modifies engineering data — only reports)
// ---------------------------------------------------------------------------

export function validateCustomShapeGeometry(
  segGeo: SegmentGeometry[],
  startHook: HookGeometry | null,
  endHook: HookGeometry | null,
  diameterMm: number,
  stockLengthMeters: number,
  cuttingLength: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const dMeters = diameterMm / 1000;
  const minPracticalSegment = Math.max(3 * dMeters, 0.03);

  if (diameterMm <= 0) {
    issues.push({ severity: 'error', code: 'INVALID_DIAMETER', message: 'Bar diameter must be greater than zero.' });
  }

  segGeo.forEach((s) => {
    if (s.length <= 0) {
      issues.push({ severity: 'error', code: 'ZERO_LENGTH', message: `Segment ${s.label} has zero or negative length.` });
    } else if (s.length < minPracticalSegment) {
      issues.push({
        severity: 'warning',
        code: 'SHORT_SEGMENT',
        message: `Segment ${s.label} (${s.length.toFixed(3)}m) is shorter than a practical fabrication minimum (~${minPracticalSegment.toFixed(3)}m for ${diameterMm}mm bar).`,
      });
    }
    if (Math.abs(s.turnAngle) > 0 && Math.abs(s.turnAngle) < 3) {
      issues.push({
        severity: 'info',
        code: 'NEGLIGIBLE_BEND',
        message: `Segment ${s.label} has a very small bend (${s.turnAngle.toFixed(1)}°) — consider a single straight run instead.`,
      });
    }
  });

  [startHook, endHook].forEach((h) => {
    if (!h) return;
    const minExt = Math.max(4 * dMeters, 0.065);
    if (h.extensionLength < minExt) {
      issues.push({
        severity: 'warning',
        code: 'SHORT_HOOK',
        message: `${h.label} extension (${h.extensionLength.toFixed(3)}m) is below a typical minimum of ${minExt.toFixed(3)}m for ${diameterMm}mm bar — verify against the governing standard.`,
      });
    }
  });

  if (cuttingLength > stockLengthMeters) {
    issues.push({
      severity: 'warning',
      code: 'EXCEEDS_STOCK',
      message: `Cutting length (${cuttingLength.toFixed(3)}m) exceeds the selected stock bar length (${stockLengthMeters.toFixed(3)}m). A lap splice or coupler will be required.`,
    });
  }

  if (detectSelfIntersection(segGeo)) {
    issues.push({
      severity: 'info',
      code: 'SELF_INTERSECT',
      message: 'This geometry appears to cross itself in 2D. Verify this is intended (e.g. some spiral/overlap shapes legitimately do).',
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Top-level builder — the single source of truth for custom-shape geometry
// ---------------------------------------------------------------------------

export function buildCustomShapeGeometry(
  segments: CustomSegment[],
  startHook: CustomHook | undefined,
  endHook: CustomHook | undefined,
  diameterMm: number,
  options: BuildGeometryOptions = {}
): CustomShapeGeometryResult {
  const method = options.method || 'IS_2502_LINEAR';
  const stockLengthMeters = options.stockLengthMeters ?? 12.0;
  const segs: CustomSegment[] =
    segments && segments.length > 0 ? segments : [{ id: '1', length: 1.0, angle: 0, direction: 'straight' }];

  let heading = 0;
  let cursor: GeomPoint = { x: 0, y: 0 };
  const segGeo: SegmentGeometry[] = [];
  let totalBendDeductions = 0;

  segs.forEach((seg, idx) => {
    const isFirst = idx === 0;
    const { heading: newHeading, turnForDeduction } = resolveSegmentHeading(heading, seg, isFirst);
    const length = Math.max(0.001, seg.length || 0);
    const vec = vectorFromAngle(length, newHeading);
    const start = cursor;
    const end = { x: cursor.x + vec.x, y: cursor.y + vec.y };

    const bendDed = isFirst ? 0 : calculateBendDeductionMeters(Math.abs(turnForDeduction), diameterMm, method, options.radiusMeters);
    totalBendDeductions += bendDed;

    segGeo.push({
      id: seg.id,
      label: seg.label || String.fromCharCode(65 + (idx % 26)),
      length,
      start,
      end,
      absoluteAngle: newHeading,
      turnAngle: isFirst ? 0 : normalizeTurn(newHeading - heading),
      bendDeductionMeters: bendDed,
    });

    heading = newHeading;
    cursor = end;
  });

  const firstHeading = segGeo[0]?.absoluteAngle ?? 0;
  const lastHeading = segGeo[segGeo.length - 1]?.absoluteAngle ?? 0;

  const startHookGeo = buildHookGeometry(segGeo[0]?.start ?? { x: 0, y: 0 }, firstHeading, startHook, diameterMm, method, options.radiusMeters, true);
  const endHookGeo = buildHookGeometry(cursor, lastHeading, endHook, diameterMm, method, options.radiusMeters, false);

  const allPoints: GeomPoint[] = [];
  if (startHookGeo) allPoints.push(startHookGeo.basePoint, startHookGeo.tipPoint);
  segGeo.forEach((s) => allPoints.push(s.start, s.end));
  if (endHookGeo) allPoints.push(endHookGeo.basePoint, endHookGeo.tipPoint);

  const boundingBox = calculateBoundingBox(allPoints);

  const totalStraight = segGeo.reduce((sum, s) => sum + s.length, 0);
  const hookAddition = (startHookGeo?.additionMeters || 0) + (endHookGeo?.additionMeters || 0);
  const hookDeduction = (startHookGeo?.deductionMeters || 0) + (endHookGeo?.deductionMeters || 0);
  const totalDeductions = totalBendDeductions + hookDeduction;
  const totalCenterlineLength = totalStraight + hookAddition;
  const cuttingLength = Math.max(0.02, totalCenterlineLength - totalDeductions);

  const parts: string[] = [`\u2211Segs=${totalStraight.toFixed(3)}m`];
  if (startHookGeo && startHookGeo.additionMeters > 0) parts.push(`StartHook=+${startHookGeo.additionMeters.toFixed(3)}m`);
  if (endHookGeo && endHookGeo.additionMeters > 0) parts.push(`EndHook=+${endHookGeo.additionMeters.toFixed(3)}m`);
  if (totalBendDeductions > 0) parts.push(`Bends=-${totalBendDeductions.toFixed(3)}m`);
  if (hookDeduction > 0) parts.push(`HookBends=-${hookDeduction.toFixed(3)}m`);
  const methodLabel = method === 'CUSTOM_RADIUS' ? 'Custom Bend Radius \u2014 approximate, verify' : 'IS 2502 / BS 8666 linear';
  const formulaExplanation = `L = ${parts.join(' ')} = ${cuttingLength.toFixed(3)} m (${methodLabel})`;

  const warnings = validateCustomShapeGeometry(segGeo, startHookGeo, endHookGeo, diameterMm, stockLengthMeters, cuttingLength);

  return {
    segments: segGeo,
    startHook: startHookGeo,
    endHook: endHookGeo,
    boundingBox,
    totalCenterlineLength: Number(totalCenterlineLength.toFixed(3)),
    totalBendDeductions: Number(totalDeductions.toFixed(3)),
    cuttingLength: Number(cuttingLength.toFixed(3)),
    formulaExplanation,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Whole-shape transforms (mirror / rotate) — operate on 'custom' segments only;
// legacy direction-based segments are left untouched so old shapes never change.
// ---------------------------------------------------------------------------

export function mirrorCustomSegments(segments: CustomSegment[]): CustomSegment[] {
  return segments.map((s, idx) => {
    if (s.direction !== 'custom') return s;
    if (idx === 0 && s.angleMode === 'absolute') {
      return { ...s, angle: normalizeAngle(180 - s.angle) };
    }
    return { ...s, angle: -s.angle };
  });
}

export function rotateCustomSegments(segments: CustomSegment[], deltaDeg: number): CustomSegment[] {
  return segments.map((s, idx) => {
    if (idx !== 0) return s;
    if (s.direction === 'custom' && s.angleMode === 'absolute') {
      return { ...s, angle: normalizeAngle(s.angle + deltaDeg) };
    }
    return { ...s, direction: 'custom' as const, angleMode: 'absolute' as const, angle: normalizeAngle(deltaDeg) };
  });
}
