import { ShapeCode, RebarDiameter, CustomSegment, CustomHook } from '../types/bbs';
import { getSeismicHookExtensionMeters } from './engineering';
import { resolveHookLength, buildCustomShapeGeometry } from './rebarGeometry';

export interface ShapeDefinition {
  code: ShapeCode;
  isCode: string; // Indian Standard 2502 reference
  bsCode: string; // British Standard 8666 reference
  name: string;
  description: string;
  formulaDisplay: string;
  dimensionsRequired: ('A' | 'B' | 'C' | 'D' | 'E' | 'F')[];
  dimensionLabels: Record<string, string>;
  defaultDimensions: Partial<Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', number>>;
}

/**
 * Resolves a hook's length addition and bend deduction. Delegates to the
 * centralized geometry engine (rebarGeometry.ts) so this is the same result
 * used by the CAD preview — see that module for the full formulas, including
 * arbitrary-angle ('custom' type) hooks.
 */
export function getHookLengthAndDeduction(hook?: CustomHook, diameterMm: number = 12): {
  hookAddition: number;
  hookDeduction: number;
  desc: string;
} {
  return resolveHookLength(hook, diameterMm);
}

export const SHAPE_LIBRARY: Record<ShapeCode, ShapeDefinition> = {
  '00': {
    code: '00',
    isCode: 'IS 01',
    bsCode: 'BS 00',
    name: 'Straight Bar',
    description: 'Longitudinal main reinforcement, distribution rebar, slab bottom bar',
    formulaDisplay: 'A',
    dimensionsRequired: ['A'],
    dimensionLabels: { A: 'Overall Length A (m)' },
    defaultDimensions: { A: 4.500 },
  },
  '11': {
    code: '11',
    isCode: 'IS 02',
    bsCode: 'BS 11',
    name: 'L-Bar / 90° Starter Hook',
    description: 'Column starter dowel, beam anchor, retaining wall key',
    formulaDisplay: 'A + B - 2d',
    dimensionsRequired: ['A', 'B'],
    dimensionLabels: { A: 'Straight Run A (m)', B: '90° Leg / Hook B (m)' },
    defaultDimensions: { A: 2.400, B: 0.450 },
  },
  '21': {
    code: '21',
    isCode: 'IS 03',
    bsCode: 'BS 21',
    name: 'U-Bar / Trough Bar',
    description: 'Beam end anchorage, slab border U-ties, pile cap U-mesh, culvert edge',
    formulaDisplay: 'A + B + C - 4d',
    dimensionsRequired: ['A', 'B', 'C'],
    dimensionLabels: { A: 'Left Return A (m)', B: 'Main Base B (m)', C: 'Right Return C (m)' },
    defaultDimensions: { A: 0.350, B: 1.800, C: 0.350 },
  },
  '51': {
    code: '51',
    isCode: 'IS 06',
    bsCode: 'BS 51',
    name: 'Rectangular Stirrup (135° Hooks)',
    description: 'Beam shear stirrups & column confinement ties with seismic ductile hooks',
    formulaDisplay: '2(A + B) + 24d - 5(bends)',
    dimensionsRequired: ['A', 'B'],
    dimensionLabels: { A: 'Horizontal Width A (m)', B: 'Vertical Depth B (m)' },
    defaultDimensions: { A: 0.250, B: 0.400 },
  },
  '41': {
    code: '41',
    isCode: 'IS 04',
    bsCode: 'BS 41',
    name: 'Cranked / Bent-up Bar (45°)',
    description: 'Slab/beam bottom-to-top continuous shear & negative moment bar',
    formulaDisplay: 'A + C + E + 2(0.42H) - 4(1d)',
    dimensionsRequired: ['A', 'B', 'C', 'D', 'E'],
    dimensionLabels: {
      A: 'Left Bottom A (m)',
      B: 'Crank Depth H (m)',
      C: 'Top Flat Run C (m)',
      D: 'Second Crank Depth (m)',
      E: 'Right Bottom E (m)',
    },
    defaultDimensions: { A: 1.200, B: 0.120, C: 1.600, D: 0.120, E: 1.200 },
  },
  '31': {
    code: '31',
    isCode: 'IS 08',
    bsCode: 'BS 31',
    name: 'Rebar Chair / Stool Bar',
    description: 'Support stool for slab top reinforcement mesh and mat foundation spacers',
    formulaDisplay: 'A + 2B + 2C - 4(2d)',
    dimensionsRequired: ['A', 'B', 'C'],
    dimensionLabels: { A: 'Top Resting Head A (m)', B: 'Chair Height B (m)', C: 'Footing Spread C (m)' },
    defaultDimensions: { A: 0.450, B: 0.150, C: 0.250 },
  },
  '71': {
    code: '71',
    isCode: 'IS 09',
    bsCode: 'BS 71',
    name: 'Capping Bar / Kerb Tie',
    description: 'Bridge deck slab edge capping, parapet kerb tie, retaining wall coping',
    formulaDisplay: 'A + B + C - 4d',
    dimensionsRequired: ['A', 'B', 'C'],
    dimensionLabels: { A: 'Vertical Drop A (m)', B: 'Horizontal Crown B (m)', C: 'Vertical Drop C (m)' },
    defaultDimensions: { A: 0.300, B: 0.450, C: 0.300 },
  },
  '61': {
    code: '61',
    isCode: 'IS 07',
    bsCode: 'BS 61',
    name: '45° Haunch Corner Tie',
    description: 'Culvert corner rigid frame haunch diagonal reinforcement',
    formulaDisplay: 'A + 2B - 2(1d)',
    dimensionsRequired: ['A', 'B'],
    dimensionLabels: { A: 'Diagonal Haunch Hypotenuse A (m)', B: 'Anchor Legs B (m)' },
    defaultDimensions: { A: 0.420, B: 0.300 },
  },
  '81': {
    code: '81',
    isCode: 'IS 81',
    bsCode: 'BS 81',
    name: 'Diamond Column Inner Tie',
    description: 'Internal rhombic tie for 8-bar or 12-bar rectangular column confinement',
    formulaDisplay: '4(hypotenuse) + 24d - 5(bends)',
    dimensionsRequired: ['A', 'B'],
    dimensionLabels: { A: 'Horizontal Span A (m)', B: 'Vertical Span B (m)' },
    defaultDimensions: { A: 0.300, B: 0.400 },
  },
  '77': {
    code: '77',
    isCode: 'IS 77',
    bsCode: 'BS 77',
    name: 'Circular Stirrup / Spiral Hoop',
    description: 'Circular column or bored pile rebar cage hoop tie with overlap',
    formulaDisplay: 'π·D + Lap (min 40d)',
    dimensionsRequired: ['A', 'B'],
    dimensionLabels: { A: 'Internal Core Diameter D (m)', B: 'Lap Length (m)' },
    defaultDimensions: { A: 0.400, B: 0.400 },
  },
  '99': {
    code: '99',
    isCode: 'Custom',
    bsCode: 'BS 99',
    name: 'Custom Multi-Segment Designer',
    description: 'Parametric multi-segment bar with arbitrary bend angles and directions',
    formulaDisplay: '∑(segments) - ∑(bends)',
    dimensionsRequired: ['A'],
    dimensionLabels: { A: 'Total / Base Length (m)' },
    defaultDimensions: { A: 1.000 },
  },
};

