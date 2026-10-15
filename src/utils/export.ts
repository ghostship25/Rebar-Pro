import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProjectData, ShapeCode, STANDARD_DIAMETERS } from '../types/bbs';
import { computeSteelAbstract, optimizeAllDiameters } from './optimizer';

// ---------------------------------------------------------------------------
// Shared styling tokens (used by the Excel export)
// ---------------------------------------------------------------------------

const COLOR_HEADER_FILL = 'FF0F172A'; // slate-900
const COLOR_SUBHEADER_FILL = 'FF0891B2'; // cyan-600
const COLOR_BAND_FILL = 'FFF1F5F9'; // slate-100
const COLOR_TOTALS_FILL = 'FFCFFAFE'; // cyan-100
const COLOR_WHITE = 'FFFFFFFF';
const COLOR_TEXT = 'FF0F172A';
const THIN = { style: 'thin' as const, color: { argb: 'FFCBD5E1' } };
const BORDER_ALL = { top: THIN, left: THIN, bottom: THIN, right: THIN };

function titleRow(ws: ExcelJS.Worksheet, rowNum: number, text: string, colCount: number, fill = COLOR_HEADER_FILL) {
  ws.mergeCells(rowNum, 1, rowNum, colCount);
  const cell = ws.getCell(rowNum, 1);
  cell.value = text;
  cell.font = { bold: true, size: 13, color: { argb: COLOR_WHITE } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(rowNum).height = 22;
}

function metaRow(ws: ExcelJS.Worksheet, rowNum: number, text: string, colCount: number) {
  ws.mergeCells(rowNum, 1, rowNum, colCount);
  const cell = ws.getCell(rowNum, 1);
  cell.value = text;
  cell.font = { italic: true, size: 10, color: { argb: 'FF475569' } };
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
}

function headerRow(ws: ExcelJS.Worksheet, rowNum: number, headers: string[]) {
  const row = ws.getRow(rowNum);
  headers.forEach((h, i) => {
    const cell = row.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 10, color: { argb: COLOR_WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUBHEADER_FILL } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = BORDER_ALL;
  });
  row.height = 30;
}

function styleDataCell(cell: ExcelJS.Cell, isAlt: boolean, numFmt?: string, align: 'left' | 'center' | 'right' = 'left') {
  cell.border = BORDER_ALL;
  cell.font = { size: 10, color: { argb: COLOR_TEXT } };
  cell.alignment = { horizontal: align, vertical: 'middle', wrapText: align === 'left' };
  if (isAlt) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BAND_FILL } };
  }
  if (numFmt) cell.numFmt = numFmt;
}

function styleTotalsRow(ws: ExcelJS.Worksheet, rowNum: number, colCount: number) {
  const row = ws.getRow(rowNum);
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.border = BORDER_ALL;
    cell.font = { bold: true, size: 10, color: { argb: COLOR_TEXT } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTALS_FILL } };
  }
}

/**
 * Derives a live Excel formula for cutting length based on shape code and cell coordinates.
 * Col H = Dia (mm), Col L-P = Dim A-E. Only Excel-2007-and-earlier functions are used
 * (SUM/ROUND/POWER/SQRT/PI/CEILING) so the formulas evaluate correctly in every Excel
 * version and in LibreOffice/Google Sheets, without needing hidden `_xlfn.` prefixes.
 */
function getCuttingLengthExcelFormula(shapeCode: ShapeCode, r: number, fallbackVal: number): string {
  switch (shapeCode) {
    case '00':
      return `L${r}`;
    case '11':
      return `ROUND(L${r}+M${r}-(2*H${r}/1000), 3)`;
    case '21':
      return `ROUND(L${r}+M${r}+N${r}-(4*H${r}/1000), 3)`;
    case '51':
      return `ROUND(2*(L${r}+M${r})+(14*H${r}/1000), 3)`;
    case '41':
      return `ROUND(L${r}+N${r}+P${r}+2*(0.42*M${r}), 3)`;
    case '31':
      return `ROUND(L${r}+2*M${r}+2*N${r}-(4*H${r}/1000), 3)`;
    case '71':
      return `ROUND(L${r}+M${r}+N${r}-(4*H${r}/1000), 3)`;
    case '61':
      return `ROUND(L${r}+M${r}+N${r}-(2*H${r}/1000), 3)`;
    case '81':
      return `ROUND(4*SQRT(POWER(L${r}/2,2)+POWER(M${r}/2,2))+(14*H${r}/1000), 3)`;
    case '77':
      return `ROUND(PI()*L${r}+(40*H${r}/1000), 3)`;
    default:
      // Custom (shape 99) multi-segment geometry can't be reduced to one cell formula —
      // the computed value is written directly, with the full derivation in Remarks.
      return `${fallbackVal.toFixed(3)}`;
  }
}

