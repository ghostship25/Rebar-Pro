import { BarItem, ProjectData } from '../types/bbs';
import { buildBarSketch, sketchBounds, BarSketch, Pt } from './dxfShapes';

/**
 * ASCII DXF (AutoCAD R12 / AC1009) export of the bar bending schedule as a drawing
 * table with a to-scale, dimensioned shape sketch per bar (one uniform scale per bar, stated
 * per row). Units: millimetres, 1 drawing unit = 1 mm. Dimension labels show true values.
 */

function clean(value: unknown): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .slice(0, 200);
}

const f = (n: number) => (Number.isFinite(n) ? n.toFixed(3) : '0.000');

class DxfWriter {
  private out: string[] = [];

  line(x1: number, y1: number, x2: number, y2: number, layer: string) {
    this.out.push('0', 'LINE', '8', layer, '10', f(x1), '20', f(y1), '30', '0', '11', f(x2), '21', f(y2), '31', '0');
  }

  polyline(points: Pt[], layer: string) {
    for (let i = 0; i < points.length - 1; i++) {
      this.line(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], layer);
    }
  }

  circle(cx: number, cy: number, r: number, layer: string) {
    this.out.push('0', 'CIRCLE', '8', layer, '10', f(cx), '20', f(cy), '30', '0', '40', f(r));
  }

  text(x: number, y: number, height: number, value: string, layer: string) {
    const t = clean(value);
    if (!t) return;
    this.out.push('0', 'TEXT', '8', layer, '10', f(x), '20', f(y), '30', '0', '40', f(height), '1', t);
  }

  build(layers: string[]): string {
    const header = ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC'];
    const tables = [
      '0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', String(layers.length),
      ...layers.flatMap((name, i) => ['0', 'LAYER', '2', name, '70', '0', '62', String(i + 2), '6', 'CONTINUOUS']),
      '0', 'ENDTAB', '0', 'ENDSEC',
    ];
    const entities = ['0', 'SECTION', '2', 'ENTITIES', ...this.out, '0', 'ENDSEC'];
    return [...header, ...tables, ...entities, '0', 'EOF', ''].join('\r\n');
  }
}

const COLUMNS: { title: string; width: number }[] = [
  { title: 'BAR MARK', width: 34 },
  { title: 'MEMBER / DESCRIPTION', width: 90 },
  { title: 'DIA', width: 16 },
  { title: 'SHAPE', width: 22 },
  { title: 'SKETCH (DIMS IN mm)', width: 130 },
  { title: 'NOS', width: 18 },
  { title: 'A (m)', width: 20 },
  { title: 'B (m)', width: 20 },
  { title: 'C (m)', width: 20 },
  { title: 'CUT LEN (m)', width: 26 },
  { title: 'TOTAL LEN (m)', width: 30 },
  { title: 'WT (kg)', width: 26 },
];

const ROW_H = 60;
const HEAD_H = 12;
const TEXT_H = 3.5;
const DIM_H = 2.2;
const DIM_OFF = 5;
const SCALES = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];
// Sketch drawing area inside the SKETCH cell (leaves room for dimension lines and labels)
const SK_L = 16, SK_R = 16, SK_B = 15, SK_T = 10;
const SK_W = 130 - SK_L - SK_R;
const SK_H = ROW_H - SK_B - SK_T;

function pickScale(w: number, h: number): number {
  for (const n of SCALES) if (w / n <= SK_W && h / n <= SK_H) return n;
  let n = 1000;
  while ((w / n > SK_W || h / n > SK_H) && n < 1e9) n *= 2;
  return n;
}

export function barsToDxf(project: ProjectData): string {
  const dxf = new DxfWriter();
  const bars: BarItem[] = project.bars;
  const totalW = COLUMNS.reduce((a, c) => a + c.width, 0);
  const tableTop = 0;

  const meta = project.metadata;
  dxf.text(0, 28, 7, `BAR BENDING SCHEDULE - ${meta.projectTitle || 'Project'}`, 'BBS_TEXT');
  dxf.text(0, 18, TEXT_H, `Drawing: ${meta.drawingNumber || '-'}   Rev: ${meta.revision || '-'}   Date: ${meta.date || '-'}`, 'BBS_TEXT');
  dxf.text(0, 11, TEXT_H, 'Sketches drawn to scale (scale stated per row); sketch dimensions in mm, table dimensions in metres, diameters in mm.', 'BBS_TEXT');

  // Header row
  let x = 0;
  COLUMNS.forEach((c) => {
    dxf.text(x + 2, tableTop - HEAD_H + 4, TEXT_H, c.title, 'BBS_TEXT');
    x += c.width;
  });
  dxf.line(0, tableTop, totalW, tableTop, 'BBS_TABLE');
  dxf.line(0, tableTop - HEAD_H, totalW, tableTop - HEAD_H, 'BBS_TABLE');

  let y = tableTop - HEAD_H;
  let sumWt = 0;
  bars.forEach((bar) => {
    const rowBottom = y - ROW_H;
    const base = rowBottom + ROW_H / 2 - 1.5;
    const cells = [
      bar.barMark,
      `${bar.member}: ${bar.description}`,
      `T${bar.diameter}`,
      bar.shapeCode,
      '',
      String(bar.totalBars),
      f2(bar.dimA),
      f2(bar.dimB),
      f2(bar.dimC),
      bar.cuttingLength.toFixed(3),
      bar.totalLength.toFixed(2),
      bar.totalWeight.toFixed(2),
    ];
    let cx = 0;
    cells.forEach((value, i) => {
      if (value) dxf.text(cx + 2, base, TEXT_H, i === 1 ? value.slice(0, 40) : value, 'BBS_TEXT');
      if (i === 4) drawSketch(dxf, bar, cx, rowBottom);
      cx += COLUMNS[i].width;
    });
    dxf.line(0, rowBottom, totalW, rowBottom, 'BBS_TABLE');
    sumWt += bar.totalWeight;
    y = rowBottom;
  });

  // Vertical rules and totals
  let vx = 0;
  [0, ...COLUMNS.map((c) => (vx += c.width))].forEach((xx) => dxf.line(xx, tableTop, xx, y, 'BBS_TABLE'));
  dxf.text(totalW - 90, y - 10, 5, `TOTAL WEIGHT: ${sumWt.toFixed(2)} kg`, 'BBS_TEXT');

  return dxf.build(['BBS_TABLE', 'BBS_TEXT', 'BBS_REBAR', 'BBS_DIM']);
}

