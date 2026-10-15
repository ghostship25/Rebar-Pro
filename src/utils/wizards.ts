import { BarItem, RebarDiameter } from '../types/bbs';
import { getUnitWeight } from './engineering';
import { calculateBarCuttingLength } from './shapes';

function createBarHelper(
  partial: Omit<BarItem, 'cuttingLength' | 'totalLength' | 'unitWeight' | 'totalWeight' | 'formulaExplanation' | 'totalBars'> & { totalBars?: number }
): BarItem {
  const result = calculateBarCuttingLength(
    partial.shapeCode,
    partial.dimA,
    partial.dimB,
    partial.dimC,
    partial.dimD,
    partial.dimE,
    partial.dimF,
    partial.diameter,
    partial.customSegments
  );

  const unitWeight = getUnitWeight(partial.diameter);
  const totalBars = partial.numElements * partial.numBarsPerElement;
  const totalLength = Number((totalBars * result.cuttingLength).toFixed(3));
  const totalWeight = Number((totalLength * unitWeight).toFixed(2));

  return {
    ...partial,
    totalBars,
    cuttingLength: result.cuttingLength,
    totalLength,
    unitWeight,
    totalWeight,
    formulaExplanation: result.formulaExplanation,
  };
}

// 1. RCC ISOLATED & COMBINED FOOTING WIZARD
export interface FootingWizardParams {
  numFootings: number;
  lengthL: number; // m
  widthB: number; // m
  depthD: number; // m
  clearCover: number; // m, default 0.050 (50mm)
  // Bottom mesh
  meshXDia: RebarDiameter;
  meshXSpacing: number; // m, e.g. 0.150
  meshYDia: RebarDiameter;
  meshYSpacing: number; // m, e.g. 0.150
  // Pedestal / Starter Dowels
  includePedestal: boolean;
  pedestalL: number;
  pedestalB: number;
  pedestalH: number;
  starterBarDia: RebarDiameter;
  numStarterBars: number;
  starterLapMultiplier: number; // e.g. 50d
  tieDia: RebarDiameter;
  tieSpacing: number; // m, e.g. 0.150
}

export function generateFootingBars(params: FootingWizardParams): BarItem[] {
  const bars: BarItem[] = [];
  const cover = params.clearCover;

  // Bottom Mesh X-Direction (Runs along L, spaced across B)
  const lenX = Math.max(0.2, params.lengthL - 2 * cover);
  const hookHeight = Math.max(0.15, params.depthD - 2 * cover);
  const numBarsX = Math.floor((params.widthB - 2 * cover) / params.meshXSpacing) + 1;

  bars.push(
    createBarHelper({
      id: `FTG-BMX-${Date.now()}-1`,
      barMark: 'F1-BM-X',
      member: 'Footing',
      description: `Bottom Mat X-Dir (c/c ${Math.round(params.meshXSpacing * 1000)}mm)`,
      diameter: params.meshXDia,
      numElements: params.numFootings,
      numBarsPerElement: numBarsX,
      shapeCode: '21', // U-bar
      dimA: Number(hookHeight.toFixed(3)),
      dimB: Number(lenX.toFixed(3)),
      dimC: Number(hookHeight.toFixed(3)),
      remarks: `Footing bottom reinforcement along length ${params.lengthL}m`,
    })
  );

  // Bottom Mesh Y-Direction (Runs along B, spaced across L)
  const lenY = Math.max(0.2, params.widthB - 2 * cover);
  const numBarsY = Math.floor((params.lengthL - 2 * cover) / params.meshYSpacing) + 1;

  bars.push(
    createBarHelper({
      id: `FTG-BMY-${Date.now()}-2`,
      barMark: 'F1-BM-Y',
      member: 'Footing',
      description: `Bottom Mat Y-Dir (c/c ${Math.round(params.meshYSpacing * 1000)}mm)`,
      diameter: params.meshYDia,
      numElements: params.numFootings,
      numBarsPerElement: numBarsY,
      shapeCode: '21',
      dimA: Number(hookHeight.toFixed(3)),
      dimB: Number(lenY.toFixed(3)),
      dimC: Number(hookHeight.toFixed(3)),
      remarks: `Footing bottom reinforcement along width ${params.widthB}m`,
    })
  );

  // Pedestal Starter Dowels & Ties
  if (params.includePedestal) {
    const dMeters = params.starterBarDia / 1000;
    const lapLength = params.starterLapMultiplier * dMeters;
    const verticalHeight = params.depthD - cover + params.pedestalH + lapLength;
    const bendHookFooting = Math.max(0.30, 16 * dMeters); // Anchorage in footing base

    bars.push(
      createBarHelper({
        id: `FTG-ST-${Date.now()}-3`,
        barMark: 'F1-ST-01',
        member: 'Footing',
        description: `Column/Pedestal Starter Dowels (${params.numStarterBars}-T${params.starterBarDia})`,
        diameter: params.starterBarDia,
        numElements: params.numFootings,
        numBarsPerElement: params.numStarterBars,
        shapeCode: '11', // L-Bar
        dimA: Number(verticalHeight.toFixed(3)),
        dimB: Number(bendHookFooting.toFixed(3)),
        remarks: `Starter dowels with ${params.starterLapMultiplier}d lap into column`,
      })
    );

    // Pedestal ties
    const tieCover = 0.040;
    const tieA = Math.max(0.15, params.pedestalL - 2 * tieCover);
    const tieB = Math.max(0.15, params.pedestalB - 2 * tieCover);
    const numTies = Math.floor(params.pedestalH / params.tieSpacing) + 2;

    bars.push(
      createBarHelper({
        id: `FTG-TIE-${Date.now()}-4`,
        barMark: 'F1-PT-01',
        member: 'Footing',
        description: `Pedestal Confinement Ties (c/c ${Math.round(params.tieSpacing * 1000)}mm)`,
        diameter: params.tieDia,
        numElements: params.numFootings,
        numBarsPerElement: numTies,
        shapeCode: '51',
        dimA: Number(tieA.toFixed(3)),
        dimB: Number(tieB.toFixed(3)),
        remarks: 'Closed ties with 135° seismic ductile hooks',
      })
    );
  }

  return bars;
}

