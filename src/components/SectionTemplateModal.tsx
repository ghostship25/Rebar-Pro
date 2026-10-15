import React, { useState, useMemo } from 'react';
import { SectionTemplate, BarItem, ProjectData, StructuralMemberType, STANDARD_DIAMETERS, RebarDiameter, ShapeCode } from '../types/bbs';
import { DEFAULT_SECTION_TEMPLATES, instantiateSectionTemplate } from '../utils/parametric';
import { MiniRebarSvg } from './MiniRebarSvg';
import { Layers, Wand2, Plus, Bookmark, Check, Trash2, ArrowRight, Save, Sliders, Calculator, Eye } from 'lucide-react';

interface SectionTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData;
  templates: SectionTemplate[];
  onSaveTemplate: (template: SectionTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onAppendBars: (newBars: BarItem[]) => void;
  onReplaceBars: (newBars: BarItem[]) => void;
}

export const SectionTemplateModal: React.FC<SectionTemplateModalProps> = ({
  isOpen,
  onClose,
  project,
  templates,
  onSaveTemplate,
  onDeleteTemplate,
  onAppendBars,
  onReplaceBars,
}) => {
  if (!isOpen) return null;

  const allTemplates = useMemo(() => {
    const existingIds = new Set(templates.map((t) => t.id));
    const combined = [...templates];
    DEFAULT_SECTION_TEMPLATES.forEach((dt) => {
      if (!existingIds.has(dt.id)) {
        combined.push(dt);
      }
    });
    return combined;
  }, [templates]);

  const [activeTab, setActiveTab] = useState<'recreate' | 'save_from_bbs' | 'manage'>('recreate');

  // Recreate mode state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(allTemplates[0]?.id || 'tmpl-beam-standard');
  const activeTemplate = allTemplates.find((t) => t.id === selectedTemplateId) || allTemplates[0];

  const [sectionName, setSectionName] = useState('2nd Floor - Beam B201');
  const [primaryValue, setPrimaryValue] = useState<number>(activeTemplate?.primaryParamDefault || 5.0);
  const [secondaryValue, setSecondaryValue] = useState<number>(activeTemplate?.secondaryParamDefault || 0.30);
  const [depthValue, setDepthValue] = useState<number>(activeTemplate?.depthParamDefault || 0.50);
  const [coverValue, setCoverValue] = useState<number>(activeTemplate?.coverParamDefault || 0.025);
  const [numRepetitions, setNumRepetitions] = useState<number>(1);
  const [appendSuccess, setAppendSuccess] = useState(false);

  // Sync inputs when template changes
  const handleTemplateSelect = (tmpl: SectionTemplate) => {
    setSelectedTemplateId(tmpl.id);
    setPrimaryValue(tmpl.primaryParamDefault);
    if (tmpl.secondaryParamDefault !== undefined) setSecondaryValue(tmpl.secondaryParamDefault);
    if (tmpl.depthParamDefault !== undefined) setDepthValue(tmpl.depthParamDefault);
    if (tmpl.coverParamDefault !== undefined) setCoverValue(tmpl.coverParamDefault);
    // Suggest an intuitive section name based on category
    setSectionName(`Typical ${tmpl.category} - Sec 01`);
  };

  // Compute live preview of bars from selected template and parameters
  const previewBars = useMemo(() => {
    if (!activeTemplate) return [];
    return instantiateSectionTemplate(activeTemplate, {
      primaryValue,
      secondaryValue,
      depthValue,
      coverValue,
      numRepetitions,
      sectionName: sectionName || 'Section',
    });
  }, [activeTemplate, primaryValue, secondaryValue, depthValue, coverValue, numRepetitions, sectionName]);

  const totalPreviewWeight = useMemo(() => {
    return previewBars.reduce((sum, b) => sum + b.totalWeight, 0);
  }, [previewBars]);

  // Save from BBS mode state
  const existingFloorsAndSections = useMemo(() => {
    const set = new Set<string>();
    project.bars.forEach((b) => {
      if (b.floorOrSection && b.floorOrSection.trim()) {
        set.add(b.floorOrSection.trim());
      }
    });
    return Array.from(set);
  }, [project.bars]);

  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>(existingFloorsAndSections[0] || 'all');
  const [newTemplateName, setNewTemplateName] = useState('Standard Section Template');
  const [newTemplateCategory, setNewTemplateCategory] = useState<StructuralMemberType>('Beam');
  const [newTemplateDesc, setNewTemplateDesc] = useState('Parametric template saved from current schedule');
  const [newTemplatePrimaryName, setNewTemplatePrimaryName] = useState('Span Length L (m)');
  const [newTemplatePrimaryDefault, setNewTemplatePrimaryDefault] = useState<number>(5.0);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const barsToTemplate = useMemo(() => {
    if (selectedSectionFilter === 'all') {
      return project.bars;
    }
    return project.bars.filter((b) => b.floorOrSection?.trim() === selectedSectionFilter);
  }, [project.bars, selectedSectionFilter]);

  const handleCreateTemplateFromBbs = (e: React.FormEvent) => {
    e.preventDefault();
    if (barsToTemplate.length === 0) return;

    // Convert concrete bar items into parametric rules
    const rules = barsToTemplate.map((b, idx) => {
      const L0 = newTemplatePrimaryDefault || 5.0;
      let dimAFormula = b.dimA.toFixed(3);
      // If dimA is close to L0, parametrize it as L
      if (Math.abs(b.dimA - L0) < 0.05) {
        dimAFormula = 'L';
      } else if (b.dimA > L0 && Math.abs(b.dimA - (L0 + 0.6)) < 0.2) {
        dimAFormula = `L + ${(b.dimA - L0).toFixed(2)}`;
      } else if (b.dimA < L0 && Math.abs(b.dimA - 0.7 * L0) < 0.2) {
        dimAFormula = '0.70 * L';
      }

      return {
        id: `rule-${Date.now()}-${idx}`,
        barMarkSuffix: b.barMark.split('-').slice(-1)[0] || `BM-${idx + 1}`,
        description: b.description,
        member: b.member,
        diameter: b.diameter,
        shapeCode: b.shapeCode,
        customShapeId: b.customShapeId,
        barsFormula: b.numBarsPerElement.toString(),
        dimAFormula,
        dimBFormula: b.dimB ? b.dimB.toFixed(3) : undefined,
        dimCFormula: b.dimC ? b.dimC.toFixed(3) : undefined,
        dimDFormula: b.dimD ? b.dimD.toFixed(3) : undefined,
        dimEFormula: b.dimE ? b.dimE.toFixed(3) : undefined,
        remarks: b.remarks || `Generated from ${b.barMark}`,
      };
    });

    const newTmpl: SectionTemplate = {
      id: `tmpl-custom-${Date.now()}`,
      name: newTemplateName.trim(),
      category: newTemplateCategory,
      description: newTemplateDesc.trim(),
      primaryParamName: newTemplatePrimaryName.trim() || 'Length L (m)',
      primaryParamDefault: newTemplatePrimaryDefault,
      secondaryParamDefault: 0.30,
      depthParamDefault: 0.50,
      coverParamDefault: 0.025,
      rules,
      isPredefined: false,
    };

    onSaveTemplate(newTmpl);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setSelectedTemplateId(newTmpl.id);
      setActiveTab('recreate');
    }, 1500);
  };

  const handleAppendToSchedule = () => {
    if (previewBars.length === 0) return;
    onAppendBars(previewBars);
    setAppendSuccess(true);
    setTimeout(() => {
      setAppendSuccess(false);
      onClose();
    }, 1200);
  };

  const handleReplaceSchedule = () => {
    if (previewBars.length === 0) return;
    if (window.confirm('Replace entire BBS table with this generated section schedule?')) {
      onReplaceBars(previewBars);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-6 max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Floor & Section Template Engine
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Parametric BBS Automation
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Instant BBS recreation for building floors, beam grids, columns, and slabs simply by entering the span or story height
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('recreate')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'recreate'
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                Recreate by Length
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('save_from_bbs')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'save_from_bbs'
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                Save Schedule as Template
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manage')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  activeTab === 'manage'
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200'
                }`}
              >
                Templates ({allTemplates.length})
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200 hover:bg-slate-200 hover:dark:bg-slate-800 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'recreate' && (
            <div className="space-y-6">
              {/* Template selector pills */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Structural Template:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {allTemplates.map((t) => {
                    const isSelected = t.id === selectedTemplateId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleTemplateSelect(t)}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-950/60 border-cyan-500 ring-1 ring-cyan-500 text-slate-900 dark:text-slate-100 shadow-md'
                            : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 hover:dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold">{t.name}</span>
                          {t.isPredefined && (
                            <span className="text-[10px] font-mono px-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              Standard
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-cyan-400 block font-mono">
                          {t.category} · {t.rules.length} Bar Marks
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Parameter Inputs Card */}
              {activeTemplate && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950/90 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>{activeTemplate.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {activeTemplate.category}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{activeTemplate.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                    {/* Primary Length/Height */}
                    <div className="bg-slate-100 dark:bg-slate-900/80 p-3 rounded-lg border border-cyan-500/30">
                      <label className="block text-cyan-400 font-semibold mb-1">
                        {activeTemplate.primaryParamName} *
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.05"
                          min="0.5"
                          max="50"
                          value={primaryValue}
                          onChange={(e) => setPrimaryValue(Math.max(0.1, parseFloat(e.target.value) || 0))}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-cyan-600 rounded px-2.5 py-1.5 text-sm font-mono text-cyan-300 font-bold focus:outline-none"
                        />
                        <span className="text-slate-600 dark:text-slate-400">m</span>
                      </div>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 block">
                        Changing this recalculates the whole schedule
                      </span>
                    </div>

                    {/* Floor / Section Name */}
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                        Floor / Section Name *
                      </label>
                      <input
                        type="text"
                        value={sectionName}
                        onChange={(e) => setSectionName(e.target.value)}
                        placeholder="e.g. Ground Floor - Beam B1"
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    {/* Secondary Width */}
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                        {activeTemplate.secondaryParamName || 'Width B (m)'}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.025"
                          min="0.1"
                          value={secondaryValue}
                          onChange={(e) => setSecondaryValue(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none"
                        />
                        <span className="text-slate-600 dark:text-slate-400">m</span>
                      </div>
                    </div>

                    {/* Depth & Repetitions */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                          Depth (m)
                        </label>
                        <input
                          type="number"
                          step="0.025"
                          min="0.1"
                          value={depthValue}
                          onChange={(e) => setDepthValue(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                          Elements
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={numRepetitions}
                          onChange={(e) => setNumRepetitions(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Generated Rebar Schedule Live Preview Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-cyan-400" />
                    Instantiated Bar Schedule Preview ({previewBars.length} Items)
                  </span>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-600 dark:text-slate-400">
                      Total Steel Weight: <strong className="text-cyan-300">{totalPreviewWeight.toFixed(2)} kg</strong>
                    </span>
                    <span className="text-slate-500 dark:text-slate-500">·</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      ({(totalPreviewWeight / 1000).toFixed(3)} MT)
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider font-mono">
                      <tr>
                        <th className="py-2.5 px-3">Bar Mark</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Shape</th>
                        <th className="py-2.5 px-3 text-center">Dia (mm)</th>
                        <th className="py-2.5 px-3 text-right">No. Bars</th>
                        <th className="py-2.5 px-3 text-right">Cutting (m)</th>
                        <th className="py-2.5 px-3 text-right">Total Len (m)</th>
                        <th className="py-2.5 px-3 text-right">Weight (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
                      {previewBars.map((bar, idx) => (
                        <tr key={idx} className="hover:bg-slate-100 hover:dark:bg-slate-900/40">
                          <td className="py-2 px-3 font-bold text-cyan-400">{bar.barMark}</td>
                          <td className="py-2 px-3 font-sans text-slate-800 dark:text-slate-200">
                            <div>{bar.description}</div>
                            {bar.remarks && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-500">{bar.remarks}</div>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <MiniRebarSvg shapeCode={bar.shapeCode} className="w-14 h-7" />
                          </td>
                          <td className="py-2 px-3 text-center text-slate-800 dark:text-slate-200 font-bold">Ø{bar.diameter}</td>
                          <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">
                            {bar.numElements} × {bar.numBarsPerElement} = <strong className="text-slate-900 dark:text-slate-100">{bar.totalBars}</strong>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-amber-400">
                            {bar.cuttingLength.toFixed(3)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">
                            {bar.totalLength.toFixed(3)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-400">
                            {bar.totalWeight.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleReplaceSchedule}
                  className="px-4 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/30 border border-rose-900/60 rounded-lg transition-colors cursor-pointer"
                >
                  Replace All Existing Bars
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleAppendToSchedule}
                    className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                  >
                    {appendSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-950 font-extrabold" />
                        <span>Added to BBS Table!</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Add Section to BBS Schedule (+{previewBars.length} Bars)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'save_from_bbs' && (
            <form onSubmit={handleCreateTemplateFromBbs} className="space-y-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Capture Current Schedule as Reusable Parametric Template
                  </h3>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Formula derivation from schedule marks
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Source Section / Floor in BBS:
                    </label>
                    <select
                      value={selectedSectionFilter}
                      onChange={(e) => setSelectedSectionFilter(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="all">All Current Bars ({project.bars.length} Bars)</option>
                      {existingFloorsAndSections.map((sec) => (
                        <option key={sec} value={sec}>
                          Section: {sec}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Template Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="e.g. Standard 6m Bridge Girder"
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Member Category
                    </label>
                    <select
                      value={newTemplateCategory}
                      onChange={(e) => setNewTemplateCategory(e.target.value as StructuralMemberType)}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Beam">Beam</option>
                      <option value="Column">Column</option>
                      <option value="Slab">Slab</option>
                      <option value="Footing">Footing</option>
                      <option value="Retaining Wall">Retaining Wall</option>
                      <option value="Culvert">Culvert</option>
                      <option value="Staircase">Staircase</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Primary Driving Variable Label (e.g. Span Length L)
                    </label>
                    <input
                      type="text"
                      value={newTemplatePrimaryName}
                      onChange={(e) => setNewTemplatePrimaryName(e.target.value)}
                      placeholder="e.g. Clear Span L (m)"
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Default Primary Value (m)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newTemplatePrimaryDefault}
                      onChange={(e) => setNewTemplatePrimaryDefault(parseFloat(e.target.value) || 5.0)}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Template Description
                    </label>
                    <input
                      type="text"
                      value={newTemplateDesc}
                      onChange={(e) => setNewTemplateDesc(e.target.value)}
                      placeholder="Describe what structural element this template details..."
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bars included preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Bars to be converted into parametric rules ({barsToTemplate.length} items):
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-2 space-y-1.5 text-xs font-mono">
                  {barsToTemplate.map((b, i) => (
                    <div key={b.id || i} className="flex items-center justify-between p-2 rounded bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-cyan-400">{b.barMark}</span>
                        <span className="font-sans text-slate-700 dark:text-slate-300">{b.description}</span>
                        <span className="text-slate-500 dark:text-slate-500 font-bold">Ø{b.diameter}mm</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                        <span>A = {b.dimA.toFixed(3)}m</span>
                        <span>Qty: {b.numBarsPerElement}</span>
                        <span className="text-amber-400 font-bold">Cut: {b.cuttingLength.toFixed(3)}m</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={barsToTemplate.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-40"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-950 font-bold" />
                      <span>Template Saved to Library!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save as Reusable Template</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'manage' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Template Library ({allTemplates.length})
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Predefined civil engineering standards and user-saved parametric modules
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allTemplates.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-slate-300 hover:dark:border-slate-700 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          {t.name}
                          {t.isPredefined ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-cyan-400">
                              Official Predefined
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                              Custom Saved
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{t.description}</p>
                      </div>

                      {!t.isPredefined && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete section template "${t.name}"? This only removes the saved template, not any bars already generated from it.`)) {
                              onDeleteTemplate(t.id);
                            }
                          }}
                          className="p-1 rounded text-slate-600 dark:text-slate-400 hover:text-rose-400 hover:bg-slate-200 hover:dark:bg-slate-800 cursor-pointer"
                          title="Delete template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="my-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-xs font-mono space-y-1 text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Driving Variable:</span>
                        <strong className="text-cyan-400">{t.primaryParamName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Rules Count:</span>
                        <span className="text-slate-800 dark:text-slate-200">{t.rules.length} Bar Marks</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-800/60 mt-auto">
                      <span className="text-[11px] text-slate-500 dark:text-slate-500 font-mono">
                        Category: {t.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          handleTemplateSelect(t);
                          setActiveTab('recreate');
                        }}
                        className="px-3 py-1.5 font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg cursor-pointer flex items-center gap-1"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        Recreate by Length
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
