/**
 * Standard rebar nominal diameters (mm) according to IS 1786 / BS 4449
 */
export const STANDARD_DIAMETERS = [6, 8, 10, 12, 16, 20, 25, 28, 32, 36, 40] as const;
export type RebarDiameter = typeof STANDARD_DIAMETERS[number];

export const STOCK_BAR_LENGTH = 12.0; // Commercial mill length in meters

export type StructuralMemberType = 
  | 'Footing'
  | 'Column'
  | 'Beam'
  | 'Slab'
  | 'Retaining Wall'
  | 'Culvert'
  | 'Staircase'
  | 'Miscellaneous';

export type ShapeCode = 
  | '00' // Straight
  | '11' // L-Bar (90 deg hook)
  | '21' // U-Bar / Trough
  | '51' // Closed Stirrup / Seismic Tie (135 deg hooks)
  | '41' // Cranked / Bent-up bar (45 deg)
  | '31' // Chair / Stool bar
  | '71' // Capping bar / Kerb tie
  | '61' // Haunch corner tie (45 deg)
  | '81' // Diamond / Rhombic column tie
  | '77' // Circular stirrup / spiral ring
  | '99'; // Custom multi-segment

export interface CustomSegment {
  id: string;
  label?: string; // 'A', 'B', 'C'
  length: number; // in meters
  angle: number; // meaning depends on `direction`: legacy bend magnitude (0-180) for preset directions, or full arbitrary angle when direction === 'custom'
  direction: 'straight' | 'up' | 'down' | 'left' | 'right' | 'crank-up' | 'crank-down' | 'hook-return' | 'custom';
  /** Only used when direction === 'custom'. 'absolute' = angle is the segment's true orientation (0-360°, 0=+X, 90=+Y). 'relative' = angle is a signed bend (+/-) from the previous segment's heading. Defaults to 'relative'. */
  angleMode?: AngleMode;
}

export type HookType = 'none' | 'hook-90' | 'hook-135' | 'hook-180' | 'custom';

export interface CustomHook {
  type: HookType;
  direction: 'up' | 'down' | 'return'; // legacy, superseded by `rotation` when type === 'custom'
  lengthMeters?: number; // legacy alias of extensionLength for preset hook types

  // --- Arbitrary-angle fields, used only when type === 'custom' ---
  /** Hook angle, 0-360°, decimals allowed. Meaning depends on angleMode. */
  angle?: number;
  /** 'absolute' = angle is the hook's true orientation. 'relative' = angle is a signed bend (+/-) from the bar end's heading, using `rotation` for sign convention. Defaults to 'relative'. */
  angleMode?: AngleMode;
  /** Rotation sense of the bend when angleMode is 'relative'. Defaults to 'ccw'. */
  rotation?: 'cw' | 'ccw';
  /** Straight extension beyond the bend, meters. */
  extensionLength?: number;
  /** Bend/mandrel radius override, meters. If unset, derived from mandrelFactor × diameter. */
  radius?: number;
  /** Multiplier of bar diameter used to derive the default radius when `radius` is not set. */
  mandrelFactor?: number;
}

/** How a custom shape's bend deductions are calculated. See rebarGeometry.ts for details. */
export type BendCalculationMethod = 'IS_2502_LINEAR' | 'CUSTOM_RADIUS';
/** Segment/hook angle interpretation: an absolute orientation, or a signed bend relative to what came before. */
export type AngleMode = 'absolute' | 'relative';

export interface CustomShapeDefinition {
  id: string;
  name: string;
  description?: string;
  category?: 'Beam' | 'Column' | 'Slab' | 'Footing' | 'Wall' | 'Stair' | 'Culvert' | 'Bridge' | 'Miscellaneous' | 'Custom';
  startHook: CustomHook;
  endHook: CustomHook;
  segments: CustomSegment[];
  /** Bend calculation method for this shape's arbitrary-angle bends/hooks. Defaults to 'IS_2502_LINEAR' when unset. */
  bendCalculationMethod?: BendCalculationMethod;
  createdAt?: string;
  updatedAt?: string;
}

export type StructureCategory =
  | 'drain'
  | 'culvert'
  | 'building'
  | 'pavement'
  | 'bridge'
  | 'retaining_wall'
  | 'water_tank'
  | 'other';

export interface GridSectionNode {
  id: string;
  name: string; // e.g. "Grid 1-4 / A-C", "Outer Face", "Inner Face", "Bottom Mesh", "Top Slab"
  description?: string;
}

export interface ComponentNode {
  id: string;
  name: string; // e.g. "Abutment", "Wingwall", "Apron", "Beam", "Column", "Slab", "Drain Bed / Invert", "Side Wall", "Curtain Wall"
  memberType?: StructuralMemberType;
  grids?: GridSectionNode[];
  description?: string;
}

export interface SubComponentNode {
  id: string;
  name: string; // e.g. "Barrel Section", "Inlet Apron & Wingwalls", "Floor 1", "Chainage 0+000 - 0+150", "Pier P1"
  description?: string;
  components?: ComponentNode[];
}

export interface StructureNode {
  id: string;
  name: string; // e.g. "RCC Box Culvert 2x2m", "Stormwater Drain Ch 0+000", "Main Building", "Highway Concrete Pavement"
  type: StructureCategory;
  description?: string;
  subComponents?: SubComponentNode[];
}

export interface BarItem {
  id: string;
  barMark: string;
  
  // Civil Engineering Structure Hierarchy
  structureId?: string;
  structureName?: string; // e.g. "RCC Box Culvert", "Stormwater Drain", "Building Tower A"
  subComponent?: string; // e.g. "Inlet Apron & Wingwall", "Floor 1", "Barrel Section"
  component?: string; // e.g. "Abutment", "Wingwall", "Apron", "Beam", "Column", "Slab", "Drain Bed"
  gridOrSection?: string; // e.g. "Outer Face", "Grid A-B", "Bottom Layer", "Span 1"