// 2. RCC COLUMN WIZARD
export interface ColumnWizardParams {
  numColumns: number;
  widthB: number; // m
  depthD: number; // m
  heightH: number; // m
  clearCover: number; // m, default 0.040 (40mm)
  mainBarDia: RebarDiameter;
  numMainBars: number; // e.g. 4, 8, 12
  lapLengthM: number; // default 50d
  bottomHookM: number; // default 0.300m
  tieDia: RebarDiameter;
  confineSpacing: number; // m, e.g. 0.100 (Zone A)
  confineZoneLength: number; // m, e.g. 0.600
  midSpacing: number; // m, e.g. 0.175 (Zone B)
  includeDiamondTie: boolean;
}

export function generateColumnBars(params: ColumnWizardParams): BarItem[] {
  const bars: BarItem[] = [];
  const cover = params.clearCover;

  // Main Longitudinal Bars
  const totalVerticalStraight = params.heightH + params.lapLengthM;
  bars.push(
    createBarHelper({
      id: `COL-MAIN-${Date.now()}-1`,
      barMark: 'C1-MB-01',
      member: 'Column',
      description: `Main Longitudinal Rebar (${params.numMainBars}-T${params.mainBarDia})`,
      diameter: params.mainBarDia,
      numElements: params.numColumns,
      numBarsPerElement: params.numMainBars,
      shapeCode: '11',
      dimA: Number(totalVerticalStraight.toFixed(3)),
      dimB: Number(params.bottomHookM.toFixed(3)),
      remarks: `Includes ${params.lapLengthM.toFixed(3)}m lap splice + ${params.bottomHookM.toFixed(3)}m base bend`,
    })
  );

  // Outer Ties - Confinement Zone A (End zones top and bottom)
  const tieA = Math.max(0.12, params.widthB - 2 * cover);
  const tieB = Math.max(0.12, params.depthD - 2 * cover);
  const tiesPerEnd = Math.floor(params.confineZoneLength / params.confineSpacing) + 1;
  const totalConfineTies = 2 * tiesPerEnd;

  bars.push(
    createBarHelper({
      id: `COL-TIEA-${Date.now()}-2`,
      barMark: 'C1-ST-01',
      member: 'Column',
      description: `Seismic Confinement Ties Zone A (c/c ${Math.round(params.confineSpacing * 1000)}mm)`,
      diameter: params.tieDia,
      numElements: params.numColumns,
      numBarsPerElement: totalConfineTies,
      shapeCode: '51',
      dimA: Number(tieA.toFixed(3)),
      dimB: Number(tieB.toFixed(3)),
      remarks: `Ductile confinement ties at top & bottom ends (IS 13920)`,
    })
  );

  // Outer Ties - Middle Zone B
  const midZoneLength = Math.max(0, params.heightH - 2 * params.confineZoneLength);
  const totalMidTies = Math.floor(midZoneLength / params.midSpacing);

  if (totalMidTies > 0) {
    bars.push(
      createBarHelper({
        id: `COL-TIEB-${Date.now()}-3`,
        barMark: 'C1-ST-02',
        member: 'Column',
        description: `Standard Column Ties Mid-Zone B (c/c ${Math.round(params.midSpacing * 1000)}mm)`,
        diameter: params.tieDia,
        numElements: params.numColumns,
        numBarsPerElement: totalMidTies,
        shapeCode: '51',
        dimA: Number(tieA.toFixed(3)),
        dimB: Number(tieB.toFixed(3)),
        remarks: 'Standard column lateral ties',
      })
    );
  }

  // Inner Diamond Tie (if selected or column has >= 8 bars)
  if (params.includeDiamondTie || params.numMainBars >= 8) {
    const totalInnerTies = totalConfineTies + totalMidTies;
    bars.push(
      createBarHelper({
        id: `COL-DIAM-${Date.now()}-4`,
        barMark: 'C1-DT-01',
        member: 'Column',
        description: `Internal Diamond Tie (8-bar tie link)`,
        diameter: params.tieDia,
        numElements: params.numColumns,
        numBarsPerElement: totalInnerTies,
        shapeCode: '81',
        dimA: Number(tieA.toFixed(3)),
        dimB: Number(tieB.toFixed(3)),
        remarks: 'Internal rhombic tie restraining middle longitudinal rebars',
      })
    );
  }

  return bars;
}

