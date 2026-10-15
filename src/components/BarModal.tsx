import React, { useState, useEffect } from 'react';
import {
  BarItem,
  ShapeCode,
  RebarDiameter,
  STANDARD_DIAMETERS,
  StructuralMemberType,
  CustomSegment,
  CustomShapeDefinition,
  CustomHook,
  StructureNode,
} from '../types/bbs';
import { SHAPE_LIBRARY, calculateBarCuttingLength } from '../utils/shapes';
import { getUnitWeight } from '../utils/engineering';
import { RebarCanvas } from './RebarCanvas';
import { CustomShapeDesigner } from './CustomShapeDesigner';
import { MiniRebarSvg } from './MiniRebarSvg';
import { X, Check, Sparkles, Plus, Layers, Network } from 'lucide-react';

interface BarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bar: BarItem) => void;
  initialBar?: BarItem | null;
  structures?: StructureNode[];
  initialContext?: {
    structureName?: string;
    subComponent?: string;
    component?: string;
    gridOrSection?: string;
    member?: StructuralMemberType;
  };
  customShapes?: CustomShapeDefinition[];
  onOpenCustomShapeStudio?: () => void;
  existingSections?: string[];
}

const MEMBERS: StructuralMemberType[] = [
  'Beam',
  'Column',
  'Slab',
  'Footing',
  'Retaining Wall',
  'Culvert',
  'Staircase',
  'Miscellaneous',
];

const COMMON_COMPONENTS = [
  'Beam',
  'Column',
  'Abutment',
  'Wingwall',
  'Apron',
  'Curtain Wall',
  'Slab',
  'Bottom Raft',
  'Top Deck Slab',
  'Drain Bed / Invert',
  'Drain Side Wall',
  'Footing / Pad',
  'Pedestal',
  'Dowel Bar System',
  'Tie Bar System',
  'Crash Barrier / Kerb',
];