export interface CuttingLengthResult {
  cuttingLength: number; // in meters (rounded to 3 decimals)
  formulaExplanation: string;
  totalStraightLength: number;
  totalBendDeductions: number;
  hookExtensions: number;
}

/**
 * Calculates cutting length and mathematical formula derivation breakdown
 * strictly following IS 2502 / BS 8666 standards.
 */
export function calculateBarCuttingLength(
  shapeCode: ShapeCode,
  dimA: number = 0,
  dimB: number = 0,
  dimC: number = 0,
  dimD: number = 0,
  dimE: number = 0,
  _dimF: number = 0,
  diameterMm: RebarDiameter = 12,
  customSegments?: CustomSegment[],
  startHook?: CustomHook,
  endHook?: CustomHook
): CuttingLengthResult {
  const dMeters = diameterMm / 1000;
  let cuttingLength = 0;
  let formulaExplanation = '';
  let totalStraight = 0;
  let totalDeductions = 0;
  let hookExtensions = 0;

  switch (shapeCode) {
    case '00': {
      // Straight bar
      totalStraight = dimA;
      totalDeductions = 0;
      cuttingLength = dimA;
      formulaExplanation = `L = A = ${dimA.toFixed(3)} m (No bends)`;
      break;
    }

    case '11': {
      // L-Bar: One 90° bend -> deduct 2d
      const bendDed = 2 * dMeters;
      totalStraight = dimA + dimB;
      totalDeductions = bendDed;
      cuttingLength = totalStraight - totalDeductions;
      formulaExplanation = `L = A + B - 2d = ${dimA.toFixed(3)} + ${dimB.toFixed(3)} - 2×(${diameterMm}mm) = ${cuttingLength.toFixed(3)} m [Deduct 2d = -${bendDed.toFixed(3)}m]`;
      break;
    }

    case '21': {
      // U-Bar: Two 90° bends -> deduct 2 × 2d = 4d
      const bendDed = 4 * dMeters;
      totalStraight = dimA + dimB + dimC;
      totalDeductions = bendDed;
      cuttingLength = totalStraight - totalDeductions;
      formulaExplanation = `L = A + B + C - 4d = ${dimA.toFixed(3)} + ${dimB.toFixed(3)} + ${dimC.toFixed(3)} - 4×(${diameterMm}mm) = ${cuttingLength.toFixed(3)} m [Deduct 2×90° = -${bendDed.toFixed(3)}m]`;
      break;
    }

    case '51': {
      // Closed Rectangular Stirrup with 135° seismic ductile hooks:
      const hookExt = getSeismicHookExtensionMeters(diameterMm);
      hookExtensions = 2 * hookExt;
      const straightPerimeter = 2 * (dimA + dimB);
      totalStraight = straightPerimeter;
      
      const bendDed90 = 3 * (2 * dMeters);
      const bendDed135 = 2 * (3 * dMeters);
      totalDeductions = bendDed90 + bendDed135;
      
      cuttingLength = straightPerimeter + hookExtensions - totalDeductions;
      formulaExplanation = `L = 2(A+B) + 2×Hook(10d/75mm) - 3(2d) - 2(3d) = 2×(${dimA.toFixed(3)}+${dimB.toFixed(3)}) + 2×${hookExt.toFixed(3)} - ${totalDeductions.toFixed(3)}m = ${cuttingLength.toFixed(3)} m`;
      break;
    }

    case '41': {
      const h1 = dimB;
      const h2 = dimD > 0 ? dimD : dimB;
      const crankAdd1 = 0.42 * h1;
      const crankAdd2 = dimD > 0 || dimE > 0 ? 0.42 * h2 : 0;
      totalStraight = dimA + dimC + dimE + (h1 + h2);
      
      const bendDed = 4 * (1 * dMeters);
      totalDeductions = bendDed;
      
      cuttingLength = (dimA + dimC + dimE + crankAdd1 + crankAdd2) - totalDeductions;
      formulaExplanation = `L = A + C + E + 2×(0.42×H) - 4×(1d) = ${dimA.toFixed(3)} + ${dimC.toFixed(3)} + ${dimE.toFixed(3)} + ${(crankAdd1 + crankAdd2).toFixed(3)} - ${bendDed.toFixed(3)}m = ${cuttingLength.toFixed(3)} m`;
      break;
    }

    case '31': {
      totalStraight = dimA + 2 * dimB + 2 * dimC;
      const bendDed = 4 * (2 * dMeters);
      totalDeductions = bendDed;
      cuttingLength = totalStraight - totalDeductions;
      formulaExplanation = `L = A + 2B + 2C - 8d = ${dimA.toFixed(3)} + 2×${dimB.toFixed(3)} + 2×${dimC.toFixed(3)} - ${bendDed.toFixed(3)}m = ${cuttingLength.toFixed(3)} m`;
      break;
    }

    case '71': {
      totalStraight = dimA + dimB + dimC;
      const bendDed = 2 * (2 * dMeters);
      totalDeductions = bendDed;
      cuttingLength = totalStraight - totalDeductions;
      formulaExplanation = `L = A + B + C - 4d = ${dimA.toFixed(3)} + ${dimB.toFixed(3)} + ${dimC.toFixed(3)} - ${bendDed.toFixed(3)}m = ${cuttingLength.toFixed(3)} m`;
      break;
    }

    case '61': {
      totalStraight = dimA + 2 * dimB;
      const bendDed = 2 * (2 * dMeters);
      totalDeductions = bendDed;
      cuttingLength = totalStraight - totalDeductions;
      formulaExplanation = `L = A + 2B - 4d = ${dimA.toFixed(3)} + 2×${dimB.toFixed(3)} - ${bendDed.toFixed(3)}m = ${cuttingLength.toFixed(3)} m`;
      break;
    }

    case '81': {
      const halfA = dimA / 2;
      const halfB = dimB / 2;
      const sideLength = Math.sqrt(halfA * halfA + halfB * halfB);
      const perimeter = 4 * sideLength;
      const hookExt = getSeismicHookExtensionMeters(diameterMm);
      hookExtensions = 2 * hookExt;
      totalStraight = perimeter;
      const bendDed = 4 * (2 * dMeters);
      totalDeductions = bendDed;
      cuttingLength = perimeter + hookExtensions - totalDeductions;
      formulaExplanation = `L = 4×√( (A/2)² + (B/2)² ) + 2×Hook - 8d = 4×${sideLength.toFixed(3)} + 2×${hookExt.toFixed(3)} - ${bendDed.toFixed(3)}m = ${cuttingLength.toFixed(3)} m`;
      break;
    }

    case '77': {
      const circumference = Math.PI * dimA;
      const lap = dimB > 0 ? dimB : Math.max(40 * dMeters, 0.300);
      totalStraight = circumference + lap;
      totalDeductions = 0;
      cuttingLength = totalStraight;
      formulaExplanation = `L = π×D + Lap = π×${dimA.toFixed(3)} + ${lap.toFixed(3)} = ${cuttingLength.toFixed(3)} m`;
      break;
    }

    case '99': {
      // Custom multi-segment with start & end hooks and arbitrary bend angles
      return calculateCustomShapeCuttingLength(customSegments || [{ id: '1', length: dimA, angle: 0, direction: 'straight' }], startHook, endHook, diameterMm);
    }

    default:
      totalStraight = dimA;
      cuttingLength = dimA;
      formulaExplanation = `L = A = ${dimA.toFixed(3)} m`;
  }

  // Ensure positive number rounded to 3 decimals
  const finalCut = Number(Math.max(0.01, cuttingLength).toFixed(3));

  return {
    cuttingLength: finalCut,
    formulaExplanation,
    totalStraightLength: Number(totalStraight.toFixed(3)),
    totalBendDeductions: Number(totalDeductions.toFixed(3)),
    hookExtensions: Number(hookExtensions.toFixed(3)),
  };
}

/**
 * Calculates cutting length and formula derivation for complex custom shapes
 * with arbitrary bend angles, direction, segment lengths, and start/end hooks.
 * Delegates to the centralized geometry engine (rebarGeometry.ts) — the exact
 * same geometry used to draw the CAD preview, so numbers never drift apart.
 */
export function calculateCustomShapeCuttingLength(
  segments: CustomSegment[],
  startHook?: CustomHook,
  endHook?: CustomHook,
  diameterMm: RebarDiameter = 12
): CuttingLengthResult {
  const geo = buildCustomShapeGeometry(segments, startHook, endHook, diameterMm);
  return {
    cuttingLength: geo.cuttingLength,
    formulaExplanation: geo.formulaExplanation,
    totalStraightLength: Number(geo.segments.reduce((sum, s) => sum + s.length, 0).toFixed(3)),
    totalBendDeductions: geo.totalBendDeductions,
    hookExtensions: Number(((geo.startHook?.additionMeters || 0) + (geo.endHook?.additionMeters || 0)).toFixed(3)),
  };
}