// 3. RCC BEAM WIZARD
export interface BeamWizardParams {
  numBeams: number;
  clearSpan: number; // m
  leftSupportW: number; // m, e.g. 0.300
  rightSupportW: number; // m, e.g. 0.300
  widthB: number; // m, e.g. 0.250
  depthD: number; // m, e.g. 0.450
  clearCover: number; // m, e.g. 0.025
  // Bottom Reinforcement
  bottomMainDia: RebarDiameter;
  numBottomMain: number;
  bottomExtraDia: RebarDiameter;
  numBottomExtra: number;
  // Top Reinforcement
  topHangerDia: RebarDiameter;
  numTopHanger: number;
  topExtraLeftDia: RebarDiameter;
  numTopExtraLeft: number;
  topExtraRightDia: RebarDiameter;
  numTopExtraRight: number;
  // Shear Stirrups
  stirrupDia: RebarDiameter;
  supportStirrupSpacing: number; // m, e.g. 0.100 (in L/4 zone)
  midStirrupSpacing: number; // m, e.g. 0.175
}

export function generateBeamBars(params: BeamWizardParams): BarItem[] {
  const bars: BarItem[] = [];
  const cover = params.clearCover;
  const overallLength = params.clearSpan + params.leftSupportW + params.rightSupportW;
  const straightLength = overallLength - 2 * cover;
  const hookEnd = Math.max(0.15, params.depthD - 2 * cover);

  // Bottom Continuous Main Bars
  bars.push(
    createBarHelper({
      id: `BM-BMAIN-${Date.now()}-1`,
      barMark: 'B1-BM-01',
      member: 'Beam',
      description: `Bottom Main Tension Bars (${params.numBottomMain}-T${params.bottomMainDia})`,
      diameter: params.bottomMainDia,
      numElements: params.numBeams,
      numBarsPerElement: params.numBottomMain,
      shapeCode: '21', // U-bar with end hooks
      dimA: Number(hookEnd.toFixed(3)),
      dimB: Number(straightLength.toFixed(3)),
      dimC: Number(hookEnd.toFixed(3)),
      remarks: 'Continuous bottom tension reinforcement with 90° support hooks',
    })
  );

  // Bottom Extra Mid-Span Curtailment Bars (if any)
  if (params.numBottomExtra > 0) {
    const extraLength = Number((params.clearSpan * 0.70).toFixed(3)); // curtailed at 0.15L from supports
    bars.push(
      createBarHelper({
        id: `BM-BEXT-${Date.now()}-2`,
        barMark: 'B1-BM-02',
        member: 'Beam',
        description: `Bottom Mid-Span Extra Bars (${params.numBottomExtra}-T${params.bottomExtraDia})`,
        diameter: params.bottomExtraDia,
        numElements: params.numBeams,
        numBarsPerElement: params.numBottomExtra,
        shapeCode: '00', // Straight
        dimA: extraLength,
        remarks: 'Curtailed bottom extra bar spanning middle 70% of span',
      })
    );
  }

  // Top Continuous Hanger Bars
  bars.push(
    createBarHelper({
      id: `BM-THANG-${Date.now()}-3`,
      barMark: 'B1-TH-01',
      member: 'Beam',
      description: `Top Continuous Hanger Bars (${params.numTopHanger}-T${params.topHangerDia})`,
      diameter: params.topHangerDia,
      numElements: params.numBeams,
      numBarsPerElement: params.numTopHanger,
      shapeCode: '21',
      dimA: Number(hookEnd.toFixed(3)),
      dimB: Number(straightLength.toFixed(3)),
      dimC: Number(hookEnd.toFixed(3)),
      remarks: 'Top hanger reinforcement supporting shear stirrups',
    })
  );

  // Top Left Support Extra Negative Moment Bars
  if (params.numTopExtraLeft > 0) {
    const leftLength = Number((params.leftSupportW - cover + params.clearSpan * 0.30).toFixed(3));
    bars.push(
      createBarHelper({
        id: `BM-TEXT-L-${Date.now()}-4`,
        barMark: 'B1-TE-01',
        member: 'Beam',
        description: `Top Left Support Negative Extra (${params.numTopExtraLeft}-T${params.topExtraLeftDia})`,
        diameter: params.topExtraLeftDia,
        numElements: params.numBeams,
        numBarsPerElement: params.numTopExtraLeft,
        shapeCode: '11',
        dimA: leftLength,
        dimB: Number(hookEnd.toFixed(3)),
        remarks: 'Anchored into left column support + 0.30L extension',
      })
    );
  }

  // Top Right Support Extra Negative Moment Bars
  if (params.numTopExtraRight > 0) {
    const rightLength = Number((params.rightSupportW - cover + params.clearSpan * 0.30).toFixed(3));
    bars.push(
      createBarHelper({
        id: `BM-TEXT-R-${Date.now()}-5`,
        barMark: 'B1-TE-02',
        member: 'Beam',
        description: `Top Right Support Negative Extra (${params.numTopExtraRight}-T${params.topExtraRightDia})`,
        diameter: params.topExtraRightDia,
        numElements: params.numBeams,
        numBarsPerElement: params.numTopExtraRight,
        shapeCode: '11',
        dimA: rightLength,
        dimB: Number(hookEnd.toFixed(3)),
        remarks: 'Anchored into right column support + 0.30L extension',
      })
    );
  }

  // Shear Stirrups (Near supports 2 * L/4, and middle L/2)
  const stirrupA = Math.max(0.12, params.widthB - 2 * cover);
  const stirrupB = Math.max(0.15, params.depthD - 2 * cover);
  const quarterSpan = params.clearSpan * 0.25;
  const numEndStirrups = 2 * (Math.floor(quarterSpan / params.supportStirrupSpacing) + 1);
  const midSpanLength = params.clearSpan * 0.50;
  const numMidStirrups = Math.floor(midSpanLength / params.midStirrupSpacing);

  bars.push(
    createBarHelper({
      id: `BM-ST-END-${Date.now()}-6`,
      barMark: 'B1-ST-01',
      member: 'Beam',
      description: `Shear Stirrups Near Supports (c/c ${Math.round(params.supportStirrupSpacing * 1000)}mm)`,
      diameter: params.stirrupDia,
      numElements: params.numBeams,
      numBarsPerElement: numEndStirrups,
      shapeCode: '51',
      dimA: Number(stirrupA.toFixed(3)),
      dimB: Number(stirrupB.toFixed(3)),
      remarks: '2-legged closed stirrups in high shear zone with 135° seismic hooks',
    })
  );

  if (numMidStirrups > 0) {
    bars.push(
      createBarHelper({
        id: `BM-ST-MID-${Date.now()}-7`,
        barMark: 'B1-ST-02',
        member: 'Beam',
        description: `Shear Stirrups Mid-Span (c/c ${Math.round(params.midStirrupSpacing * 1000)}mm)`,
        diameter: params.stirrupDia,
        numElements: params.numBeams,
        numBarsPerElement: numMidStirrups,
        shapeCode: '51',
        dimA: Number(stirrupA.toFixed(3)),
        dimB: Number(stirrupB.toFixed(3)),
        remarks: '2-legged stirrups in low shear central region',
      })
    );
  }

  return bars;
}

