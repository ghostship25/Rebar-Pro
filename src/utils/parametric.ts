import { SectionTemplate, BarItem, RebarDiameter } from '../types/bbs';
import { calculateBarCuttingLength } from './shapes';
import { getUnitWeight } from './engineering';

export interface ParametricContext {
  L: number; // Primary length / span / height
  B: number; // Width / secondary parameter
  D: number; // Depth / height
  cover: number; // Clear cover in meters (default 0.025)
  spans?: number; // Number of spans / elements
}

/**
 * Safely evaluates a simple mathematical string expression with given parameters.
 * Supports: +, -, *, /, (, ), ceil, round, floor, abs, min, max, and variables L, B, D, H, W, cover
 */
export function evaluateParametricMath(expression: string, context: ParametricContext): number {
  if (!expression || expression.trim() === '') return 0;

  const trimmed = expression.trim();
  // If it's just a number
  const directNum = parseFloat(trimmed);
  if (!isNaN(directNum) && directNum.toString() === trimmed) {
    return directNum;
  }

  try {
    // Sanitize string to allow only numbers, math functions, operators, and context keys
    let sanitized = trimmed
      .replace(/\bL\b/gi, context.L.toString())
      .replace(/\b(B|W)\b/gi, context.B.toString())
      .replace(/\b(D|H)\b/gi, context.D.toString())
      .replace(/\bcover\b/gi, context.cover.toString())
      .replace(/\bceil\b/gi, 'Math.ceil')
      .replace(/\bround\b/gi, 'Math.round')
      .replace(/\bfloor\b/gi, 'Math.floor')
      .replace(/\bmax\b/gi, 'Math.max')
      .replace(/\bmin\b/gi, 'Math.min')
      .replace(/\babs\b/gi, 'Math.abs');

    // Security check: ensure only Math, digits, operators, parens, decimal points, commas, spaces remain
    if (!/^[0-9+\-*/()., \tMathceilroundfloormaxminabs]+$/.test(sanitized)) {
      console.warn('Expression failed security regex check:', expression);
      return directNum || 0;
    }

    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${sanitized});`);
    const val = Number(fn());
    return isFinite(val) ? Number(val.toFixed(4)) : 0;
  } catch (err) {
    console.warn('Error evaluating expression:', expression, err);
    return directNum || 0;
  }
}

/**
 * Pre-defined Civil Engineering Section Templates
 */
export const DEFAULT_SECTION_TEMPLATES: SectionTemplate[] = [
  {
    id: 'tmpl-beam-standard',
    name: 'Standard RCC Continuous Beam',
    category: 'Beam',
    description: 'Generates bottom main bars, curtailment bars, top hanger bars, support extra steel, and shear stirrups for any span L.',
    primaryParamName: 'Clear Span L (m)',
    primaryParamDefault: 5.0,
    secondaryParamName: 'Beam Width B (m)',
    secondaryParamDefault: 0.30,
    depthParamName: 'Beam Depth D (m)',
    depthParamDefault: 0.50,
    coverParamDefault: 0.025,
    isPredefined: true,
    rules: [
      {
        id: 'r-beam-bot-main',
        barMarkSuffix: 'BM-01',
        description: 'Bottom Main Continuous Bars (Anchored into columns)',
        member: 'Beam',
        diameter: 16,
        shapeCode: '11', // L-Bar
        barsFormula: '3',
        dimAFormula: 'L + 0.30',
        dimBFormula: '0.45',
        remarks: 'Straight run across span with standard 90° anchorage hook',
      },
      {
        id: 'r-beam-bot-curtail',
        barMarkSuffix: 'BM-02',
        description: 'Bottom Curtailment Bars (Mid-span 0.70L)',
        member: 'Beam',
        diameter: 16,
        shapeCode: '00', // Straight
        barsFormula: '2',
        dimAFormula: '0.70 * L',
        remarks: 'Curtail at 0.15L from either face of support',
      },
      {
        id: 'r-beam-top-hanger',
        barMarkSuffix: 'BM-03',
        description: 'Top Hanger / Anchor Bars',
        member: 'Beam',
        diameter: 12,
        shapeCode: '11',
        barsFormula: '2',
        dimAFormula: 'L + 0.30',
        dimBFormula: '0.35',
        remarks: 'Hold top stirrup corners',
      },
      {
        id: 'r-beam-top-extra',
        barMarkSuffix: 'BM-04',
        description: 'Top Support Negative Moment Extra Bars (0.33L)',
        member: 'Beam',
        diameter: 16,
        shapeCode: '11',
        barsFormula: '2',
        dimAFormula: '0.33 * L + 0.25',
        dimBFormula: '0.45',
        remarks: 'Hogging moment rebar at support face',
      },
      {
        id: 'r-beam-stirrup',
        barMarkSuffix: 'BM-05',
        description: '2-Legged Vertical Shear Stirrups @ 150mm c/c',
        member: 'Beam',
        diameter: 8,
        shapeCode: '51', // Closed stirrup
        barsFormula: 'ceil(L / 0.150) + 1',
        dimAFormula: 'B - 2 * cover',
        dimBFormula: 'D - 2 * cover',
        remarks: '135° ductile seismic hooks (IS 13920)',
      },
    ],
  },
  {
    id: 'tmpl-column-story',
    name: 'Typical RCC Column Floor Story',
    category: 'Column',
    description: 'Generates longitudinal main bars with lap splice development, Zone A confinement stirrups, and mid-height Zone B ties for story height H.',
    primaryParamName: 'Floor-to-Floor Height H (m)',
    primaryParamDefault: 3.30,
    secondaryParamName: 'Column Width B (m)',
    secondaryParamDefault: 0.40,
    depthParamName: 'Column Depth D (m)',
    depthParamDefault: 0.40,
    coverParamDefault: 0.040,
    isPredefined: true,
    rules: [
      {
        id: 'r-col-long',
        barMarkSuffix: 'COL-01',
        description: 'Longitudinal Main Bars (with 50d Lap Splice)',
        member: 'Column',
        diameter: 20,
        shapeCode: '00',
        barsFormula: '8',
        dimAFormula: 'H + 1.00',
        remarks: 'Includes 50d tension lap length (1.00m for 20mm rebar)',
      },
      {
        id: 'r-col-tie-zone-a',
        barMarkSuffix: 'COL-02',
        description: 'Confinement Ties (Zone A end regions @ 100mm c/c)',
        member: 'Column',
        diameter: 8,
        shapeCode: '51',
        barsFormula: 'ceil(0.90 / 0.10) * 2', // 2 ends of 900mm
        dimAFormula: 'B - 2 * cover',
        dimBFormula: 'D - 2 * cover',
        remarks: 'Ductile seismic confinement at beam-column joints',
      },
      {
        id: 'r-col-tie-zone-b',
        barMarkSuffix: 'COL-03',
        description: 'Intermediate Lateral Ties (Zone B mid-height @ 150mm c/c)',
        member: 'Column',
        diameter: 8,
        shapeCode: '51',
        barsFormula: 'ceil((H - 1.80) / 0.150) + 1',
        dimAFormula: 'B - 2 * cover',
        dimBFormula: 'D - 2 * cover',
        remarks: 'Standard intermediate lateral ties',
      },
      {
        id: 'r-col-diamond',
        barMarkSuffix: 'COL-04',
        description: 'Inner Diamond Confinement Tie',
        member: 'Column',
        diameter: 8,
        shapeCode: '81',
        barsFormula: 'ceil(H / 0.150)',
        dimAFormula: 'B - 2 * cover',
        dimBFormula: 'D - 2 * cover',
        remarks: 'Internal rhombic tie for 8-bar column',
      },
    ],
  },
  {
    id: 'tmpl-slab-panel',
    name: 'RCC Slab Panel (Two-Way)',
    category: 'Slab',
    description: 'Generates bottom main mesh, alternate cranked bars, and distribution rebar for span Lx and panel width Ly.',
    primaryParamName: 'Short Span Lx (m)',
    primaryParamDefault: 4.20,
    secondaryParamName: 'Long Span Ly (m)',
    secondaryParamDefault: 5.40,
    depthParamName: 'Slab Thickness D (m)',
    depthParamDefault: 0.15,
    coverParamDefault: 0.020,
    isPredefined: true,
    rules: [
      {
        id: 'r-slab-bot-x',
        barMarkSuffix: 'SL-01',
        description: 'Bottom Main Bars Short Span (Lx @ 150mm c/c)',
        member: 'Slab',
        diameter: 10,
        shapeCode: '00',
        barsFormula: 'ceil(B / 0.150) + 1',
        dimAFormula: 'L + 0.20',
        remarks: 'Bottom span layer across shorter span Lx',
      },
      {
        id: 'r-slab-crank-x',
        barMarkSuffix: 'SL-02',
        description: 'Alternate Cranked Bars Short Span (45° at 0.25Lx)',
        member: 'Slab',
        diameter: 10,
        shapeCode: '41',
        barsFormula: 'ceil(B / 0.300) + 1',
        dimAFormula: '0.25 * L',
        dimBFormula: 'D - 2 * cover',
        dimCFormula: '0.50 * L',
        dimDFormula: 'D - 2 * cover',
        dimEFormula: '0.25 * L',
        remarks: 'Bent up at 0.25Lx for support negative moment',
      },
      {
        id: 'r-slab-bot-y',
        barMarkSuffix: 'SL-03',
        description: 'Bottom Distribution Bars Long Span (Ly @ 180mm c/c)',
        member: 'Slab',
        diameter: 8,
        shapeCode: '00',
        barsFormula: 'ceil(L / 0.180) + 1',
        dimAFormula: 'B + 0.20',
        remarks: 'Distribution steel laid perpendicular to main rebar',
      },
      {
        id: 'r-slab-chairs',
        barMarkSuffix: 'SL-04',
        description: 'Support Stools / Rebar Chairs',
        member: 'Slab',
        diameter: 12,
        shapeCode: '31',
        barsFormula: 'ceil((L * B) / 1.0) + 2',
        dimAFormula: '0.45',
        dimBFormula: 'D - 0.05',
        dimCFormula: '0.25',
        remarks: 'Place at 1 chair per m² to support top reinforcement',
      },
    ],
  },
  {
    id: 'tmpl-retaining-wall-bay',
    name: 'Cantilever Retaining Wall Bay',
    category: 'Retaining Wall',
    description: 'Generates main vertical stem bars, horizontal distribution, and base footing heel/toe bars for stem height H and bay length L.',
    primaryParamName: 'Stem Height H (m)',
    primaryParamDefault: 3.50,
    secondaryParamName: 'Bay Length L (m)',
    secondaryParamDefault: 6.00,
    depthParamName: 'Base Slab Thickness D (m)',
    depthParamDefault: 0.45,
    coverParamDefault: 0.050,
    isPredefined: true,
    rules: [
      {
        id: 'r-rw-vert-main',
        barMarkSuffix: 'RW-01',
        description: 'Vertical Stem Main Tension Bars @ 150mm c/c',
        member: 'Retaining Wall',
        diameter: 16,
        shapeCode: '11',
        barsFormula: 'ceil(B / 0.150) + 1',
        dimAFormula: 'L + D',
        dimBFormula: '0.90',
        remarks: 'Rear earth face tension bars anchored into base footing',
      },
      {
        id: 'r-rw-horiz-rear',
        barMarkSuffix: 'RW-02',
        description: 'Horizontal Distribution Bars (Rear Face @ 200mm c/c)',
        member: 'Retaining Wall',
        diameter: 10,
        shapeCode: '00',
        barsFormula: 'ceil(L / 0.200) + 1',
        dimAFormula: 'B',
        remarks: 'Shrinkage & temperature control steel along bay length',
      },
      {
        id: 'r-rw-heel-toe',
        barMarkSuffix: 'RW-03',
        description: 'Base Slab Heel Tension U-Mesh @ 150mm c/c',
        member: 'Retaining Wall',
        diameter: 16,
        shapeCode: '21',
        barsFormula: 'ceil(B / 0.150) + 1',
        dimAFormula: 'D - 2 * cover',
        dimBFormula: '2.40',
        dimCFormula: 'D - 2 * cover',
        remarks: 'Heel slab main cantilever rebar resisting soil weight',
      },
    ],
  },
];

/**
 * Evaluates a section template given input parameters and outputs complete BarItem[] array!
 */
export function instantiateSectionTemplate(
  template: SectionTemplate,
  params: {
    primaryValue: number; // e.g. Length L or Height H
    secondaryValue?: number; // e.g. Width B
    depthValue?: number; // e.g. Depth D
    coverValue?: number; // Clear cover
    numRepetitions?: number; // e.g. 1
    sectionName: string; // e.g. "Ground Floor - Beam B1"
  }
): BarItem[] {
  const context: ParametricContext = {
    L: params.primaryValue,
    B: params.secondaryValue ?? template.secondaryParamDefault ?? 0.30,
    D: params.depthValue ?? template.depthParamDefault ?? 0.50,
    cover: params.coverValue ?? template.coverParamDefault ?? 0.025,
    spans: params.numRepetitions ?? 1,
  };

  const numElements = Math.max(1, params.numRepetitions || 1);
  const prefix = params.sectionName.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 10).toUpperCase() || 'SEC';

  const newBars: BarItem[] = [];

  template.rules.forEach((rule, idx) => {
    const rawBars = evaluateParametricMath(rule.barsFormula, context);
    const barsPerElem = Math.max(1, Math.round(rawBars));
    const totalBars = numElements * barsPerElem;

    const dimA = Math.max(0.01, evaluateParametricMath(rule.dimAFormula, context));
    const dimB = rule.dimBFormula ? Math.max(0.01, evaluateParametricMath(rule.dimBFormula, context)) : undefined;
    const dimC = rule.dimCFormula ? Math.max(0.01, evaluateParametricMath(rule.dimCFormula, context)) : undefined;
    const dimD = rule.dimDFormula ? Math.max(0.01, evaluateParametricMath(rule.dimDFormula, context)) : undefined;
    const dimE = rule.dimEFormula ? Math.max(0.01, evaluateParametricMath(rule.dimEFormula, context)) : undefined;

    const calc = calculateBarCuttingLength(
      rule.shapeCode,
      dimA,
      dimB ?? 0,
      dimC ?? 0,
      dimD ?? 0,
      dimE ?? 0,
      0,
      rule.diameter
    );

    const unitWeight = getUnitWeight(rule.diameter);
    const totalLength = Number((totalBars * calc.cuttingLength).toFixed(3));
    const totalWeight = Number((totalLength * unitWeight).toFixed(2));

    const item: BarItem = {
      id: `bar-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      barMark: `${prefix}-${rule.barMarkSuffix || (idx + 1).toString().padStart(2, '0')}`,
      member: rule.member,
      floorOrSection: params.sectionName,
      description: rule.description,
      diameter: rule.diameter,
      numElements,
      numBarsPerElement: barsPerElem,
      totalBars,
      shapeCode: rule.shapeCode,
      customShapeId: rule.customShapeId,
      dimA,
      dimB,
      dimC,
      dimD,
      dimE,
      cuttingLength: calc.cuttingLength,
      totalLength,
      unitWeight,
      totalWeight,
      formulaExplanation: calc.formulaExplanation,
      remarks: rule.remarks,
    };

    newBars.push(item);
  });

  return newBars;
}
