import React, { useState } from 'react';
import { CustomShapeDefinition, CustomSegment, CustomHook, RebarDiameter, STANDARD_DIAMETERS } from '../types/bbs';
import { CustomShapeDesigner } from './CustomShapeDesigner';
import { RebarCanvas } from './RebarCanvas';
import { X, Save, Plus, Trash2, Copy, Sparkles, Check, Bookmark } from 'lucide-react';

interface CustomShapeModalProps {
  isOpen: boolean;
  onClose: () => void;
  customShapes: CustomShapeDefinition[];
  onSaveShape: (shape: CustomShapeDefinition) => void;
  onDeleteShape: (shapeId: string) => void;
  onSelectForNewBar?: (shape: CustomShapeDefinition) => void;
}

export const CustomShapeModal: React.FC<CustomShapeModalProps> = ({
  isOpen,
  onClose,
  customShapes,
  onSaveShape,
  onDeleteShape,
  onSelectForNewBar,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'create' | 'library'>(customShapes.length > 0 ? 'create' : 'create');

  // Form states for creating/editing a custom shape
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('Counterfort Diagonal Rebar');
  const [description, setDescription] = useState('Diagonal anchor tie with 135° seismic hooks for high-shear zone');
  const [testDiameter, setTestDiameter] = useState<RebarDiameter>(16);

  const [startHook, setStartHook] = useState<CustomHook>({
    type: 'hook-135',
    direction: 'up',
  });

  const [endHook, setEndHook] = useState<CustomHook>({
    type: 'hook-135',
    direction: 'up',
  });

  const [segments, setSegments] = useState<CustomSegment[]>([
    { id: 'seg-1', label: 'A', length: 1.200, angle: 0, direction: 'straight' },
    { id: 'seg-2', label: 'B', length: 0.650, angle: 45, direction: 'crank-up' },
    { id: 'seg-3', label: 'C', length: 0.800, angle: 45, direction: 'straight' },
  ]);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName(`Custom Rebar Shape ${customShapes.length + 1}`);
    setDescription('Parametric custom bar with user-defined bend angles and hook extensions');
    setStartHook({ type: 'none', direction: 'up' });
    setEndHook({ type: 'none', direction: 'up' });
    setSegments([
      { id: 'seg-1', label: 'A', length: 1.000, angle: 0, direction: 'straight' },
      { id: 'seg-2', label: 'B', length: 0.450, angle: 90, direction: 'up' },
    ]);
  };

  const handleEditExisting = (shape: CustomShapeDefinition) => {
    setEditingId(shape.id);
    setName(shape.name);
    setDescription(shape.description || '');
    setStartHook({ ...shape.startHook });
    setEndHook({ ...shape.endHook });
    setSegments([...shape.segments]);
    setActiveTab('create');
  };

  const handleDuplicate = (shape: CustomShapeDefinition) => {
    setEditingId(null);
    setName(`${shape.name} (Copy)`);
    setDescription(shape.description || '');
    setStartHook({ ...shape.startHook });
    setEndHook({ ...shape.endHook });
    setSegments(shape.segments.map((s) => ({ ...s, id: `seg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` })));
    setActiveTab('create');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newShape: CustomShapeDefinition = {
      id: editingId || `CS-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      description: description.trim(),
      startHook,
      endHook,
      segments,
      createdAt: new Date().toISOString(),
    };

    onSaveShape(newShape);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-6 max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Custom Bar Shape Studio & CAD Engine
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                  IS 2502 / BS 8666 Compliant
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Design intricate rebar shapes with arbitrary bend angles (0°–180°), direction runs, seismic hooks, and automatic cutting deductions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  activeTab === 'create'
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200'
                }`}
              >
                {editingId ? 'Edit Shape' : 'Shape Designer'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'library'
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                Custom Library ({customShapes.length})
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200 hover:bg-slate-200 hover:dark:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'create' ? (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Shape Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Custom Shape Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Counterfort Diagonal Splay Tie, Beam Cranked Bar..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Test Rebar Diameter
                  </label>
                  <select
                    value={testDiameter}
                    onChange={(e) => setTestDiameter(Number(e.target.value) as RebarDiameter)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    {STANDARD_DIAMETERS.map((dia) => (
                      <option key={dia} value={dia}>
                        Ø{dia} mm (d = {dia}mm)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Engineering Notes / Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Used for negative shear reinforcement at wall-slab junction"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Visual Live CAD Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    Live 2D CAD Preview & Dimension Trace
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                    Nominal d = {testDiameter} mm · Units: Meters (m)
                  </span>
                </div>
                <RebarCanvas
                  shapeCode="99"
                  dimA={segments[0]?.length || 1.0}
                  diameter={testDiameter}
                  customSegments={segments}
                  startHook={startHook}
                  endHook={endHook}
                  customShapeName={name}
                  className="w-full h-72"
                />
              </div>

              {/* Custom Segment & Hook Designer */}
              <CustomShapeDesigner
                segments={segments}
                onChange={setSegments}
                diameter={testDiameter}
                startHook={startHook}
                onStartHookChange={setStartHook}
                endHook={endHook}
                onEndHookChange={setEndHook}
              />

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200 transition-colors cursor-pointer"
                >
                  Reset / Clear
                </button>

                <div className="flex items-center gap-3">
                  {onSelectForNewBar && (
                    <button
                      type="button"
                      onClick={() => {
                        const newShape: CustomShapeDefinition = {
                          id: editingId || `CS-${Date.now()}`,
                          name: name.trim() || 'Custom Bar Shape',
                          description: description.trim(),
                          startHook,
                          endHook,
                          segments,
                        };
                        onSaveShape(newShape);
                        onSelectForNewBar(newShape);
                        onClose();
                      }}
                      className="px-4 py-2 text-xs font-medium text-cyan-400 bg-cyan-950/60 border border-cyan-800 rounded-lg hover:bg-cyan-900/60 transition-colors cursor-pointer"
                    >
                      Use in Current Bar & Close
                    </button>
                  )}

                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold rounded-lg shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                  >
                    {savedSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-950 font-bold" />
                        <span>Saved to Library!</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{editingId ? 'Update Custom Shape' : 'Save Shape to Library'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Custom Library Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Saved Custom Shapes ({customShapes.length})
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Custom rebar profiles available throughout this project
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveTab('create');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create New Shape
                </button>
              </div>

              {customShapes.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                  <Sparkles className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">No custom shapes saved yet</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    Design complex shapes with custom bend angles and hooks in the Shape Designer tab
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className="mt-4 px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg cursor-pointer"
                  >
                    Design First Shape
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customShapes.map((shape) => {
                    const totalStraight = shape.segments.reduce((acc, s) => acc + (s.length || 0), 0);
                    return (
                      <div
                        key={shape.id}
                        className="flex flex-col bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-slate-300 hover:dark:border-slate-700 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              {shape.name}
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-cyan-400">
                                {shape.segments.length} Segments
                              </span>
                            </h4>
                            {shape.description && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1">
                                {shape.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicate(shape)}
                              className="p-1 rounded text-slate-600 dark:text-slate-400 hover:text-cyan-400 hover:bg-slate-200 hover:dark:bg-slate-800 cursor-pointer"
                              title="Duplicate shape"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete custom shape "${shape.name}"? Bars already using this shape keep their geometry, but it will be removed from this library.`)) {
                                  onDeleteShape(shape.id);
                                }
                              }}
                              className="p-1 rounded text-slate-600 dark:text-slate-400 hover:text-rose-400 hover:bg-slate-200 hover:dark:bg-slate-800 cursor-pointer"
                              title="Delete shape"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Mini visual */}
                        <div className="h-36 my-2 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800/80">
                          <RebarCanvas
                            shapeCode="99"
                            dimA={shape.segments[0]?.length || 1.0}
                            diameter={16}
                            customSegments={shape.segments}
                            startHook={shape.startHook}
                            endHook={shape.endHook}
                            customShapeName={shape.name}
                            className="w-full h-full p-2"
                          />
                        </div>

                        {/* Details & Actions */}
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-800/60 mt-auto">
                          <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                            Total Straight: {totalStraight.toFixed(3)}m
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditExisting(shape)}
                              className="px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 hover:dark:text-white bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 hover:dark:bg-slate-700 rounded cursor-pointer"
                            >
                              Edit
                            </button>
                            {onSelectForNewBar && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectForNewBar(shape);
                                  onClose();
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded cursor-pointer"
                              >
                                Select & Add Bar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
