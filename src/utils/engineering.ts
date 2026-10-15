import { RebarDiameter, BarItem } from '../types/bbs';

/**
 * Theoretical unit weight of nominal rebar in kg/meter.
 * Formula: Weight = d^2 / 162.28
 * Nominal standard density of reinforcing steel = 7850 kg/m^3
 */
export function calculateUnitWeight(diameterMm: number): number {
  if (diameterMm <= 0) return 0;
  // Weight = (pi * (d/2)^2 * 1m * 7850 kg/m^3) / 10^6
  // = d^2 * 0.006165 = d^2 / 162.28
  return Number((Math.pow(diameterMm, 2) / 162.28).toFixed(3));
}

/**
 * Standard unit weight lookup table for nominal rebar sizes
 * Matches IS 1786 / SP 34 / BS 4449
 */
export const STANDARD_UNIT_WEIGHTS: Record<RebarDiameter, number> = {
  6: 0.222,
  8: 0.395,
  10: 0.617,
  12: 0.888,
  16: 1.580,
  20: 2.470,
  25: 3.858,
  28: 4.834,
  32: 6.313,
  36: 7.990,
  40: 9.870,
};

export function getUnitWeight(diameter: RebarDiameter): number {
  return STANDARD_UNIT_WEIGHTS[diameter] ?? calculateUnitWeight(diameter);
}

/**
 * Standard Bend Deductions (IS 2502:1963 Table 1 & BS 8666:2020)
 * Rebar stretches around mandrel during cold bending:
 * - 45° bend: Deduct 1 × d (in meters: 1 * d / 1000)
 * - 90° bend: Deduct 2 × d (in meters: 2 * d / 1000)
 * - 135° bend: Deduct 3 × d (in meters: 3 * d / 1000)
 * - 180° hook: Deduct 4 × d (in meters: 4 * d / 1000)
 */
export function getBendDeductionMeters(angleDeg: number, diameterMm: number): number {
  const dMeters = diameterMm / 1000;
  if (Math.abs(angleDeg - 45) < 5) return 1 * dMeters;
  if (Math.abs(angleDeg - 90) < 5) return 2 * dMeters;
  if (Math.abs(angleDeg - 135) < 5) return 3 * dMeters;
  if (Math.abs(angleDeg - 180) < 5) return 4 * dMeters;
  // Linear approximation for intermediate angles
  return (angleDeg / 45) * 1 * dMeters;
}

/**
 * Standard Hook Extension for Seismic Stirrups (135° hook)
 * Minimum 10d or 75mm (0.075m), whichever is greater (IS 13920 & BS 8666)
 */
export function getSeismicHookExtensionMeters(diameterMm: number): number {
  const dMeters = diameterMm / 1000;
  return Math.max(10 * dMeters, 0.075);
}

/**
 * Standard 180° Semi-circular Hook Extension
 * Minimum 4d or 65mm extension beyond semi-circle curvature (IS 2502)
 */
export function get180HookExtensionMeters(diameterMm: number): number {
  const dMeters = diameterMm / 1000;
  return Math.max(4 * dMeters, 0.065);
}

/**
 * Recommended Lap Splice Length (IS 456 / SP 34)
 * Compression: 40d
 * Tension: 50d (or 45d to 60d)
 */
export function getRecommendedLapLengthMeters(diameterMm: number, zone: 'tension' | 'compression' = 'tension'): number {
  const factor = zone === 'tension' ? 50 : 40;
  return Number(((factor * diameterMm) / 1000).toFixed(3));
}

/**
 * Binding Wire Estimator:
 * Standard site consumption: 8.0 to 10.0 kg of 18-gauge (1.2mm) GI annealed binding wire
 * per Metric Ton (1000 kg) of rebar.
 */
export function estimateBindingWireKg(totalRebarKg: number, rateKgPerMT: number = 9.0): number {
  const metricTons = totalRebarKg / 1000;
  return Number((metricTons * rateKgPerMT).toFixed(2));
}

export interface AuditIssue {
  barId: string;
  barMark: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  recommendation: string;
}

/**
 * Structural Engineering Schedule Integrity Audit
 */
export function auditBbsSchedule(bars: BarItem[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  bars.forEach((bar) => {
    // 1. Check if cutting length exceeds 12.0m standard mill length
    if (bar.cuttingLength > 12.0) {
      const recLap = getRecommendedLapLengthMeters(bar.diameter, 'tension');
      issues.push({
        barId: bar.id,
        barMark: bar.barMark,
        severity: 'warning',
        message: `Cutting length (${bar.cuttingLength.toFixed(3)}m) exceeds standard commercial stock mill length (12.000m).`,
        recommendation: `Split bar into segments with standard lap splice length of ~${recLap}m (50d for ${bar.diameter}mm rebar) or coupler.`,
      });
    }

    // 2. Check for missing or zero primary dimensions
    if (bar.dimA <= 0) {
      issues.push({
        barId: bar.id,
        barMark: bar.barMark,
        severity: 'error',
        message: `Primary dimension Segment A is 0 or negative (${bar.dimA}m).`,
        recommendation: `Enter a valid dimension for Segment A.`,
      });
    }

    // 3. Check for zero or negative quantities
    if (bar.numElements <= 0 || bar.numBarsPerElement <= 0) {
      issues.push({
        barId: bar.id,
        barMark: bar.barMark,
        severity: 'error',
        message: `Total bar quantity is 0 (Elements: ${bar.numElements}, Bars: ${bar.numBarsPerElement}).`,
        recommendation: `Specify at least 1 element and 1 bar per element.`,
      });
    }

    // 4. Shape specific checks
    if (['11', '21', '51', '31', '71', '61', '81'].includes(bar.shapeCode)) {
      if (!bar.dimB || bar.dimB <= 0) {
        issues.push({
          barId: bar.id,
          barMark: bar.barMark,
          severity: 'error',
          message: `Shape ${bar.shapeCode} requires valid dimension B.`,
          recommendation: `Provide Segment B dimension.`,
        });
      }
    }

    if (['21', '41', '31', '71'].includes(bar.shapeCode)) {
      if (!bar.dimC || bar.dimC <= 0) {
        issues.push({
          barId: bar.id,
          barMark: bar.barMark,
          severity: 'warning',
          message: `Shape ${bar.shapeCode} typically requires Segment C dimension.`,
          recommendation: `Verify Segment C dimension is properly defined.`,
        });
      }
    }
  });

  return issues;
}
