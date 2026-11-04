import { BarItem, ProjectData, ShapeCode } from '../types/bbs';

/**
 * ASCII DXF (AutoCAD R12 / AC1009) export of the bar bending schedule as a drawing
 * table with a schematic shape sketch per bar. Units: millimetres, 1 drawing unit = 1 mm.
 * Sketches are schematic (not to scale); the dimensions are given in the A-F columns.
 */

type Pt = [number, number];

// Schematic shapes on an 80 x 40 grid (y up). Mirrors MiniRebarSvg.
const SHAPES: Partial<Record<ShapeCode, Pt[][]>> = {
  '00': [[[10, 20], [70, 20]]],
  '11': [[[12, 10], [68, 10], [68, 30]]],
  '21': [[[14, 30], [14, 10], [66, 10], [66, 30]]],
  '51': [[[18, 32], [62, 32], [62, 8], [18, 8], [18, 32]]],
  '41': [[[8, 12], [24, 12], [36, 28], [52, 28], [64, 12], [72, 12]]],
  '31': [[[10, 8], [24, 8], [24, 28], [56, 28], [56, 8], [70, 8]]],
  '71': [[[16, 10], [16, 28], [64, 28], [64, 10]]],
  '61': [[[18, 30], [18, 18], [62, 18], [62, 6]]],
  '81': [[[40, 34], [66, 20], [40, 6], [14, 20], [40, 34]]],
  '99': [[[10, 12], [30, 12], [45, 28], [68, 22]]],
};

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
  { title: 'SHAPE', width: 14 },
  { title: 'SKETCH', width: 52 },
  { title: 'NOS', width: 18 },
  { title: 'A (m)', width: 20 },
  { title: 'B (m)', width: 20 },
  { title: 'C (m)', width: 20 },
  { title: 'CUT LEN (m)', width: 26 },
  { title: 'TOTAL LEN (m)', width: 30 },
  { title: 'WT (kg)', width: 26 },
];

const ROW_H = 30;
const HEAD_H = 12;
const TEXT_H = 3.5;

export function barsToDxf(project: ProjectData): string {
  const dxf = new DxfWriter();
  const bars: BarItem[] = project.bars;
  const totalW = COLUMNS.reduce((a, c) => a + c.width, 0);
  const tableTop = 0;

  const meta = project.metadata;
  dxf.text(0, 28, 7, `BAR BENDING SCHEDULE - ${meta.projectTitle || 'Project'}`, 'BBS_TEXT');
  dxf.text(0, 18, TEXT_H, `Drawing: ${meta.drawingNumber || '-'}   Rev: ${meta.revision || '-'}   Date: ${meta.date || '-'}`, 'BBS_TEXT');
  dxf.text(0, 11, TEXT_H, 'Sketches are schematic and not to scale. Dimensions in metres; diameters in mm.', 'BBS_TEXT');

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
    const base = rowBottom + 11;
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
      if (i === 4) drawSketch(dxf, bar.shapeCode, cx + 6, rowBottom + 5, 40 / 80);
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

  return dxf.build(['BBS_TABLE', 'BBS_TEXT', 'BBS_REBAR']);
}

function f2(n?: number): string {
  return n !== undefined && Number.isFinite(n) && n > 0 ? n.toFixed(3) : '';
}

function drawSketch(dxf: DxfWriter, code: ShapeCode, ox: number, oy: number, scale: number) {
  if (code === '77') {
    dxf.circle(ox + 40 * scale, oy + 20 * scale, 14 * scale, 'BBS_REBAR');
    return;
  }
  const paths = SHAPES[code] ?? SHAPES['00']!;
  paths.forEach((p) => dxf.polyline(p.map(([px, py]) => [ox + px * scale, oy + py * scale] as Pt), 'BBS_REBAR'));
}
