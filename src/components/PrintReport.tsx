import React from 'react';
import { ProjectData } from '../types/bbs';
import { computeSteelAbstract } from '../utils/optimizer';
import { estimateBindingWireKg } from '../utils/engineering';
import { exportToPdf } from '../utils/export';
import { MiniRebarSvg } from './MiniRebarSvg';
import { Printer, ArrowLeft, Download } from 'lucide-react';

interface PrintReportProps {
  project: ProjectData;
  onClose: () => void;
}

export const PrintReport: React.FC<PrintReportProps> = ({ project, onClose }) => {
  const abstract = computeSteelAbstract(project.bars, project.metadata.wastagePercent);
  const bindingWireKg = estimateBindingWireKg(abstract.totalGrossWeightKg, project.metadata.bindingWireRateKgPerMT);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 md:p-8">
      {/* Top Floating Control Bar (Hidden when printing) */}
      <div className="no-print max-w-6xl mx-auto mb-6 flex items-center justify-between bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-4 rounded-xl shadow-xl text-slate-900 dark:text-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 hover:dark:text-white bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 hover:dark:bg-slate-600 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Schedule
          </button>
          <div>
            <h3 className="text-sm font-semibold">Official Engineering BBS Print & PDF Layout</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">Formatted for standard A4 Landscape print</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToPdf(project)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 hover:dark:bg-slate-600 rounded-lg transition-colors"
            title="Download a PDF file directly, without opening the print dialog"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-md"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
        </div>

      </div>

      {/* Official White A4 Print Sheet Container */}
      <div className="print-container max-w-6xl mx-auto bg-white text-slate-900 shadow-2xl p-8 rounded-xl font-sans text-xs border border-slate-300">
        {/* Title Header Block */}
        <div className="border-2 border-slate-900 p-4 mb-4">
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block">
                Civil & Structural Engineering Bar Bending Schedule (BBS)
              </span>
              <h1 className="text-xl font-black text-slate-900 uppercase">
                {project.metadata.projectTitle}
              </h1>
              <div className="text-xs font-medium text-slate-700 mt-1">
                Standard: <strong className="text-slate-900">{project.metadata.standard}</strong> · Code Compliance: IS 456, IS 1786, SP 34 & BS 8666:2020
              </div>
            </div>

            <div className="text-right font-mono text-[11px] space-y-0.5">
              <div>Drawing No: <strong className="text-slate-900">{project.metadata.drawingNumber}</strong></div>
              <div>Revision: <strong className="text-slate-900">{project.metadata.revision}</strong></div>
              <div>Date: <strong className="text-slate-900">{project.metadata.date}</strong></div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
            <div>
              <span className="text-slate-500 dark:text-slate-500 block text-[10px]">Client / Employer:</span>
              <span className="font-semibold text-slate-800">{project.metadata.clientName}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-500 block text-[10px]">Main Contractor:</span>
              <span className="font-semibold text-slate-800">{project.metadata.contractorName}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-500 block text-[10px]">Structural Engineer:</span>
              <span className="font-semibold text-slate-800">{project.metadata.structuralEngineer}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-500 block text-[10px]">Checked & Verified By:</span>
              <span className="font-semibold text-slate-800">{project.metadata.checkedBy}</span>
            </div>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full border-collapse border border-slate-900 text-[10.5px]">
            <thead>
              <tr className="bg-slate-100 text-slate-900 border-b border-slate-900 uppercase font-bold text-[10px]">
                <th className="border border-slate-900 p-1.5 text-center">Item</th>
                <th className="border border-slate-900 p-1.5 text-left">Member</th>
                <th className="border border-slate-900 p-1.5 text-left">Description</th>
                <th className="border border-slate-900 p-1.5 text-center">Dia</th>
                <th className="border border-slate-900 p-1.5 text-center">No. Elem</th>
                <th className="border border-slate-900 p-1.5 text-center">Bars / Elem</th>
                <th className="border border-slate-900 p-1.5 text-center">Total Bars</th>
                <th className="border border-slate-900 p-1.5 text-center w-20">Shape Sketch</th>
                <th className="border border-slate-900 p-1.5 text-center">A (m)</th>
                <th className="border border-slate-900 p-1.5 text-center">B (m)</th>
                <th className="border border-slate-900 p-1.5 text-center">C (m)</th>
                <th className="border border-slate-900 p-1.5 text-right font-bold">Cut Len (m)</th>
                <th className="border border-slate-900 p-1.5 text-right">Total Run (m)</th>
                <th className="border border-slate-900 p-1.5 text-right">Unit Wt (kg/m)</th>
                <th className="border border-slate-900 p-1.5 text-right font-bold">Total Wt (kg)</th>
              </tr>
            </thead>
            <tbody>
              {project.bars.map((bar, index) => (
                <tr key={bar.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-900 p-1 text-center font-mono font-bold">{bar.barMark}</td>
                  <td className="border border-slate-900 p-1 font-semibold">{bar.member}</td>
                  <td className="border border-slate-900 p-1">
                    <div>{bar.description}</div>
                    {bar.remarks && <div className="text-[9px] text-slate-500 dark:text-slate-500 italic">{bar.remarks}</div>}
                  </td>
                  <td className="border border-slate-900 p-1 text-center font-mono font-bold">T{bar.diameter}</td>
                  <td className="border border-slate-900 p-1 text-center font-mono">{bar.numElements}</td>
                  <td className="border border-slate-900 p-1 text-center font-mono">{bar.numBarsPerElement}</td>
                  <td className="border border-slate-900 p-1 text-center font-mono font-bold">{bar.totalBars}</td>
                  <td className="border border-slate-900 p-1 text-center">
                    <div className="flex flex-col items-center">
                      <MiniRebarSvg shapeCode={bar.shapeCode} className="w-16 h-8 invert" />
                      <span className="text-[8px] font-mono text-slate-600">Code {bar.shapeCode}</span>
                    </div>
                  </td>
                  <td className="border border-slate-900 p-1 text-center font-mono">{bar.dimA.toFixed(3)}</td>
                  <td className="border border-slate-900 p-1 text-center font-mono">{bar.dimB !== undefined ? bar.dimB.toFixed(3) : '-'}</td>
                  <td className="border border-slate-900 p-1 text-center font-mono">{bar.dimC !== undefined ? bar.dimC.toFixed(3) : '-'}</td>
                  <td className="border border-slate-900 p-1 text-right font-mono font-bold text-slate-900">{bar.cuttingLength.toFixed(3)}</td>
                  <td className="border border-slate-900 p-1 text-right font-mono">{bar.totalLength.toFixed(3)}</td>
                  <td className="border border-slate-900 p-1 text-right font-mono">{bar.unitWeight.toFixed(3)}</td>
                  <td className="border border-slate-900 p-1 text-right font-mono font-bold">{bar.totalWeight.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-200 border-t-2 border-slate-900 font-mono font-bold text-[11px]">
                <td colSpan={14} className="border border-slate-900 p-1.5 text-right uppercase">
                  Total Schedule Net Rebar Weight:
                </td>
                <td className="border border-slate-900 p-1.5 text-right font-black">
                  {abstract.totalNetWeightKg.toLocaleString()} kg
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Steel Abstract Summary Block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border border-slate-900 p-3">
            <h4 className="font-bold text-xs uppercase mb-2 border-b border-slate-400 pb-1">
              Diameter-Wise Procurement Abstract
            </h4>
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-slate-400 text-slate-600 text-left">
                  <th>Dia</th>
                  <th className="text-right">Unit (kg/m)</th>
                  <th className="text-right">Length (m)</th>
                  <th className="text-right">Net Wt (kg)</th>
                  <th className="text-right">Gross Wt (kg)</th>
                  <th className="text-right font-bold">12m Rebars</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {abstract.items.map((it) => (
                  <tr key={it.diameter}>
                    <td className="font-bold">T{it.diameter}</td>
                    <td className="text-right">{it.unitWeight.toFixed(3)}</td>
                    <td className="text-right">{it.totalLengthMeters.toFixed(1)}</td>
                    <td className="text-right">{it.netWeightKg.toLocaleString()}</td>
                    <td className="text-right">{it.grossWeightKg.toLocaleString()}</td>
                    <td className="text-right font-bold">{it.stockBars12mNeeded}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-900 font-bold">
                <tr>
                  <td>TOTAL</td>
                  <td>-</td>
                  <td className="text-right">
                    {abstract.items.reduce((s, i) => s + i.totalLengthMeters, 0).toFixed(1)}m
                  </td>
                  <td className="text-right">{abstract.totalNetWeightKg.toLocaleString()}</td>
                  <td className="text-right">{abstract.totalGrossWeightKg.toLocaleString()}</td>
                  <td className="text-right">{abstract.totalStock12mBars} nos</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="border border-slate-900 p-3 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-xs uppercase mb-2 border-b border-slate-400 pb-1">
                Steel Procurement & Site Consumption Summary
              </h4>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span>Theoretical Net Weight:</span>
                  <strong>{abstract.totalNetWeightKg.toLocaleString()} kg ({(abstract.totalNetWeightKg / 1000).toFixed(3)} MT)</strong>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Site Wastage Allowance ({project.metadata.wastagePercent}%):</span>
                  <span>+{(abstract.totalGrossWeightKg - abstract.totalNetWeightKg).toFixed(1)} kg</span>
                </div>
                <div className="flex justify-between font-bold border-t border-slate-300 pt-1">
                  <span>Gross Steel Requirement:</span>
                  <span>{abstract.totalGrossWeightKg.toLocaleString()} kg ({(abstract.totalGrossWeightKg / 1000).toFixed(3)} MT)</span>
                </div>
                <div className="flex justify-between text-slate-700 pt-1">
                  <span>Commercial 12.0m Mill Rebars:</span>
                  <strong>{abstract.totalStock12mBars} stock bars</strong>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Estimated Binding Wire (@ {project.metadata.bindingWireRateKgPerMT} kg/MT):</span>
                  <strong>{bindingWireKg.toFixed(1)} kg (18-gauge annealed wire)</strong>
                </div>
              </div>
            </div>

            <div className="text-[9px] text-slate-500 dark:text-slate-500 italic mt-3">
              * Note: Commercial bars are supplied in 12.000m lengths. Cutting optimization should follow the Bar Bending Schedule to restrict unrecoverable scrap below {project.metadata.wastagePercent}%.
            </div>
          </div>
        </div>

        {/* Approval Sign-off Box */}
        <div className="border-2 border-slate-900 grid grid-cols-4 text-center divide-x-2 divide-slate-900">
          <div className="p-3">
            <span className="text-[10px] uppercase font-bold text-slate-600 block">Detailed By (Draftsman)</span>
            <div className="h-12 flex items-end justify-center font-mono text-[10px] text-slate-500 dark:text-slate-500">
              Signature & Date
            </div>
            <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
              BBS Engineer
            </div>
          </div>

          <div className="p-3">
            <span className="text-[10px] uppercase font-bold text-slate-600 block">Checked By</span>
            <div className="h-12 flex items-end justify-center font-mono text-[10px] text-slate-500 dark:text-slate-500">
              Signature & Date
            </div>
            <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
              {project.metadata.checkedBy}
            </div>
          </div>

          <div className="p-3">
            <span className="text-[10px] uppercase font-bold text-slate-600 block">Approved By (Structural Engineer)</span>
            <div className="h-12 flex items-end justify-center font-mono text-[10px] text-slate-500 dark:text-slate-500">
              Signature & Date
            </div>
            <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
              {project.metadata.structuralEngineer}
            </div>
          </div>

          <div className="p-3">
            <span className="text-[10px] uppercase font-bold text-slate-600 block">Contractor Acceptance</span>
            <div className="h-12 flex items-end justify-center font-mono text-[10px] text-slate-500 dark:text-slate-500">
              Site Agent Stamp
            </div>
            <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
              {project.metadata.contractorName}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