// 4. RCC SLAB WIZARD
export interface SlabWizardParams {
  numSlabs: number;
  shortSpanLx: number; // m
  longSpanLy: number; // m
  thicknessT: number; // m, e.g. 0.125
  clearCover: number; // m, e.g. 0.015 (15mm)
  mainDia: RebarDiameter;
  mainSpacing: number; // m, e.g. 0.150
  crankAlternate: boolean;
  distDia: RebarDiameter;
  distSpacing: number; // m, e.g. 0.175
  chairBarsPerM2: number; // e.g. 0.8
  chairDia: RebarDiameter;
}

export function generateSlabBars(params: SlabWizardParams): BarItem[] {
  const bars: BarItem[] = [];
  const cover = params.clearCover;
  const bearing = 0.150; // standard masonry/beam wall bearing
  const totalSpanX = params.shortSpanLx + 2 * bearing - 2 * cover;
  const totalSpanY = params.longSpanLy + 2 * bearing - 2 * cover;

  const totalMainBars = Math.floor(params.longSpanLy / params.mainSpacing) + 1;

  if (params.crankAlternate) {
    // Half straight bars, half cranked bars at 45°
    const straightCount = Math.ceil(totalMainBars / 2);
    const crankedCount = Math.floor(totalMainBars / 2);
    const crankDepth = Math.max(0.04, params.thicknessT - 2 * cover - (params.mainDia / 1000));
    const crankAt = Number((totalSpanX * 0.25).toFixed(3)); // L/4
    const topFlat = Number((totalSpanX - 2 * crankAt).toFixed(3));

    bars.push(
      createBarHelper({
        id: `SLB-STR-${Date.now()}-1`,
        barMark: 'S1-MB-01',
        member: 'Slab',
        description: `Main Short-Span Straight Bars (c/c ${Math.round(params.mainSpacing * 2000)}mm)`,
        diameter: params.mainDia,
        numElements: params.numSlabs,
        numBarsPerElement: straightCount,
        shapeCode: '00',
        dimA: Number(totalSpanX.toFixed(3)),
        remarks: 'Alternate straight bottom tension bars in short direction',
      })
    );

    bars.push(
      createBarHelper({
        id: `SLB-CRK-${Date.now()}-2`,
        barMark: 'S1-CB-01',
        member: 'Slab',
        description: `Main Cranked Bars at 45° (c/c ${Math.round(params.mainSpacing * 2000)}mm)`,
        diameter: params.mainDia,
        numElements: params.numSlabs,
        numBarsPerElement: crankedCount,
        shapeCode: '41',
        dimA: crankAt,
        dimB: Number(crankDepth.toFixed(3)),
        dimC: topFlat,
        dimD: Number(crankDepth.toFixed(3)),
        dimE: crankAt,
        remarks: 'Alternate bars bent-up at L/4 for negative moment over support',
      })
    );
  } else {
    // 100% straight bottom mesh
    bars.push(
      createBarHelper({
        id: `SLB-STR-${Date.now()}-1`,
        barMark: 'S1-MB-01',
        member: 'Slab',
        description: `Main Short-Span Bottom Bars (c/c ${Math.round(params.mainSpacing * 1000)}mm)`,
        diameter: params.mainDia,
        numElements: params.numSlabs,
        numBarsPerElement: totalMainBars,
        shapeCode: '00',
        dimA: Number(totalSpanX.toFixed(3)),
        remarks: 'Full straight bottom reinforcement in primary span',
      })
    );
  }

  // Distribution Bars (Along Long Span)
  const numDistBars = Math.floor(params.shortSpanLx / params.distSpacing) + 1;
  bars.push(
    createBarHelper({
      id: `SLB-DST-${Date.now()}-3`,
      barMark: 'S1-DB-01',
      member: 'Slab',
      description: `Distribution Reinforcement (c/c ${Math.round(params.distSpacing * 1000)}mm)`,
      diameter: params.distDia,
      numElements: params.numSlabs,
      numBarsPerElement: numDistBars,
      shapeCode: '00',
      dimA: Number(totalSpanY.toFixed(3)),
      remarks: 'Transverse distribution & shrinkage reinforcement',
    })
  );

  // Top Rebar Support Chairs (Shape 31)
  const slabArea = params.shortSpanLx * params.longSpanLy;
  const numChairs = Math.max(2, Math.ceil(slabArea * params.chairBarsPerM2));
  const chairHeight = Math.max(0.06, params.thicknessT - 2 * cover - (2 * params.mainDia) / 1000);

  bars.push(
    createBarHelper({
      id: `SLB-CHR-${Date.now()}-4`,
      barMark: 'S1-CH-01',
      member: 'Slab',
      description: `Rebar Support Chairs / Stools (${params.chairBarsPerM2} nos/m²)`,
      diameter: params.chairDia,
      numElements: params.numSlabs,
      numBarsPerElement: numChairs,
      shapeCode: '31',
      dimA: 0.350, // Top resting head
      dimB: Number(chairHeight.toFixed(3)), // Chair vertical leg
      dimC: 0.200, // Footing support base
      remarks: 'Heavy-duty stool bars maintaining design effective depth of top reinforcement',
    })
  );

  return bars;
}