export const BarModal: React.FC<BarModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialBar,
  structures = [],
  initialContext,
  customShapes = [],
  onOpenCustomShapeStudio,
  existingSections = [],
}) => {
  if (!isOpen) return null;

  const [barMark, setBarMark] = useState(initialBar?.barMark || 'B-01');
  const [structureName, setStructureName] = useState(
    initialBar?.structureName || initialContext?.structureName || (structures[0]?.name ?? '')
  );
  const [subComponent, setSubComponent] = useState(
    initialBar?.subComponent || initialContext?.subComponent || initialBar?.floorOrSection || 'Section 1'
  );
  const [component, setComponent] = useState(
    initialBar?.component || initialContext?.component || 'Beam'
  );
  const [gridOrSection, setGridOrSection] = useState(
    initialBar?.gridOrSection || initialContext?.gridOrSection || 'General'
  );
  const [member, setMember] = useState<StructuralMemberType>(
    initialBar?.member || initialContext?.member || 'Beam'
  );
  const [floorOrSection, setFloorOrSection] = useState(
    initialBar?.floorOrSection || initialContext?.subComponent || 'Section 1'
  );
  const [description, setDescription] = useState(initialBar?.description || 'Main Tension Reinforcement');
  const [diameter, setDiameter] = useState<RebarDiameter>(initialBar?.diameter || 16);
  const [numElements, setNumElements] = useState<number>(initialBar?.numElements ?? 1);
  const [numBarsPerElement, setNumBarsPerElement] = useState<number>(initialBar?.numBarsPerElement ?? 4);
  const [shapeCode, setShapeCode] = useState<ShapeCode>(initialBar?.shapeCode || '51');
  const [customShapeId, setCustomShapeId] = useState<string | undefined>(initialBar?.customShapeId);

  // Auto-sync member when component changes
  const handleComponentChange = (compVal: string) => {
    setComponent(compVal);
    const low = compVal.toLowerCase();
    if (low.includes('beam')) setMember('Beam');
    else if (low.includes('column') || low.includes('pier') || low.includes('pedestal')) setMember('Column');
    else if (low.includes('slab') || low.includes('deck') || low.includes('apron') || low.includes('invert') || low.includes('bed')) setMember('Slab');
    else if (low.includes('footing') || low.includes('raft') || low.includes('curtain')) setMember('Footing');
    else if (low.includes('wall') || low.includes('abutment') || low.includes('wingwall')) setMember('Retaining Wall');
    else if (low.includes('stair')) setMember('Staircase');
    else if (low.includes('culvert')) setMember('Culvert');
  };

  // Dimensions
  const [dimA, setDimA] = useState<number>(initialBar?.dimA ?? 0.250);
  const [dimB, setDimB] = useState<number>(initialBar?.dimB ?? 0.400);
  const [dimC, setDimC] = useState<number>(initialBar?.dimC ?? 0);
  const [dimD, setDimD] = useState<number>(initialBar?.dimD ?? 0);
  const [dimE, setDimE] = useState<number>(initialBar?.dimE ?? 0);
  const [dimF, setDimF] = useState<number>(initialBar?.dimF ?? 0);

  const [startHook, setStartHook] = useState<CustomHook>(
    initialBar?.startHook || { type: 'none', direction: 'up' }
  );
  const [endHook, setEndHook] = useState<CustomHook>(
    initialBar?.endHook || { type: 'none', direction: 'up' }
  );

  const [customSegments, setCustomSegments] = useState<CustomSegment[]>(
    initialBar?.customSegments || [
      { id: '1', label: 'A', length: 1.200, angle: 0, direction: 'straight' },
      { id: '2', label: 'B', length: 0.350, angle: 90, direction: 'up' },
    ]
  );
  const [remarks, setRemarks] = useState(initialBar?.remarks || '');

  // Calculate live cutting length and formula
  const calc = calculateBarCuttingLength(
    shapeCode,
    dimA,
    dimB,
    dimC,
    dimD,
    dimE,
    dimF,
    diameter,
    customSegments,
    startHook,
    endHook
  );

  const unitWeight = getUnitWeight(diameter);
  const totalBars = Math.max(0, numElements * numBarsPerElement);
  const totalLength = Number((totalBars * calc.cuttingLength).toFixed(3));
  const totalWeight = Number((totalLength * unitWeight).toFixed(2));

  const handleStandardShapeSelect = (code: ShapeCode) => {
    setShapeCode(code);
    setCustomShapeId(undefined);
    const def = SHAPE_LIBRARY[code];
    if (def?.defaultDimensions) {
      if (def.defaultDimensions.A !== undefined) setDimA(def.defaultDimensions.A);
      if (def.defaultDimensions.B !== undefined) setDimB(def.defaultDimensions.B);
      if (def.defaultDimensions.C !== undefined) setDimC(def.defaultDimensions.C);
      if (def.defaultDimensions.D !== undefined) setDimD(def.defaultDimensions.D);
      if (def.defaultDimensions.E !== undefined) setDimE(def.defaultDimensions.E);
    }
  };

  const handleSelectCustomShape = (cShape: CustomShapeDefinition) => {
    setShapeCode('99');
    setCustomShapeId(cShape.id);
    setCustomSegments(cShape.segments.map((s) => ({ ...s })));
    setStartHook({ ...cShape.startHook });
    setEndHook({ ...cShape.endHook });
    if (cShape.segments[0]) {
      setDimA(cShape.segments[0].length);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newBar: BarItem = {
      id: initialBar?.id || `bar-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      barMark,
      structureName: structureName.trim() || undefined,
      subComponent: subComponent.trim() || undefined,
      component: component.trim() || undefined,
      gridOrSection: gridOrSection.trim() || undefined,
      member,
      floorOrSection: subComponent.trim() || floorOrSection.trim() || undefined,
      description,
      diameter,
      numElements,
      numBarsPerElement,
      totalBars,
      shapeCode,
      customShapeId,
      dimA,
      dimB: SHAPE_LIBRARY[shapeCode]?.dimensionsRequired.includes('B') ? dimB : undefined,
      dimC: SHAPE_LIBRARY[shapeCode]?.dimensionsRequired.includes('C') ? dimC : undefined,
      dimD: SHAPE_LIBRARY[shapeCode]?.dimensionsRequired.includes('D') ? dimD : undefined,
      dimE: SHAPE_LIBRARY[shapeCode]?.dimensionsRequired.includes('E') ? dimE : undefined,
      dimF: SHAPE_LIBRARY[shapeCode]?.dimensionsRequired.includes('F') ? dimF : undefined,
      customSegments: shapeCode === '99' ? customSegments : undefined,
      startHook: shapeCode === '99' ? startHook : undefined,
      endHook: shapeCode === '99' ? endHook : undefined,
      cuttingLength: calc.cuttingLength,
      totalLength,
      unitWeight,
      totalWeight,
      formulaExplanation: calc.formulaExplanation,
      remarks,
    };
    onSave(newBar);
    onClose();
  };

  const currentShapeDef = SHAPE_LIBRARY[shapeCode];

  // Extract known structures, subcomponents, components
  const structureOptions = Array.from(new Set(structures.map((s) => s.name)));
  const currentStructureObj = structures.find((s) => s.name.toLowerCase() === structureName.toLowerCase());
  const subComponentOptions = currentStructureObj?.subComponents?.map((sc) => sc.name) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-6 max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {initialBar ? 'Edit Rebar Detailing Entry' : 'Add New Rebar Bar Mark'}
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                Mark: {barMark}
              </span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">IS 2502:1963 / BS 8666:2020 Bar Bending Schedule Detailing</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200 rounded-lg hover:bg-slate-200 hover:dark:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Civil Engineering Structure & Location Hierarchy Bar */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-cyan-900/40 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <Network className="w-4 h-4 text-cyan-400" />
              <span>Project Structure & Component Hierarchy</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Structure */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Structure</label>
                <input
                  type="text"
                  list="structureSuggestions"
                  value={structureName}
                  onChange={(e) => setStructureName(e.target.value)}
                  placeholder="e.g. RCC Box Culvert, Drain"
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                />
                <datalist id="structureSuggestions">
                  {structureOptions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                  <option value="RCC Stormwater Drain" />
                  <option value="RCC Box Culvert (2-Cell)" />
                  <option value="Residential Building Tower" />
                  <option value="Concrete Pavement Section" />
                  <option value="Highway Bridge Abutment" />
                  <option value="Cantilever Retaining Wall" />
                </datalist>
              </div>

              {/* Sub-component / Section */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Sub-Component / Section</label>
                <input
                  type="text"
                  list="subCompSuggestions"
                  value={subComponent}
                  onChange={(e) => {
                    setSubComponent(e.target.value);
                    setFloorOrSection(e.target.value);
                  }}
                  placeholder="e.g. Barrel Section, Inlet Apron"
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                />
                <datalist id="subCompSuggestions">
                  {subComponentOptions.map((sc) => (
                    <option key={sc} value={sc} />
                  ))}
                  {existingSections.map((sec) => (
                    <option key={sec} value={sec} />
                  ))}
                  <option value="Barrel Section" />
                  <option value="Inlet Apron & Wingwalls" />
                  <option value="Outlet Apron & Wingwalls" />
                  <option value="Ground Floor" />
                  <option value="Foundation Level" />
                  <option value="Chainage 0+000 - 0+150" />
                </datalist>
              </div>

              {/* Component */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Component</label>
                <input
                  type="text"
                  list="componentSuggestions"
                  value={component}
                  onChange={(e) => handleComponentChange(e.target.value)}
                  placeholder="e.g. Abutment, Wingwall, Apron"
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                />
                <datalist id="componentSuggestions">
                  {COMMON_COMPONENTS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              {/* Grid / Section Detail */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Grid / Sub-section</label>
                <input
                  type="text"
                  value={gridOrSection}
                  onChange={(e) => setGridOrSection(e.target.value)}
                  placeholder="e.g. Outer Face, Grid 1-2, Bottom Layer"
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Identification Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Bar Mark / Ref *</label>
              <input
                type="text"
                required
                value={barMark}
                onChange={(e) => setBarMark(e.target.value)}
                placeholder="e.g. B1-01, C-M01"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Structural Member Type</label>
              <select
                value={member}
                onChange={(e) => setMember(e.target.value as StructuralMemberType)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {MEMBERS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Diameter Φ (mm)</label>
              <select
                value={diameter}
                onChange={(e) => setDiameter(Number(e.target.value) as RebarDiameter)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 font-mono font-semibold"
              >
                {STANDARD_DIAMETERS.map((d) => (
                  <option key={d} value={d}>T{d} mm ({getUnitWeight(d).toFixed(3)} kg/m)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Location / Tag</label>
              <input
                type="text"
                value={floorOrSection}
                onChange={(e) => setFloorOrSection(e.target.value)}
                placeholder="e.g. Bottom Layer / Outer Face"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Bar Description / Structural Function</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Main tension reinforcement / vertical stem face steel"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Quantities Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-200 dark:border-slate-800/80">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">No. of Structural Elements</label>
              <input
                type="number"
                min="1"
                required
                value={numElements}
                onChange={(e) => setNumElements(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 text-right"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Bars per Element</label>
              <input
                type="number"
                min="1"
                required
                value={numBarsPerElement}
                onChange={(e) => setNumBarsPerElement(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 text-right"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Total Quantity of Bars</label>
              <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded text-sm font-mono text-cyan-400 font-bold text-right">
                {totalBars} bars
              </div>
            </div>
          </div>

          {/* Shape Selection Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Select Rebar Shape (Standard BS 8666 / IS 2502 & Custom Library):
              </label>
              {onOpenCustomShapeStudio && (
                <button
                  type="button"
                  onClick={onOpenCustomShapeStudio}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Custom Shape Studio
                </button>
              )}
            </div>

            {/* Shape selection pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {Object.values(SHAPE_LIBRARY).map((def) => {
                const isSelected = shapeCode === def.code && !customShapeId;
                return (
                  <button
                    key={def.code}
                    type="button"
                    onClick={() => handleStandardShapeSelect(def.code)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/80 border-cyan-500 ring-1 ring-cyan-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:dark:border-slate-700'
                    }`}
                  >
                    <MiniRebarSvg shapeCode={def.code} className="w-14 h-7 mb-1" />
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                      Shape {def.code}
                    </span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate w-full px-1">
                      {def.isCode}
                    </span>
                  </button>
                );
              })}

              {/* Custom shapes saved by user */}
              {customShapes.map((cShape) => {
                const isSelected = shapeCode === '99' && customShapeId === cShape.id;
                return (
                  <button
                    key={cShape.id}
                    type="button"
                    onClick={() => handleSelectCustomShape(cShape)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/80 border-indigo-400 ring-1 ring-indigo-400 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-indigo-800'
                    }`}
                  >
                    <div className="w-14 h-7 mb-1 flex items-center justify-center bg-indigo-950/30 rounded border border-indigo-900/60 text-indigo-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-300 truncate w-full">
                      {cShape.name}
                    </span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400">Custom Shape</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Rebar Canvas Preview */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Geometric Detailing & Bend Deduction Live Trace
            </label>
            <RebarCanvas
              shapeCode={shapeCode}
              dimA={dimA}
              dimB={dimB}
              dimC={dimC}
              dimD={dimD}
              dimE={dimE}
              dimF={dimF}
              diameter={diameter}
              customSegments={shapeCode === '99' ? customSegments : undefined}
              startHook={shapeCode === '99' ? startHook : undefined}
              endHook={shapeCode === '99' ? endHook : undefined}
              className="w-full h-64"
            />
          </div>

          {/* Dynamic Dimension Inputs */}
          {shapeCode !== '99' ? (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                Shape Dimensions (Meters):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {currentShapeDef?.dimensionsRequired.includes('A') && (
                  <div>
                    <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                      {currentShapeDef.dimensionLabels['A'] || 'Dim A (m)'}
                    </label>
                    <input
                      type="number"
                      step="0.005"
                      min="0.05"
                      required
                      value={dimA}
                      onChange={(e) => setDimA(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-sm font-mono text-slate-800 dark:text-slate-200 text-right focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}
                {currentShapeDef?.dimensionsRequired.includes('B') && (
                  <div>
                    <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                      {currentShapeDef.dimensionLabels['B'] || 'Dim B (m)'}
                    </label>
                    <input
                      type="number"
                      step="0.005"
                      min="0"
                      value={dimB}
                      onChange={(e) => setDimB(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-sm font-mono text-slate-800 dark:text-slate-200 text-right focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}
                {currentShapeDef?.dimensionsRequired.includes('C') && (
                  <div>
                    <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                      {currentShapeDef.dimensionLabels['C'] || 'Dim C (m)'}
                    </label>
                    <input
                      type="number"
                      step="0.005"
                      min="0"
                      value={dimC}
                      onChange={(e) => setDimC(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-sm font-mono text-slate-800 dark:text-slate-200 text-right focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}
                {currentShapeDef?.dimensionsRequired.includes('D') && (
                  <div>
                    <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                      {currentShapeDef.dimensionLabels['D'] || 'Dim D (m)'}
                    </label>
                    <input
                      type="number"
                      step="0.005"
                      min="0"
                      value={dimD}
                      onChange={(e) => setDimD(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-sm font-mono text-slate-800 dark:text-slate-200 text-right focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}
                {currentShapeDef?.dimensionsRequired.includes('E') && (
                  <div>
                    <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                      {currentShapeDef.dimensionLabels['E'] || 'Dim E (m)'}
                    </label>
                    <input
                      type="number"
                      step="0.005"
                      min="0"
                      value={dimE}
                      onChange={(e) => setDimE(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-sm font-mono text-slate-800 dark:text-slate-200 text-right focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Custom Shape Designer for Shape 99 */
            <CustomShapeDesigner
              segments={customSegments}
              onChange={setCustomSegments}
              diameter={diameter}
              startHook={startHook}
              onStartHookChange={setStartHook}
              endHook={endHook}
              onEndHookChange={setEndHook}
            />
          )}

          {/* Remarks */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Site / BBS Remarks</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Staggered lap splice at midspan"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Summary Metric Footer */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-cyan-900/40 text-xs font-mono">
            <div>
              <span className="text-slate-600 dark:text-slate-400 block text-[10px]">CUTTING LENGTH</span>
              <span className="text-cyan-400 font-bold text-sm">{calc.cuttingLength.toFixed(3)} m</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400 block text-[10px]">TOTAL RUN LENGTH</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold text-sm">{totalLength.toFixed(3)} m</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400 block text-[10px]">UNIT WEIGHT</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold text-sm">{unitWeight.toFixed(3)} kg/m</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400 block text-[10px]">TOTAL STEEL WEIGHT</span>
              <span className="text-emerald-400 font-bold text-sm">{totalWeight.toFixed(2)} kg</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 font-extrabold" />
              <span>{initialBar ? 'Update Bar Schedule' : 'Add to Schedule'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