/**
 * Generates an official, comprehensive, fully-formatted multi-sheet Excel (.xlsx) workbook —
 * bold styled headers, borders, alternating row bands, number formats, frozen header rows,
 * autofilter, and live cell formulas linking quantities, lengths, weights and the abstract.
 * This is a real workbook (via ExcelJS), not a bare/CSV-like value dump.
 */
export async function exportToExcel(project: ProjectData): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'REBAR-PRO BBS & Cutting Optimizer';
  wb.created = new Date();

  // -------------------------------------------------------------
  // Sheet 1: Bar Bending Schedule (BBS) with live formulas
  // -------------------------------------------------------------
  const wsSchedule = wb.addWorksheet('Bar Bending Schedule', {
    views: [{ state: 'frozen', ySplit: 6, showGridLines: false }],
  });

  const scheduleHeaders = [
    'Item / Mark', 'Structure', 'Sub-Component', 'Component', 'Grid / Location', 'Description',
    'Shape Code', 'Dia (mm)', 'No. of Elem', 'Bars / Elem', 'Total Bars',
    'Dim A (m)', 'Dim B (m)', 'Dim C (m)', 'Dim D (m)', 'Dim E (m)',
    'Cutting Length (m)', 'Total Length (m)', 'Unit Weight (kg/m)', 'Total Weight (kg)', 'Remarks / Formula',
  ];
  const colCount = scheduleHeaders.length;

  titleRow(wsSchedule, 1, 'BAR BENDING SCHEDULE (BBS) \u2014 CIVIL & STRUCTURAL ENGINEERING SPECIFICATION', colCount);
  metaRow(wsSchedule, 2, `Project: ${project.metadata.projectTitle}`, colCount);
  metaRow(wsSchedule, 3, `Client: ${project.metadata.clientName}   |   Contractor: ${project.metadata.contractorName}`, colCount);
  metaRow(
    wsSchedule,
    4,
    `Engineer: ${project.metadata.structuralEngineer}   |   Date: ${project.metadata.date}   |   Standard: ${project.metadata.standard}`,
    colCount
  );
  wsSchedule.getRow(5).height = 6;

  headerRow(wsSchedule, 6, scheduleHeaders);

  const startDataRow = 7;
  const numBars = project.bars.length;

  project.bars.forEach((bar, idx) => {
    const r = startDataRow + idx;
    const isAlt = idx % 2 === 1;
    const row = wsSchedule.getRow(r);

    const set = (col: number, value: ExcelJS.CellValue, numFmt?: string, align: 'left' | 'center' | 'right' = 'left') => {
      const cell = row.getCell(col);
      cell.value = value;
      styleDataCell(cell, isAlt, numFmt, align);
    };

    set(1, bar.barMark, undefined, 'center');
    set(2, bar.structureName || 'Main Structure');
    set(3, bar.subComponent || bar.floorOrSection || 'Section 1');
    set(4, bar.component || bar.member);
    set(5, bar.gridOrSection || 'General');
    set(6, bar.description);
    set(7, `Shape ${bar.shapeCode}`, undefined, 'center');
    set(8, bar.diameter, '0', 'center');
    set(9, bar.numElements, '0', 'center');
    set(10, bar.numBarsPerElement, '0', 'center');
    set(11, { formula: `I${r}*J${r}`, result: bar.totalBars }, '0', 'center');
    set(12, bar.dimA, '0.000', 'right');
    set(13, bar.dimB ?? 0, '0.000', 'right');
    set(14, bar.dimC ?? 0, '0.000', 'right');
    set(15, bar.dimD ?? 0, '0.000', 'right');
    set(16, bar.dimE ?? 0, '0.000', 'right');
    set(17, { formula: getCuttingLengthExcelFormula(bar.shapeCode, r, bar.cuttingLength), result: Number(bar.cuttingLength.toFixed(3)) }, '0.000', 'right');
    set(18, { formula: `ROUND(K${r}*Q${r}, 3)`, result: Number(bar.totalLength.toFixed(3)) }, '0.000', 'right');
    set(19, { formula: `ROUND(POWER(H${r},2)/162.28, 3)`, result: Number(bar.unitWeight.toFixed(3)) }, '0.000', 'right');
    set(20, { formula: `ROUND(R${r}*S${r}, 2)`, result: Number(bar.totalWeight.toFixed(2)) }, '#,##0.00', 'right');
    set(21, bar.remarks || bar.formulaExplanation || '');
  });

  const lastDataRow = numBars > 0 ? startDataRow + numBars - 1 : startDataRow;

  if (numBars > 0) {
    const summaryRow = lastDataRow + 2;
    const netWeight = project.bars.reduce((s, b) => s + b.totalWeight, 0);
    const row = wsSchedule.getRow(summaryRow);
    row.getCell(1).value = 'TOTALS';
    row.getCell(2).value = `${numBars} Bar Items`;
    row.getCell(11).value = { formula: `SUM(K${startDataRow}:K${lastDataRow})`, result: project.bars.reduce((s, b) => s + b.totalBars, 0) };
    row.getCell(11).numFmt = '0';
    row.getCell(18).value = { formula: `SUM(R${startDataRow}:R${lastDataRow})`, result: Number(project.bars.reduce((s, b) => s + b.totalLength, 0).toFixed(3)) };
    row.getCell(18).numFmt = '0.000';
    row.getCell(20).value = { formula: `SUM(T${startDataRow}:T${lastDataRow})`, result: Number(netWeight.toFixed(2)) };
    row.getCell(20).numFmt = '#,##0.00';
    // Excel-97-safe string concatenation via `&` (avoids CONCAT, which needs an
    // `_xlfn.` prefix in the raw file format on any pre-2016 reader).
    row.getCell(21).value = { formula: `ROUND(T${summaryRow}/1000, 3)&" MT"`, result: `${(netWeight / 1000).toFixed(3)} MT` };
    styleTotalsRow(wsSchedule, summaryRow, colCount);
  }

  wsSchedule.columns = [
    { width: 14 }, { width: 22 }, { width: 20 }, { width: 18 }, { width: 18 }, { width: 32 },
    { width: 12 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 12 },
    { width: 11 }, { width: 11 }, { width: 11 }, { width: 11 }, { width: 11 },
    { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 30 },
  ];
  wsSchedule.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: colCount } };

  // -------------------------------------------------------------
  // Sheet 2: Diameter-wise Steel Procurement Abstract (SUMIF-linked)
  // -------------------------------------------------------------
  const wsAbstract = wb.addWorksheet('Steel Procurement Abstract', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
  });
  const abstractHeaders = [
    'Bar Dia (mm)', 'Unit Weight (kg/m)', 'Total Running Length (m)', 'Net Weight (kg)', 'Net Weight (MT)',
    'Wastage Allowance (kg)', 'Gross Weight (kg)', 'Gross Weight (MT)', '12m Commercial Bars (Nos)', 'Commercial Purchased Wt (kg)',
  ];
  const absColCount = abstractHeaders.length;

  titleRow(wsAbstract, 1, 'DIAMETER-WISE STEEL PROCUREMENT ABSTRACT', absColCount, COLOR_HEADER_FILL);
  metaRow(wsAbstract, 2, `Project: ${project.metadata.projectTitle}`, absColCount);
  metaRow(wsAbstract, 3, `Standard Wastage Allowance: ${project.metadata.wastagePercent}%`, absColCount);
  wsAbstract.getRow(4).height = 6;
  headerRow(wsAbstract, 5, abstractHeaders);

  const absStartRow = 6;
  const bbsLastRow = Math.max(startDataRow + numBars - 1, startDataRow);
  const abstract = computeSteelAbstract(project.bars, project.metadata.wastagePercent);

  STANDARD_DIAMETERS.forEach((dia, idx) => {
    const r = absStartRow + idx;
    const isAlt = idx % 2 === 1;
    const item = abstract.items.find((i) => i.diameter === dia);
    const unitWt = item ? item.unitWeight : Number(((dia * dia) / 162.28).toFixed(3));
    const runLen = item ? item.totalLengthMeters : 0;
    const netWt = item ? item.netWeightKg : 0;
    const wastage = netWt * (project.metadata.wastagePercent / 100);
    const grossWt = netWt + wastage;
    const stockBars = Math.ceil(runLen / 12);
    const purWt = stockBars * 12 * unitWt;

    const row = wsAbstract.getRow(r);
    const set = (col: number, value: ExcelJS.CellValue, numFmt?: string) => {
      const cell = row.getCell(col);
      cell.value = value;
      styleDataCell(cell, isAlt, numFmt, col === 1 ? 'center' : 'right');
    };

    set(1, dia, '0');
    set(2, { formula: `ROUND(POWER(A${r},2)/162.28, 3)`, result: unitWt }, '0.000');
    set(3, {
      formula: `ROUND(SUMIF('Bar Bending Schedule'!$H$${startDataRow}:$H$${bbsLastRow}, A${r}, 'Bar Bending Schedule'!$R$${startDataRow}:$R$${bbsLastRow}), 3)`,
      result: Number(runLen.toFixed(3)),
    }, '0.000');
    set(4, { formula: `ROUND(B${r}*C${r}, 2)`, result: Number(netWt.toFixed(2)) }, '#,##0.00');
    set(5, { formula: `ROUND(D${r}/1000, 3)`, result: Number((netWt / 1000).toFixed(3)) }, '0.000');
    set(6, { formula: `ROUND(D${r}*($B$3/100), 2)`, result: Number(wastage.toFixed(2)) }, '#,##0.00');
    set(7, { formula: `ROUND(D${r}+F${r}, 2)`, result: Number(grossWt.toFixed(2)) }, '#,##0.00');
    set(8, { formula: `ROUND(G${r}/1000, 3)`, result: Number((grossWt / 1000).toFixed(3)) }, '0.000');
    set(9, { formula: `CEILING(C${r}/12, 1)`, result: stockBars }, '0');
    set(10, { formula: `ROUND(I${r}*12*B${r}, 2)`, result: Number(purWt.toFixed(2)) }, '#,##0.00');
  });

  const absLastDataRow = absStartRow + STANDARD_DIAMETERS.length - 1;
  const absSummaryRow = absLastDataRow + 2;
  const totalLengthMeters = Number(abstract.items.reduce((s, i) => s + i.totalLengthMeters, 0).toFixed(3));
  const totalPurchasedWeightKg = Number(abstract.items.reduce((s, i) => s + i.purchasedWeightKg, 0).toFixed(2));
  const totalWastageKg = Number((abstract.totalGrossWeightKg - abstract.totalNetWeightKg).toFixed(2));

  const sumRow = wsAbstract.getRow(absSummaryRow);
  sumRow.getCell(1).value = 'TOTALS';
  const sumFormula = (col: number, letter: string, result: number, numFmt: string) => {
    sumRow.getCell(col).value = { formula: `SUM(${letter}${absStartRow}:${letter}${absLastDataRow})`, result };
    sumRow.getCell(col).numFmt = numFmt;
  };
  sumFormula(3, 'C', totalLengthMeters, '0.000');
  sumFormula(4, 'D', abstract.totalNetWeightKg, '#,##0.00');
  sumFormula(5, 'E', abstract.totalNetWeightMT, '0.000');
  sumFormula(6, 'F', totalWastageKg, '#,##0.00');
  sumFormula(7, 'G', abstract.totalGrossWeightKg, '#,##0.00');
  sumFormula(8, 'H', abstract.totalGrossWeightMT, '0.000');
  sumFormula(9, 'I', abstract.totalStock12mBars, '0');
  sumFormula(10, 'J', totalPurchasedWeightKg, '#,##0.00');
  styleTotalsRow(wsAbstract, absSummaryRow, absColCount);

  const wireRow = absSummaryRow + 2;
  const wireKg = Number((abstract.totalGrossWeightMT * project.metadata.bindingWireRateKgPerMT).toFixed(2));
  wsAbstract.getCell(wireRow, 1).value = 'ESTIMATED BINDING WIRE';
  wsAbstract.getCell(wireRow, 1).font = { bold: true, size: 10 };
  wsAbstract.getCell(wireRow, 2).value = `@ ${project.metadata.bindingWireRateKgPerMT} kg / MT`;
  wsAbstract.getCell(wireRow, 4).value = { formula: `ROUND(H${absSummaryRow}*${project.metadata.bindingWireRateKgPerMT}, 2)`, result: wireKg };
  wsAbstract.getCell(wireRow, 4).numFmt = '#,##0.00';
  wsAbstract.getCell(wireRow, 5).value = 'kg (18-gauge annealed GI wire)';

  wsAbstract.columns = [
    { width: 14 }, { width: 18 }, { width: 22 }, { width: 16 }, { width: 16 },
    { width: 20 }, { width: 16 }, { width: 16 }, { width: 24 }, { width: 24 },
  ];
  wsAbstract.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: absColCount } };

  // -------------------------------------------------------------
  // Sheet 3: 12m Cutting Stock Optimization (styled reference table)
  // -------------------------------------------------------------
  const wsOpt = wb.addWorksheet('12m Cutting Optimization', { views: [{ showGridLines: false }] });
  const optHeaders = ['Diameter', '12m Stock Bar #', 'Cutting Sequence (Lengths in m)', 'Total Used (m)', 'Remaining Off-cut (m)', 'Scrap Classification', 'Stock Efficiency (%)'];
  const optColCount = optHeaders.length;

  titleRow(wsOpt, 1, '12.0m COMMERCIAL REBAR CUTTING STOCK OPTIMIZATION', optColCount);
  metaRow(wsOpt, 2, '1D Bin-Packing Cutting Plan to Minimize Scrap Off-cuts', optColCount);
  wsOpt.getRow(3).height = 6;
  headerRow(wsOpt, 4, optHeaders);

  let r = 5;
  const optMap = optimizeAllDiameters(project.bars);
  optMap.forEach((result, dia) => {
    wsOpt.mergeCells(r, 1, r, optColCount);
    const diaHeaderCell = wsOpt.getCell(r, 1);
    diaHeaderCell.value = `DIAMETER: T${dia}mm  (${result.stockBarsNeeded} Commercial Bars, ${result.overallEfficiencyPercent}% Overall Efficiency)`;
    diaHeaderCell.font = { bold: true, size: 10, color: { argb: COLOR_WHITE } };
    diaHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUBHEADER_FILL } };
    diaHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
    r++;

    result.patterns.forEach((pat, i) => {
      const cutSeq = pat.cuts.map((c) => `${c.barMark}: ${c.length.toFixed(3)}m`).join(' + ');
      const row = wsOpt.getRow(r);
      const isAlt = i % 2 === 1;
      row.getCell(1).value = `T${dia}`;
      row.getCell(2).value = pat.source === 'offcut' ? `Offcut ${pat.offcutId}` : `Bar #${pat.barIndex}`;
      row.getCell(3).value = cutSeq;
      row.getCell(4).value = Number(pat.usedLength.toFixed(3));
      row.getCell(5).value = Number(pat.offCutLength.toFixed(3));
      row.getCell(6).value = pat.isScrapUsable ? 'Usable Scrap (\u2265 1.0m)' : 'Waste (< 1.0m)';
      row.getCell(7).value = `${pat.efficiencyPercent}%`;
      for (let c = 1; c <= optColCount; c++) {
        styleDataCell(row.getCell(c), isAlt, c === 4 || c === 5 ? '0.000' : undefined, c === 4 || c === 5 || c === 7 ? 'right' : c === 1 || c === 2 ? 'center' : 'left');
      }
      r++;
    });
    r++; // spacer row between diameters
  });

  wsOpt.columns = [
    { width: 12 }, { width: 14 }, { width: 55 }, { width: 14 }, { width: 18 }, { width: 22 }, { width: 16 },
  ];

  // -------------------------------------------------------------
  // Download
  // -------------------------------------------------------------
  const cleanTitle = project.metadata.projectTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cleanTitle}_BBS_Schedule.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// PDF export — a real, directly downloadable .pdf (no browser print dialog