// 5. CANTILEVER RETAINING WALL WIZARD
export interface RetainingWallWizardParams {
  numWalls: number;
  wallLength: number; // m
  stemHeightH: number; // m
  baseThickness: number; // m
  baseWidth: number; // m
  toeLength: number; // m
  heelLength: number; // m
  stemCover: number; // m, default 0.040
  stemMainDia: RebarDiameter;
  stemMainSpacing: number; // m, e.g. 0.150
  stemDistDia: RebarDiameter;
  stemDistSpacing: number; // m, e.g. 0.200
  baseBottomDia: RebarDiameter;
  baseBottomSpacing: number; // m, e.g. 0.150
}

export function generateRetainingWallBars(params: RetainingWallWizardParams): BarItem[] {
  const bars: BarItem[] = [];
  const cover = params.stemCover;
  const numStemBars = Math.floor(params.wallLength / params.stemMainSpacing) + 1;

  // Stem Main Vertical Tension Bars with anchorage hook into footing
  const verticalStemRun = params.stemHeightH + params.baseThickness - 2 * cover;
  const heelBend = Math.max(0.40, params.heelLength * 0.6);

  bars.push(
    createBarHelper({
      id: `RW-VMAIN-${Date.now()}-1`,
      barMark: 'RW-VM-01',
      member: 'Retaining Wall',
      description: `Stem Main Vertical Tension Bars (c/c ${Math.round(params.stemMainSpacing * 1000)}mm)`,
      diameter: params.stemMainDia,
      numElements: params.numWalls,
      numBarsPerElement: numStemBars,
      shapeCode: '11',
      dimA: Number(verticalStemRun.toFixed(3)),
      dimB: Number(heelBend.toFixed(3)),
      remarks: 'Primary cantilever tension bar anchored into heel footing slab',
    })
  );

  // Stem Horizontal Distribution Bars (Both Faces)
  const numHorizBars = Math.floor(params.stemHeightH / params.stemDistSpacing) + 1;
  bars.push(
    createBarHelper({
      id: `RW-HDIST-${Date.now()}-2`,
      barMark: 'RW-HD-01',
      member: 'Retaining Wall',
      description: `Stem Horizontal Distribution (2 Faces, c/c ${Math.round(params.stemDistSpacing * 1000)}mm)`,
      diameter: params.stemDistDia,
      numElements: params.numWalls,
      numBarsPerElement: numHorizBars * 2,
      shapeCode: '00',
      dimA: Number((params.wallLength - 2 * cover).toFixed(3)),
      remarks: 'Temperature and shrinkage distribution rebar on earth and front face',
    })
  );

  // Base Slab Transverse Reinforcement (Heel & Toe Bottom Mesh)
  const numBaseBars = Math.floor(params.wallLength / params.baseBottomSpacing) + 1;
  const baseRun = params.baseWidth - 2 * cover;
  const baseUpHook = Math.max(0.15, params.baseThickness - 2 * cover);

  bars.push(
    createBarHelper({
      id: `RW-BASE-${Date.now()}-3`,
      barMark: 'RW-BM-01',
      member: 'Retaining Wall',
      description: `Base Slab Transverse Mesh (c/c ${Math.round(params.baseBottomSpacing * 1000)}mm)`,
      diameter: params.baseBottomDia,
      numElements: params.numWalls,
      numBarsPerElement: numBaseBars,
      shapeCode: '21',
      dimA: Number(baseUpHook.toFixed(3)),
      dimB: Number(baseRun.toFixed(3)),
      dimC: Number(baseUpHook.toFixed(3)),
      remarks: 'Continuous transverse base reinforcement with end anchorage U-hooks',
    })
  );

  return bars;
}