function f2(n?: number): string {
  return n !== undefined && Number.isFinite(n) && n > 0 ? n.toFixed(3) : '';
}

function drawSketch(dxf: DxfWriter, bar: BarItem, cellX: number, rowBottom: number) {
  const sk: BarSketch = buildBarSketch(bar);
  const b = sketchBounds(sk);
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  const n = pickScale(w, h);
  const ox = cellX + SK_L + (SK_W - w / n) / 2;
  const oy = rowBottom + SK_B + (SK_H - h / n) / 2;
  const T = ([x, y]: Pt): Pt => [ox + (x - b.minX) / n, oy + (y - b.minY) / n];
  const centre: Pt = [ox + w / n / 2, oy + h / n / 2];

  sk.paths.forEach((p) => dxf.polyline(p.map(T), 'BBS_REBAR'));
  if (sk.circle) {
    const c = T(sk.circle.c);
    dxf.circle(c[0], c[1], sk.circle.r / n, 'BBS_REBAR');
  }
  sk.dims.forEach((d) => drawDim(dxf, T(d.p1), T(d.p2), d.label, d.side, centre));

  const info = [`Sketch scale 1:${n}`, ...sk.notes].join(' | ');
  dxf.text(cellX + 2, rowBottom + 1.5, DIM_H, info.slice(0, 70), 'BBS_DIM');
}

function drawDim(dxf: DxfWriter, p1: Pt, p2: Pt, label: string, side: Pt | undefined, centre: Pt) {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const len = Math.hypot(dx, dy);
  let n: Pt;
  if (side && Math.hypot(side[0], side[1]) > 0) {
    const sl = Math.hypot(side[0], side[1]);
    n = [side[0] / sl, side[1] / sl];
  } else if (len > 1e-6) {
    n = [-dy / len, dx / len];
    const mx = (p1[0] + p2[0]) / 2 - centre[0];
    const my = (p1[1] + p2[1]) / 2 - centre[1];
    if (n[0] * mx + n[1] * my < 0) n = [-n[0], -n[1]];
  } else {
    n = [0, -1];
  }
  const q1: Pt = [p1[0] + n[0] * DIM_OFF, p1[1] + n[1] * DIM_OFF];
  const q2: Pt = [p2[0] + n[0] * DIM_OFF, p2[1] + n[1] * DIM_OFF];
  const mid: Pt = [(q1[0] + q2[0]) / 2, (q1[1] + q2[1]) / 2];

  if (len > 1e-6) {
    const ux = dx / len, uy = dy / len;
    dxf.line(q1[0], q1[1], q2[0], q2[1], 'BBS_DIM');
    // extension lines
    [[p1, q1], [p2, q2]].forEach(([p, q]) => {
      dxf.line(p[0] + n[0] * 1, p[1] + n[1] * 1, q[0] + n[0] * 1.2, q[1] + n[1] * 1.2, 'BBS_DIM');
    });
    // 45-degree tick marks
    const tx = (ux + n[0]) * 0.8, ty = (uy + n[1]) * 0.8;
    [q1, q2].forEach((q) => dxf.line(q[0] - tx, q[1] - ty, q[0] + tx, q[1] + ty, 'BBS_DIM'));
  }
  const tw = label.length * DIM_H * 0.8;
  const extent = Math.abs(n[0]) * tw / 2 + Math.abs(n[1]) * DIM_H / 2 + 0.8;
  const cx = mid[0] + n[0] * extent;
  const cy = mid[1] + n[1] * extent;
  dxf.text(cx - tw / 2, cy - DIM_H / 2, DIM_H, label, 'BBS_DIM');
}