  member: StructuralMemberType;
  floorOrSection?: string; // e.g. "Ground Floor", "1st Floor - Beam B1", "Basement Columns" (synced with hierarchy)
  description: string;
  diameter: RebarDiameter;
  numElements: number;
  numBarsPerElement: number;
  totalBars: number; // numElements * numBarsPerElement
  shapeCode: ShapeCode;
  customShapeId?: string; // Reference to CustomShapeDefinition if custom
  
  // Dimensions in meters (A through F)
  dimA: number;
  dimB?: number;
  dimC?: number;
  dimD?: number;
  dimE?: number;
  dimF?: number;
  
  // For Shape 99 or custom shapes
  customSegments?: CustomSegment[];
  startHook?: CustomHook;
  endHook?: CustomHook;

  cuttingLength: number; // in meters (after bend deductions)
  totalLength: number; // in meters (totalBars * cuttingLength)
  unitWeight: number; // kg/m
  totalWeight: number; // kg
  
  formulaExplanation?: string;
  remarks?: string;
}

export type DesignStandard = 'IS 2502 / SP 34' | 'BS 8666:2020' | 'IRC:112';

export interface ProjectMetadata {
  id: string;
  projectTitle: string;
  clientName: string;
  contractorName: string;
  structuralEngineer: string;
  checkedBy: string;
  drawingNumber: string;
  revision: string;
  date: string;
  standard: DesignStandard;
  wastagePercent: number; // default 3.5%
  bindingWireRateKgPerMT: number; // default 9.0 kg / MT
}

export interface CutPiece {
  barItemId: string;
  barMark: string;
  diameter: RebarDiameter;
  length: number; // meters
}

export interface StockBarPattern {
  barIndex: number;
  diameter: RebarDiameter;
  totalStockLength: number; // 12.0m
  cuts: CutPiece[];
  usedLength: number;
  offCutLength: number;
  isScrapUsable: boolean; // >= min reusable offcut length (default 1.0m)
  efficiencyPercent: number;
  /** 'stock' = new mill bar (default). 'offcut' = cut from a previously saved offcut. */
  source?: 'stock' | 'offcut';
  offcutId?: string;
}

export type OptimizationStrategy = 'FFD' | 'BFD' | 'WORST_FIT' | 'MULTI_START';

/** A reusable leftover piece of a given diameter that can be consumed before opening new stock. */
export interface OffcutItem {
  id: string;
  diameter: RebarDiameter;
  length: number; // meters
  source?: string; // e.g. the stock bar it came from
}

export interface OptimizerOptions {
  strategy?: OptimizationStrategy;
  offcuts?: OffcutItem[];
  /** Leftovers at least this long count as reusable offcuts (default 1.0 m). */
  minReusableOffcut?: number;
}

export interface OptimizationResult {
  diameter: RebarDiameter;
  requiredCutsCount: number;
  totalCutLengthMeters: number;
  stockBarsNeeded: number;
  totalStockLengthMeters: number;
  totalUsedLengthMeters: number;
  totalScrapMeters: number;
  usableScrapMeters: number; // >= 1m
  unrecoverableScrapMeters: number; // < 1m
  overallEfficiencyPercent: number;
  patterns: StockBarPattern[];
  strategy?: OptimizationStrategy;
  stockLength?: number;
  offcutsConsumed?: number;
  reusedOffcutLengthMeters?: number;
  /** Bars a plain first-fit in schedule order (no planning) would need — the savings baseline. */
  baselineStockBars?: number;
  /** Theoretical lower bound: ceil(total cut length / stock length). */
  theoreticalMinBars?: number;
}

export interface SteelAbstractItem {
  diameter: RebarDiameter;
  unitWeight: number; // kg/m
  totalLengthMeters: number;
  netWeightKg: number;
  netWeightMT: number;
  wastageWeightKg: number;
  grossWeightKg: number;
  grossWeightMT: number;
  stockBars12mNeeded: number;
  purchasedWeightKg: number;
}

export interface ParametricBarRule {
  id: string;
  barMarkSuffix: string; // e.g. "BOT-MAIN", "TOP-EXTRA", "STIR-01"
  description: string;
  member: StructuralMemberType;
  diameter: RebarDiameter;
  shapeCode: ShapeCode;
  customShapeId?: string;
  numElementsMultiplier?: number; // default 1
  barsFormula: string; // e.g. "3" or "ceil(L / 0.15) + 1"
  dimAFormula: string; // e.g. "L + 0.60" or "0.7 * L"
  dimBFormula?: string; // e.g. "0.45" or "D - 0.08"
  dimCFormula?: string;
  dimDFormula?: string;
  dimEFormula?: string;
  remarks?: string;
}

export interface SectionTemplate {
  id: string;
  name: string;
  category: StructuralMemberType;
  description: string;
  primaryParamName: string; // e.g. "Span Length L (m)" or "Story Height H (m)"
  primaryParamDefault: number; // e.g. 5.0
  secondaryParamName?: string; // e.g. "Width B (m)"
  secondaryParamDefault?: number; // e.g. 0.30
  depthParamName?: string; // e.g. "Depth D (m)"
  depthParamDefault?: number; // e.g. 0.50
  coverParamDefault?: number; // e.g. 0.025
  rules: ParametricBarRule[];
  isPredefined?: boolean;
}

export interface ProjectData {
  metadata: ProjectMetadata;
  bars: BarItem[];
  structures?: StructureNode[];
  customShapes?: CustomShapeDefinition[];
  sectionTemplates?: SectionTemplate[];
}