// 6. CULVERT WIZARD (SLAB & BOX CULVERT)
export interface CulvertWizardParams {
  type: 'Slab Culvert' | 'Single Cell Box Culvert';
  numCulverts: number;
  lengthM: number; // Carriage way + kerb length
  clearSpan: number; // m
  clearHeight: number; // m
  deckThickness: number; // m
  invertThickness: number; // m (for box)
  wallThickness: number; // m (for box)
  haunchSize: number; // m, e.g. 0.150 or 0.300
  cover: number; // m, default 0.040
  mainDia: RebarDiameter;
  mainSpacing: number; // m, e.g. 0.125
  distDia: RebarDiameter;
  distSpacing: number; // m, e.g. 0.175
  haunchDia: RebarDiameter;
}

export function generateCulvertBars(params: CulvertWizardParams): BarItem[] {
  const bars: BarItem[] = [];
  const cover = params.cover;
  const numMainBars = Math.floor(params.lengthM / params.mainSpacing) + 1;

  if (params.type === 'Slab Culvert') {
    // Deck Slab Main Bottom U-Bars
    const deckRun = params.clearSpan + 2 * 0.400 - 2 * cover; // 400mm bearing on abutments
    const deckHook = Math.max(0.15, params.deckThickness - 2 * cover);

    bars.push(
      createBarHelper({
        id: `CUL-DK-MAIN-${Date.now()}-1`,
        barMark: 'SC-DK-01',
        member: 'Culvert',
        description: `Deck Slab Main Tension U-Bars (c/c ${Math.round(params.mainSpacing * 1000)}mm)`,
        diameter: params.mainDia,
        numElements: params.numCulverts,
        numBarsPerElement: numMainBars,
        shapeCode: '21',
        dimA: Number(deckHook.toFixed(3)),
        dimB: Number(deckRun.toFixed(3)),
        dimC: Number(deckHook.toFixed(3)),
        remarks: 'Main IRC load-carrying reinforcement across carriage way',
      })
    );

    // Deck Distribution Bars
    const numDist = Math.floor(deckRun / params.distSpacing) + 1;
    bars.push(
      createBarHelper({
        id: `CUL-DK-DIST-${Date.now()}-2`,
        barMark: 'SC-DK-02',
        member: 'Culvert',
        description: `Deck Slab Transverse Distribution (c/c ${Math.round(params.distSpacing * 1000)}mm)`,
        diameter: params.distDia,
        numElements: params.numCulverts,
        numBarsPerElement: numDist,
        shapeCode: '00',
        dimA: Number((params.lengthM - 2 * cover).toFixed(3)),
        remarks: 'Distribution bars under live traffic loads according to IRC:112',
      })
    );
  } else {
    // Single Cell Box Culvert
    // Top Deck Slab U-Bars
    const boxSpan = params.clearSpan + 2 * params.wallThickness - 2 * cover;
    const boxDeckLeg = Math.max(0.30, params.deckThickness + params.haunchSize);

    bars.push(
      createBarHelper({
        id: `BOX-DK-${Date.now()}-1`,
        barMark: 'BC-DK-01',
        member: 'Culvert',
        description: `Box Culvert Top Deck Outer Rebar (c/c ${Math.round(params.mainSpacing * 1000)}mm)`,
        diameter: params.mainDia,
        numElements: params.numCulverts,
        numBarsPerElement: numMainBars,
        shapeCode: '21',
        dimA: Number(boxDeckLeg.toFixed(3)),
        dimB: Number(boxSpan.toFixed(3)),
        dimC: Number(boxDeckLeg.toFixed(3)),
        remarks: 'Top slab rigid frame outer reinforcement continuous into sidewalls',
      })
    );

    // Invert Bottom Slab U-Bars
    const boxInvertLeg = Math.max(0.30, params.invertThickness + params.haunchSize);
    bars.push(
      createBarHelper({
        id: `BOX-INV-${Date.now()}-2`,
        barMark: 'BC-INV-01',
        member: 'Culvert',
        description: `Box Culvert Invert Slab Bottom Rebar (c/c ${Math.round(params.mainSpacing * 1000)}mm)`,
        diameter: params.mainDia,
        numElements: params.numCulverts,
        numBarsPerElement: numMainBars,
        shapeCode: '21',
        dimA: Number(boxInvertLeg.toFixed(3)),
        dimB: Number(boxSpan.toFixed(3)),
        dimC: Number(boxInvertLeg.toFixed(3)),
        remarks: 'Invert bottom slab tensile rebar under soil upward pressure',
      })
    );

    // 45° Corner Haunch Ties (Shape 61) - 4 haunches per section
    const haunchHyp = Number((Math.SQRT2 * params.haunchSize).toFixed(3));
    const haunchLeg = 0.300; // anchor leg
    const haunchBarsCount = Math.floor(params.lengthM / 0.200) + 1; // c/c 200mm

    bars.push(
      createBarHelper({
        id: `BOX-HNC-${Date.now()}-3`,
        barMark: 'BC-HN-01',
        member: 'Culvert',
        description: `45° Diagonal Haunch Corner Ties (4 Corners, c/c 200mm)`,
        diameter: params.haunchDia,
        numElements: params.numCulverts,
        numBarsPerElement: haunchBarsCount * 4,
        shapeCode: '61',
        dimA: haunchHyp,
        dimB: haunchLeg,
        remarks: 'Diagonal haunch ties resisting rigid corner negative bending moments',
      })
    );
  }

  return bars;
}

