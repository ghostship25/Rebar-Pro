import React, { useState } from 'react';
import { BarItem, ShapeCode, RebarDiameter, STANDARD_DIAMETERS } from '../types/bbs';
import { SHAPE_LIBRARY } from '../utils/shapes';
import { RebarCanvas } from './RebarCanvas';
import { X, BookOpen } from 'lucide-react';

interface ShapeInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBar?: BarItem | null;
}

export const ShapeInspectorModal: React.FC<ShapeInspectorModalProps> = ({
  isOpen,
  onClose,
  initialBar,
}) => {
  if (!isOpen) return null;

  const [selectedShape, setSelectedShape] = useState<ShapeCode>(initialBar?.shapeCode || '51');
  const [selectedDia, setSelectedDia] = useState<RebarDiameter>(initialBar?.diameter || 16);

  const [dimA, setDimA] = useState<number>(initialBar?.dimA ?? 0.300);
  const [dimB, setDimB] = useState<number>(initialBar?.dimB ?? 0.450);
  const [dimC, setDimC] = useState<number>(initialBar?.dimC ?? 0.200);
  const [dimD, setDimD] = useState<number>(initialBar?.dimD ?? 0.150);
  const [dimE, setDimE] = useState<number>(initialBar?.dimE ?? 0.250);

  const currentDef = SHAPE_LIBRARY[selectedShape];

  const handleSelectShape = (code: ShapeCode) => {
    setSelectedShape(code);
    const def = SHAPE_LIBRARY[code];
    if (def.defaultDimensions) {
      if (def.defaultDimensions.A !== undefined) setDimA(def.defaultDimensions.A);
      if (def.defaultDimensions.B !== undefined) setDimB(def.defaultDimensions.B);
      if (def.defaultDimensions.C !== undefined) setDimC(def.defaultDimensions.C);
      if (def.defaultDimensions.D !== undefined) setDimD(def.defaultDimensions.D);
      if (def.defaultDimensions.E !== undefined) setDimE(def.defaultDimensions.E);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Shape Library & Technical Detailing Inspector
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Standard Bar Shapes (IS 2502:1963 / BS 8666:2020 / SP 34)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200 rounded-lg hover:bg-slate-200 hover:dark:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Shape code selector grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-11 gap-1.5">
            {(Object.keys(SHAPE_LIBRARY) as ShapeCode[]).map((code) => {
              const s = SHAPE_LIBRARY[code];
              const isSelected = selectedShape === code;
              return (
                <button
                  key={code}
                  onClick={() => handleSelectShape(code)}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    isSelected
                      ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200 hover:border-slate-300 hover:dark:border-slate-700'
                  }`}
                >
                  <div className="font-mono font-bold text-sm">#{s.code}</div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-400">{s.isCode}</div>
                </button>
              );
            })}
          </div>

          {/* Interactive Inspection Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* SVG Visualizer */}
            <div className="space-y-2">
              <RebarCanvas
                shapeCode={selectedShape}
                dimA={dimA}
                dimB={dimB}
                dimC={dimC}
                dimD={dimD}
                dimE={dimE}
                diameter={selectedDia}
                customSegments={initialBar?.customSegments}
              />
            </div>

            {/* Inputs & Standard Documentation */}
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Shape #{currentDef.code}: {currentDef.name}
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Φ:</span>
                    <select
                      value={selectedDia}
                      onChange={(e) => setSelectedDia(Number(e.target.value) as RebarDiameter)}
                      className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 text-xs text-slate-800 dark:text-slate-200 font-mono"
                    >
                      {STANDARD_DIAMETERS.map((d) => (
                        <option key={d} value={d}>T{d} mm</option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">{currentDef.description}</p>

                <div className="text-xs font-mono bg-slate-100 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 text-cyan-300">
                  <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase">Standard Cutting Formula:</span>
                  L = {currentDef.formulaDisplay}
                </div>

                {/* Dimensions inputs for testing */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {currentDef.dimensionsRequired.map((dKey) => {
                    let val = 0;
                    let setVal = (n: number) => {};
                    if (dKey === 'A') { val = dimA; setVal = setDimA; }
                    if (dKey === 'B') { val = dimB; setVal = setDimB; }
                    if (dKey === 'C') { val = dimC; setVal = setDimC; }
                    if (dKey === 'D') { val = dimD; setVal = setDimD; }
                    if (dKey === 'E') { val = dimE; setVal = setDimE; }

                    return (
                      <div key={dKey}>
                        <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-0.5">
                          {currentDef.dimensionLabels[dKey] || `Dimension ${dKey} (m)`}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={val}
                          onChange={(e) => setVal(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-800 dark:text-slate-200 text-right focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Standard Engineering Bend Deductions Table */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Standard Bend Deductions (IS 2502 & BS 8666)
                </span>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                  <div>45° Bend: <span className="text-cyan-400">1d</span> ({(0.001 * selectedDia * 1).toFixed(3)}m)</div>
                  <div>90° Standard Bend: <span className="text-cyan-400">2d</span> ({(0.001 * selectedDia * 2).toFixed(3)}m)</div>
                  <div>135° Seismic Hook: <span className="text-cyan-400">3d</span> ({(0.001 * selectedDia * 3).toFixed(3)}m)</div>
                  <div>180° Semi-Hook: <span className="text-cyan-400">4d</span> ({(0.001 * selectedDia * 4).toFixed(3)}m)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