// required). Uses jsPDF + autotable to lay out the BBS schedule and the
// diameter-wise steel abstract as proper paginated tables.
// ---------------------------------------------------------------------------

export function exportToPdf(project: ProjectData): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;

  const drawHeader = () => {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('BAR BENDING SCHEDULE (BBS)', margin, 14);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Project: ${project.metadata.projectTitle}   |   Client: ${project.metadata.clientName}   |   Contractor: ${project.metadata.contractorName}`,
      margin,
      19
    );
    doc.text(
      `Engineer: ${project.metadata.structuralEngineer}   |   Date: ${project.metadata.date}   |   Standard: ${project.metadata.standard}`,
      margin,
      23.5
    );
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, 26, pageWidth - margin, 26);
  };

  drawHeader();

  const netWeight = project.bars.reduce((s, b) => s + b.totalWeight, 0);
  const totalBars = project.bars.reduce((s, b) => s + b.totalBars, 0);
  const totalLength = project.bars.reduce((s, b) => s + b.totalLength, 0);

  autoTable(doc, {
    startY: 30,
    margin: { left: margin, right: margin },
    head: [[
      'Mark', 'Structure', 'Component', 'Description', 'Shape', 'Dia\n(mm)', 'Elem', 'Bars/\nElem',
      'Total\nBars', 'A (m)', 'B (m)', 'C (m)', 'Cutting\nLen (m)', 'Total\nLen (m)', 'Unit Wt\n(kg/m)', 'Total Wt\n(kg)',
    ]],
    body: project.bars.map((bar) => [
      bar.barMark,
      bar.structureName || 'Main Structure',
      bar.component || bar.member,
      bar.description,
      bar.shapeCode,
      bar.diameter.toFixed(0),
      bar.numElements.toFixed(0),
      bar.numBarsPerElement.toFixed(0),
      bar.totalBars.toFixed(0),
      bar.dimA.toFixed(3),
      (bar.dimB ?? 0).toFixed(3),
      (bar.dimC ?? 0).toFixed(3),
      bar.cuttingLength.toFixed(3),
      bar.totalLength.toFixed(3),
      bar.unitWeight.toFixed(3),
      bar.totalWeight.toFixed(2),
    ]),
    foot: [[
      'TOTALS', '', '', '', '', '', '', '', totalBars.toFixed(0), '', '', '', '', totalLength.toFixed(3), '', netWeight.toFixed(2),
    ]],
    styles: { fontSize: 7, cellPadding: 1.5, textColor: [15, 23, 42], lineColor: [203, 213, 225], lineWidth: 0.1 },
    headStyles: { fillColor: [8, 145, 178], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [207, 250, 254], textColor: [15, 23, 42], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    columnStyles: {
      0: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' },
      7: { halign: 'center' }, 8: { halign: 'center' }, 9: { halign: 'right' }, 10: { halign: 'right' },
      11: { halign: 'right' }, 12: { halign: 'right' }, 13: { halign: 'right' }, 14: { halign: 'right' }, 15: { halign: 'right' },
    },
    didDrawPage: () => {
      if (doc.getCurrentPageInfo().pageNumber > 1) drawHeader();
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${doc.getCurrentPageInfo().pageNumber} of ${pageCount}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 5, { align: 'right' });
    },
  });

  // Steel abstract summary on a new page
  const abstract = computeSteelAbstract(project.bars, project.metadata.wastagePercent);
  doc.addPage();
  drawHeader();
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Diameter-wise Steel Procurement Abstract', margin, 33);

  autoTable(doc, {
    startY: 37,
    margin: { left: margin, right: margin },
    head: [['Dia (mm)', 'Unit Wt (kg/m)', 'Run Length (m)', 'Net Wt (kg)', 'Net Wt (MT)', 'Wastage (kg)', 'Gross Wt (kg)', 'Gross Wt (MT)', '12m Bars', 'Purchased Wt (kg)']],
    body: abstract.items.map((i) => [
      i.diameter.toFixed(0), i.unitWeight.toFixed(3), i.totalLengthMeters.toFixed(3), i.netWeightKg.toFixed(2),
      i.netWeightMT.toFixed(3), i.wastageWeightKg.toFixed(2), i.grossWeightKg.toFixed(2), i.grossWeightMT.toFixed(3),
      i.stockBars12mNeeded.toFixed(0), i.purchasedWeightKg.toFixed(2),
    ]),
    foot: [[
      'TOTALS', '', '', abstract.totalNetWeightKg.toFixed(2), abstract.totalNetWeightMT.toFixed(3), '',
      abstract.totalGrossWeightKg.toFixed(2), abstract.totalGrossWeightMT.toFixed(3), abstract.totalStock12mBars.toFixed(0), '',
    ]],
    styles: { fontSize: 8, cellPadding: 2, textColor: [15, 23, 42], lineColor: [203, 213, 225], lineWidth: 0.1, halign: 'right' },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [207, 250, 254], textColor: [15, 23, 42], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    columnStyles: { 0: { halign: 'center' } },
  });

  const cleanTitle = project.metadata.projectTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${cleanTitle}_BBS_Report.pdf`);
}

/**
 * Exports project as a JSON file (.bbs)
 */
export function exportToJson(project: ProjectData) {
  const jsonStr = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const cleanTitle = project.metadata.projectTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.href = url;
  a.download = `${cleanTitle}.bbs`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Loads project from JSON file
 */
export function loadProjectFromJson(file: File): Promise<ProjectData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as ProjectData;
        if (!parsed.metadata || !Array.isArray(parsed.bars)) {
          throw new Error('Invalid BBS Project file format.');
        }
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