// 7. RCC DOG-LEGGED STAIRCASE WIZARD
export interface StaircaseWizardParams {
  numFlights: number;
  waistSpanL: number; // m horizontal
  waistThickness: number; // m, e.g. 0.150
  riserR: number; // m, e.g. 0.150
  treadT: number; // m, e.g. 0.250
  landing1L: number; // m, e.g. 1.200
  landing2L: number; // m, e.g. 1.200
  flightWidth: number; // m, e.g. 1.200
  clearCover: number; // m, e.g. 0.020
  mainDia: RebarDiameter;
  mainSpacing: number; // m, e.g. 0.150
  distDia: RebarDiameter;
  distSpacing: number; // m, e.g. 0.200
}

export function generateStaircaseBars(params: StaircaseWizardParams): BarItem[] {
  const bars: BarItem[] = [];
  const cover = params.clearCover;
  const numSteps = Math.round(params.waistSpanL / params.treadT);
  const totalRise = numSteps * params.riserR;
  const inclinedFlightLen = Number(Math.sqrt(params.waistSpanL * params.waistSpanL + totalRise * totalRise).toFixed(3));

  const numMainBars = Math.floor(params.flightWidth / params.mainSpacing) + 1;

  // Waist Slab Main Bottom Bar with Crank continuation into landing (to prevent pop-out)
  const landingExt = Number((params.landing1L - cover).toFixed(3));
  bars.push(
    createBarHelper({
      id: `STR-MB-${Date.now()}-1`,
      barMark: 'ST-MB-01',
      member: 'Staircase',
      description: `Flight Waist Main Bars Continuing into Landing (c/c ${Math.round(params.mainSpacing * 1000)}mm)`,
      diameter: params.mainDia,
      numElements: params.numFlights,
      numBarsPerElement: numMainBars,
      shapeCode: '11',
      dimA: inclinedFlightLen + landingExt,
      dimB: 0.300,
      remarks: 'Main tension rebar detailing strictly adhering to SP 34 re-entrant corner rule',
    })
  );

  // Landing Top Negative Moment Mesh
  const numLandingBars = Math.floor(params.flightWidth / params.mainSpacing) + 1;
  bars.push(
    createBarHelper({
      id: `STR-LT-${Date.now()}-2`,
      barMark: 'ST-LT-01',
      member: 'Staircase',
      description: `Landing Top Negative Reinforcement (c/c ${Math.round(params.mainSpacing * 1000)}mm)`,
      diameter: params.mainDia,
      numElements: params.numFlights,
      numBarsPerElement: numLandingBars,
      shapeCode: '11',
      dimA: Number((params.landing2L + 0.40).toFixed(3)),
      dimB: Number((params.waistThickness - 2 * cover).toFixed(3)),
      remarks: 'Top negative moment reinforcement over landing supports',
    })
  );

  // Step Step-Tread Distribution Rebars
  const numDistBars = numSteps + Math.floor(inclinedFlightLen / params.distSpacing);
  bars.push(
    createBarHelper({
      id: `STR-DB-${Date.now()}-3`,
      barMark: 'ST-DB-01',
      member: 'Staircase',
      description: `Waist & Step Distribution Bars (c/c ${Math.round(params.distSpacing * 1000)}mm)`,
      diameter: params.distDia,
      numElements: params.numFlights,
      numBarsPerElement: numDistBars,
      shapeCode: '00',
      dimA: Number((params.flightWidth - 2 * cover).toFixed(3)),
      remarks: 'Transverse distribution along width of staircase flight',
    })
  );

  return bars;
}
