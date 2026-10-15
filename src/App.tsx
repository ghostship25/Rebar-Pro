import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ProjectData,
  BarItem,
  ProjectMetadata,
  CustomShapeDefinition,
  SectionTemplate,
  StructureNode,
  StructuralMemberType,
} from './types/bbs';
import { PRESET_PROJECTS } from './utils/presets';
import { DEFAULT_SECTION_TEMPLATES } from './utils/parametric';
import { exportToExcel, exportToPdf, exportToJson, loadProjectFromJson } from './utils/export';
import { getInitialTheme, applyTheme, toggleTheme, Theme } from './utils/theme';
import { ThemeToggle } from './components/ThemeToggle';
import { IconButton } from './components/IconButton';
import { BbsTable } from './components/BbsTable';
import { StructureManager } from './components/StructureManager';
import { SteelAbstract } from './components/SteelAbstract';
import { CuttingOptimizer } from './components/CuttingOptimizer';
import { AuditAlerts } from './components/AuditAlerts';
import { BarModal } from './components/BarModal';
import { MemberWizardsModal } from './components/MemberWizardsModal';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import { ShapeInspectorModal } from './components/ShapeInspectorModal';
import { PrintReport } from './components/PrintReport';
import { CustomShapeModal } from './components/CustomShapeModal';
import { SectionTemplateModal } from './components/SectionTemplateModal';
import {
  Layers,
  FileSpreadsheet,
  FileText,
  Loader2,
  Scissors,
  BookOpen,
  Printer,
  Download,
  Upload,
  Settings,
  Wand2,
  Plus,
  FolderOpen,
  CheckCircle,
  Sparkles,
  Building,
  Network,
  FolderPlus,
  RotateCcw,
} from 'lucide-react';

const STORAGE_KEY = 'rebar_pro_bbs_project_v1';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => toggleTheme(prev));
  };

  // Load initial project from LocalStorage or Clean Start
  const [project, setProject] = useState<ProjectData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.metadata && Array.isArray(parsed.bars)) {
          return {
            ...parsed,
            structures: parsed.structures || [],
            customShapes: parsed.customShapes || [],
            sectionTemplates:
              parsed.sectionTemplates && parsed.sectionTemplates.length > 0
                ? parsed.sectionTemplates
                : DEFAULT_SECTION_TEMPLATES,
          };
        }
      }
    } catch (e) {
      console.error('Failed to load project from local storage:', e);
    }
    // Clean start by default: no pre-populated bar schedule, section templates preserved in background!
    return {
      metadata: {
        id: `proj-${Date.now()}`,
        projectTitle: 'Civil Engineering BBS Project',
        clientName: 'Infrastructure Development Authority',
        contractorName: 'Construction & Civil Engineers Ltd',
        structuralEngineer: 'Er. R. K. Sharma, M.Tech (Structures)',
        checkedBy: 'Er. S. M. Patel, Chief Reviewer',
        drawingNumber: 'STR-BBS-2026-01',
        revision: 'R-00 (Good for Construction)',
        date: new Date().toISOString().split('T')[0],
        standard: 'IS 2502 / SP 34',
        wastagePercent: 3.5,
        bindingWireRateKgPerMT: 9.0,
      },
      bars: [], // Clean schedule by default!
      structures: [],
      customShapes: [],
      sectionTemplates: DEFAULT_SECTION_TEMPLATES,
    };
  });

  // Active Tab
  type AppTab = 'schedule' | 'abstract' | 'optimizer' | 'shapes';
  const [activeTab, setActiveTab] = useState<AppTab>('schedule');

  // Modal States
  const [isBarModalOpen, setIsBarModalOpen] = useState(false);
  const [editingBar, setEditingBar] = useState<BarItem | null>(null);
  const [barModalContext, setBarModalContext] = useState<{
    structureName?: string;
    subComponent?: string;
    component?: string;
    gridOrSection?: string;
    member?: StructuralMemberType;
  } | undefined>(undefined);

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShapeInspectorOpen, setIsShapeInspectorOpen] = useState(false);
  const [inspectingBar, setInspectingBar] = useState<BarItem | null>(null);
  const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);

  // Modals for Custom Shapes & Section Templates
  const [isCustomShapeModalOpen, setIsCustomShapeModalOpen] = useState(false);
  const [isSectionTemplateModalOpen, setIsSectionTemplateModalOpen] = useState(false);

  // Structure Manager view toggle
  const [showStructureManager, setShowStructureManager] = useState(true);
  const [selectedStructureFilter, setSelectedStructureFilter] = useState<{
    structureId?: string;
    subComponentId?: string;
    componentId?: string;
    structureName?: string;
    subComponentName?: string;
    componentName?: string;
  }>({});

  const [notification, setNotification] = useState<{ message: string; undo?: () => void } | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch (err) {
      console.warn('LocalStorage quota or serialization error:', err);
    }
  }, [project]);

  // Toast helper. Pass `undo` for reversible actions (e.g. deleting a bar) so the
  // person always has a quick way back instead of a blocking confirm() on every edit.
  const showToast = (msg: string, undo?: () => void) => {
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    setNotification({ message: msg, undo });
    notificationTimerRef.current = setTimeout(() => setNotification(null), undo ? 6000 : 3500);
  };

  // Create clean new project
  const handleCreateCleanProject = () => {
    if (
      project.bars.length > 0 &&
      !confirm(`Start a new clean project? This will clear all ${project.bars.length} bar mark(s) in the current schedule (this cannot be undone).`)
    ) {
      return;
    }
    const cleanProj: ProjectData = {
      metadata: {
        id: `proj-${Date.now()}`,
        projectTitle: 'New Civil Engineering BBS Project',
        clientName: 'Client Name',
        contractorName: 'Contractor Name',
        structuralEngineer: 'Structural Consultant',
        checkedBy: 'BBS Checking Engineer',
        drawingNumber: 'DWG-BBS-001',
        revision: 'R-00',
        date: new Date().toISOString().split('T')[0],
        standard: 'IS 2502 / SP 34',
        wastagePercent: 3.5,
        bindingWireRateKgPerMT: 9.0,
      },
      bars: [],
      structures: [],
      customShapes: project.customShapes || [],
      sectionTemplates: project.sectionTemplates || DEFAULT_SECTION_TEMPLATES,
    };
    setProject(cleanProj);
    setSelectedStructureFilter({});
    showToast('Created new clean BBS project');
  };

  // Preset Switcher (optional examples)
  const handleLoadPreset = (key: 'building' | 'slabCulvert' | 'boxCulvert' | 'blank') => {
    if (key === 'blank') {
      handleCreateCleanProject();
    } else {
      if (
        project.bars.length > 0 &&
        !confirm(`Load this example project? This will replace all ${project.bars.length} bar mark(s) in the current schedule (this cannot be undone).`)
      ) {
        return;
      }
      const presetData = PRESET_PROJECTS[key];
      // Generate default structures hierarchy for preset
      let presetStructures: StructureNode[] = [];
      if (key === 'boxCulvert') {
        presetStructures = [
          {
            id: 'struct-box-1',
            name: 'RCC Box Culvert (3.0m x 3.0m)',
            type: 'culvert',
            subComponents: [
              {
                id: 'sc-barrel',
                name: 'Barrel Section',
                components: [
                  { id: 'c-deck', name: 'Top Deck Slab', memberType: 'Slab' },
                  { id: 'c-invert', name: 'Bottom Raft / Invert', memberType: 'Slab' },
                  { id: 'c-walls', name: 'Sidewalls & Haunches', memberType: 'Retaining Wall' },
                ],
              },
              {
                id: 'sc-wings',
                name: 'Inlet Apron & Wingwalls',
                components: [
                  { id: 'c-apron', name: 'Apron Slab', memberType: 'Slab' },
                  { id: 'c-wing', name: 'Wingwall', memberType: 'Retaining Wall' },
                ],
              },
            ],
          },
        ];
      } else if (key === 'building') {
        presetStructures = [
          {
            id: 'struct-bldg-1',
            name: '2-Storey RCC Building',
            type: 'building',
            subComponents: [
              {
                id: 'sc-fnd',
                name: 'Foundation Level',
                components: [
                  { id: 'c-foot', name: 'Isolated Footing F1', memberType: 'Footing' },
                  { id: 'c-ped', name: 'Pedestal Starter Bars', memberType: 'Column' },
                ],
              },
              {
                id: 'sc-gf',
                name: 'Ground Floor',
                components: [
                  { id: 'c-col', name: 'Columns C1', memberType: 'Column' },
                  { id: 'c-beam', name: 'Floor Beams B1', memberType: 'Beam' },
                  { id: 'c-slab', name: 'Floor Slab S1', memberType: 'Slab' },
                ],
              },
            ],
          },
        ];
      }

      setProject({
        ...presetData,
        structures: presetStructures,
        customShapes: project.customShapes || [],
        sectionTemplates: project.sectionTemplates || DEFAULT_SECTION_TEMPLATES,
      });
      showToast(`Loaded ${presetData.metadata.projectTitle}`);
    }
  };

  // Bar Manipulations
  const handleSaveBar = (savedBar: BarItem) => {
    setProject((prev) => {
      const existsIndex = prev.bars.findIndex((b) => b.id === savedBar.id);
      if (existsIndex >= 0) {
        const updated = [...prev.bars];
        updated[existsIndex] = savedBar;
        return { ...prev, bars: updated };
      } else {
        return { ...prev, bars: [...prev.bars, savedBar] };
      }
    });
    showToast(`Saved bar mark ${savedBar.barMark}`);
  };

  const handleDeleteBar = (barId: string) => {
    const index = project.bars.findIndex((b) => b.id === barId);
    if (index === -1) return;
    const removed = project.bars[index];

    setProject((prev) => ({
      ...prev,
      bars: prev.bars.filter((b) => b.id !== barId),
    }));

    showToast(`Deleted bar mark ${removed.barMark}`, () => {
      setProject((prev) => {
        const bars = [...prev.bars];
        bars.splice(Math.min(index, bars.length), 0, removed);
        return { ...prev, bars };
      });
    });
  };

  const handleExportExcel = async () => {
    if (project.bars.length === 0) {
      showToast('Add at least one bar before exporting.');
      return;
    }
    setIsExportingExcel(true);
    try {
      await exportToExcel(project);
      showToast('Excel workbook downloaded.');
    } catch (err) {
      console.error('Excel export failed:', err);
      showToast('Excel export failed — check the console for details.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPdf = () => {
    if (project.bars.length === 0) {
      showToast('Add at least one bar before exporting.');
      return;
    }
    try {
      exportToPdf(project);
      showToast('PDF report downloaded.');
    } catch (err) {
      console.error('PDF export failed:', err);
      showToast('PDF export failed — check the console for details.');
    }
  };

  const handleDuplicateBar = (barId: string) => {
    const found = project.bars.find((b) => b.id === barId);
    if (!found) return;

    const dup: BarItem = {
      ...found,
      id: `bar-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      barMark: `${found.barMark}-CPY`,
      description: `${found.description} (Copy)`,
    };

    setProject((prev) => ({
      ...prev,
      bars: [...prev.bars, dup],
    }));
    showToast(`Duplicated ${found.barMark}`);
  };

  const handleMoveBar = (barId: string, direction: 'up' | 'down') => {
    setProject((prev) => {
      const index = prev.bars.findIndex((b) => b.id === barId);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.bars.length - 1) return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const updated = [...prev.bars];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;

      return { ...prev, bars: updated };
    });
  };

  const handleWizardGenerated = (newBars: BarItem[], memberType: string) => {
    setProject((prev) => ({
      ...prev,
      bars: [...prev.bars, ...newBars],
    }));
    showToast(`Generated ${newBars.length} rebar items for ${memberType}`);
  };

  const handleUpdateMetadata = (updates: Partial<ProjectMetadata>) => {
    setProject((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, ...updates },
    }));
    showToast('Project metadata & specifications updated');
  };

  // Structures update handler
  const handleUpdateStructures = (structures: StructureNode[]) => {
    setProject((prev) => ({ ...prev, structures }));
  };

  // Add bar for context (e.g. from structure manager or grouped header)
  const handleAddBarForContext = (context: {
    structureName?: string;
    subComponent?: string;
    component?: string;
    gridOrSection?: string;
    member?: StructuralMemberType;
  }) => {
    setBarModalContext(context);
    setEditingBar(null);
    setIsBarModalOpen(true);
  };

  // Custom Shapes Management
  const handleSaveCustomShape = (newShape: CustomShapeDefinition) => {
    setProject((prev) => {
      const shapes = prev.customShapes || [];
      const idx = shapes.findIndex((s) => s.id === newShape.id);
      let updated: CustomShapeDefinition[];
      if (idx >= 0) {
        updated = [...shapes];
        updated[idx] = newShape;
      } else {
        updated = [newShape, ...shapes];
      }
      return { ...prev, customShapes: updated };
    });
    showToast(`Saved custom shape "${newShape.name}"`);
  };

  const handleDeleteCustomShape = (shapeId: string) => {
    setProject((prev) => ({
      ...prev,
      customShapes: (prev.customShapes || []).filter((s) => s.id !== shapeId),
    }));
    showToast('Removed custom shape from library');
  };

  // Section Templates Management
  const handleSaveSectionTemplate = (newTemplate: SectionTemplate) => {
    setProject((prev) => {
      const templates = prev.sectionTemplates || [];
      const idx = templates.findIndex((t) => t.id === newTemplate.id);
      let updated: SectionTemplate[];
      if (idx >= 0) {
        updated = [...templates];
        updated[idx] = newTemplate;
      } else {
        updated = [newTemplate, ...templates];
      }
      return { ...prev, sectionTemplates: updated };
    });
    showToast(`Saved section template "${newTemplate.name}"`);
  };

  const handleDeleteSectionTemplate = (templateId: string) => {
    setProject((prev) => ({
      ...prev,
      sectionTemplates: (prev.sectionTemplates || []).filter((t) => t.id !== templateId),
    }));
    showToast('Removed template from library');
  };

  const handleAppendBarsFromTemplate = (newBars: BarItem[]) => {
    setProject((prev) => ({
      ...prev,
      bars: [...prev.bars, ...newBars],
    }));
    showToast(`Added ${newBars.length} bars to BBS schedule`);
  };

  const handleReplaceBarsFromTemplate = (newBars: BarItem[]) => {
    setProject((prev) => ({
      ...prev,
      bars: newBars,
    }));
    showToast(`Replaced BBS schedule with ${newBars.length} generated bars`);
  };

  // Extract existing floor/sections
  const existingSections = useMemo(() => {
    const set = new Set<string>();
    project.bars.forEach((b) => {
      if (b.subComponent && b.subComponent.trim()) {
        set.add(b.subComponent.trim());
      } else if (b.floorOrSection && b.floorOrSection.trim()) {
        set.add(b.floorOrSection.trim());
      }
    });
    return Array.from(set);
  }, [project.bars]);

  // Import Project File Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    loadProjectFromJson(file)
      .then((loadedProject) => {
        setProject({
          ...loadedProject,
          structures: loadedProject.structures || [],
          customShapes: loadedProject.customShapes || [],
          sectionTemplates:
            loadedProject.sectionTemplates && loadedProject.sectionTemplates.length > 0
              ? loadedProject.sectionTemplates
              : DEFAULT_SECTION_TEMPLATES,
        });
        showToast(`Imported project: ${loadedProject.metadata.projectTitle}`);
      })
      .catch((err: any) => {
        showToast(`Import error: ${err?.message || 'Failed to read file'}`);
      });

    // Reset input
    e.target.value = '';
  };

  // Global schedule summary
  const totalScheduleWeight = project.bars.reduce((sum, b) => sum + b.totalWeight, 0);

  if (isPrintViewOpen) {
    return <PrintReport project={project} onClose={() => setIsPrintViewOpen(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-50 selection:dark:text-slate-950 transition-colors duration-200">
      {/* Toast Alert */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-white dark:bg-slate-900 border border-cyan-500/50 text-cyan-700 dark:text-cyan-300 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
          <span>{notification.message}</span>
          {notification.undo && (
            <button
              type="button"
              onClick={() => {
                notification.undo?.();
                setNotification(null);
              }}
              className="font-semibold text-cyan-700 dark:text-cyan-300 underline underline-offset-2 hover:text-cyan-900 hover:dark:text-cyan-100 cursor-pointer"
            >
              Undo
            </button>
          )}
        </div>
      )}

      {/* Hidden File Input for .bbs Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".bbs,.json"
        className="hidden"
      />

      {/* Top Application Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Logo & Project Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
              RP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  REBAR-PRO BBS
                </h1>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/60">
                  {project.metadata.standard}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 truncate max-w-md">
                <span className="truncate">{project.metadata.projectTitle}</span>
                <span>·</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">
                  {(totalScheduleWeight / 1000).toFixed(3)} MT
                </span>
                <span>·</span>
                <span className="font-mono">{project.bars.length} bar mark{project.bars.length === 1 ? '' : 's'}</span>
              </div>
            </div>
          </div>

          {/* Action Toolbar — icon-first so the bar stays scannable; labels live in each tooltip */}
          <div className="flex flex-wrap items-center gap-1.5">
            <ThemeToggle theme={theme} onToggle={handleToggleTheme} />

            <div className="w-px h-6 bg-slate-300 dark:bg-slate-800 mx-0.5 hidden sm:block" />

            <IconButton
              icon={<RotateCcw className="w-4 h-4" />}
              label="New Project (clear schedule)"
              onClick={handleCreateCleanProject}
            />
            <IconButton
              icon={<Network className="w-4 h-4 text-cyan-500" />}
              label={`Structures (${project.structures?.length || 0})`}
              active={showStructureManager}
              badge={project.structures?.length || 0}
              onClick={() => setShowStructureManager((prev) => !prev)}
            />
            <IconButton
              icon={<Building className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />}
              label="Section Templates Studio"
              onClick={() => setIsSectionTemplateModalOpen(true)}
            />
            <IconButton
              icon={<Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />}
              label="Custom Shape Studio"
              onClick={() => setIsCustomShapeModalOpen(true)}
            />
            <IconButton
              icon={<Wand2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
              label="Member Wizards"
              onClick={() => setIsWizardOpen(true)}
            />

            {/* Project Presets Switcher Dropdown */}
            <div className="relative group">
              <IconButton icon={<FolderOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />} label="Load Example Project" />
              <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1 hidden group-hover:block z-50 text-xs">
                <div className="px-3 py-1 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Civil Engineering Reference Presets
                </div>
                <button
                  type="button"
                  onClick={() => handleLoadPreset('boxCulvert')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <div className="font-medium">3.0m x 3.0m RCC Box Culvert</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Barrel, Aprons, Wingwalls, & Haunches</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset('slabCulvert')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <div className="font-medium">4.0m Span Slab Culvert</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">IRC:112 Highway Bridge Standard</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset('building')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <div className="font-medium">2-Storey RCC Building</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Footings, Columns, Beams, Slabs, Stairs</div>
                </button>
                <div className="border-t border-slate-200 dark:border-slate-800 my-1" />
                <button
                  type="button"
                  onClick={handleCreateCleanProject}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-cyan-600 dark:text-cyan-400 font-medium cursor-pointer"
                >
                  + Reset to Clean Schedule
                </button>
              </div>
            </div>

            <IconButton
              icon={<Settings className="w-4 h-4" />}
              label="Project Specifications & Standards"
              onClick={() => setIsSettingsOpen(true)}
            />

            <div className="w-px h-6 bg-slate-300 dark:bg-slate-800 mx-0.5 hidden sm:block" />

            {/* Export Menu with Live Formulas Excel */}
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Export</span>
              </button>
              <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1.5 hidden group-hover:block z-50 text-xs">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={isExportingExcel}
                  className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  {isExportingExcel ? (
                    <Loader2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold">{isExportingExcel ? 'Building workbook…' : 'Excel Workbook (.xlsx)'}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Fully formatted &amp; styled — bold headers, borders, number formats — with live linked cell formulas (Total Bars, Cutting Length, Run, Weight, Abstract)
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold">Download PDF Report</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      One-click paginated PDF — BBS schedule + steel abstract, no print dialog needed
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintViewOpen(true)}
                  className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold">Print Preview / Sign-off Sheet</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      On-screen preview with contractor sign-off blocks — print or Save as PDF from there too
                    </div>
                  </div>
                </button>
                <div className="border-t border-slate-200 dark:border-slate-800 my-1" />
                <button
                  type="button"
                  onClick={() => exportToJson(project)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Save Project File (.bbs)</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Load Project File (.bbs)</span>
                </button>
              </div>
            </div>

            {/* Add Bar — the single primary call-to-action, kept as a labeled button */}
            <button
              type="button"
              onClick={() => {
                setBarModalContext(undefined);
                setEditingBar(null);
                setIsBarModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Bar</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 border-t border-slate-200 dark:border-slate-800/80 pt-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'schedule'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-300 font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Bar Bending Schedule ({project.bars.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('abstract')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'abstract'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-300 font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Diameter Steel Abstract & Wire</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('optimizer')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'optimizer'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-300 font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>12m Cutting Optimizer & Scrap</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shapes')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'shapes'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-300 font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Shape Library & Code Rules</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            {/* Audit Checker Alerts Banner */}
            {project.bars.length > 0 && (
              <AuditAlerts
                bars={project.bars}
                onSelectBar={(barId) => {
                  const targetBar = project.bars.find((b) => b.id === barId);
                  if (targetBar) {
                    setEditingBar(targetBar);
                    setIsBarModalOpen(true);
                  }
                }}
              />
            )}

            {/* Structure & Component Hierarchy Breakdown */}
            {showStructureManager && (
              <StructureManager
                structures={project.structures || []}
                onUpdateStructures={handleUpdateStructures}
                bars={project.bars}
                onAddBarForContext={handleAddBarForContext}
                selectedFilter={selectedStructureFilter}
                onSelectFilter={setSelectedStructureFilter}
              />
            )}

            {/* BBS Spreadsheet Table */}
            <BbsTable
              bars={project.bars}
              structures={project.structures || []}
              onAddBar={() => {
                setBarModalContext(undefined);
                setEditingBar(null);
                setIsBarModalOpen(true);
              }}
              onEditBar={(bar) => {
                setEditingBar(bar);
                setIsBarModalOpen(true);
              }}
              onDuplicateBar={handleDuplicateBar}
              onDeleteBar={handleDeleteBar}
              onMoveBar={handleMoveBar}
              onInspectCanvas={(bar) => {
                setInspectingBar(bar);
                setIsShapeInspectorOpen(true);
              }}
              onOpenSectionTemplates={() => setIsSectionTemplateModalOpen(true)}
              onAddStructure={() => setShowStructureManager(true)}
              onAddBarForContext={handleAddBarForContext}
              onLoadExample={handleLoadPreset}
            />
          </div>
        )}

        {/* Abstract & Procurement Tab */}
        {activeTab === 'abstract' && (
          <SteelAbstract
            bars={project.bars}
            metadata={project.metadata}
            onUpdateMetadata={handleUpdateMetadata}
          />
        )}

        {/* 12m Commercial Bar Optimizer Tab */}
        {activeTab === 'optimizer' && <CuttingOptimizer bars={project.bars} />}

        {/* Shape Library Tab */}
        {activeTab === 'shapes' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Standard Rebar Shape Code Reference (IS 2502:1963 / BS 8666:2020)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Bend deductions, hook encroachments, arbitrary angle turn calculations, and mathematical formula derivations.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomShapeModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Design Custom Shape</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInspectingBar(null);
                    setIsShapeInspectorOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
                >
                  Shape CAD Tester
                </button>
              </div>
            </div>

            {/* Overview of Bend Deductions Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
                <span className="font-bold text-cyan-600 dark:text-cyan-400 font-mono text-sm block">45° Bend</span>
                <span className="text-slate-800 dark:text-slate-300 font-medium mt-1 block">Deduction: 1d</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1">Used in cranked slab and beam bars at curtailment points.</p>
              </div>
              <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
                <span className="font-bold text-cyan-600 dark:text-cyan-400 font-mono text-sm block">90° Bend</span>
                <span className="text-slate-800 dark:text-slate-300 font-medium mt-1 block">Deduction: 2d</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1">Standard right-angle hook on L-bars, starter dowels, and column ties.</p>
              </div>
              <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
                <span className="font-bold text-cyan-600 dark:text-cyan-400 font-mono text-sm block">135° Seismic Hook</span>
                <span className="text-slate-800 dark:text-slate-300 font-medium mt-1 block">Deduction: 3d + 10d min</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1">Mandatory ductile confinement stirrup anchorage hook (IS 13920).</p>
              </div>
              <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
                <span className="font-bold text-cyan-600 dark:text-cyan-400 font-mono text-sm block">180° Semi-circular</span>
                <span className="text-slate-800 dark:text-slate-300 font-medium mt-1 block">Deduction: 4d + 4d hook</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1">Traditional plain round bar end anchorage (IS 2502 Table 1).</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <BarModal
        isOpen={isBarModalOpen}
        onClose={() => {
          setIsBarModalOpen(false);
          setEditingBar(null);
          setBarModalContext(undefined);
        }}
        onSave={handleSaveBar}
        initialBar={editingBar}
        structures={project.structures || []}
        initialContext={barModalContext}
        customShapes={project.customShapes}
        onOpenCustomShapeStudio={() => setIsCustomShapeModalOpen(true)}
        existingSections={existingSections}
      />

      <MemberWizardsModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onGenerate={handleWizardGenerated}
      />

      <ProjectSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        metadata={project.metadata}
        onSave={(meta) => handleUpdateMetadata(meta)}
      />

      <ShapeInspectorModal
        isOpen={isShapeInspectorOpen}
        onClose={() => {
          setIsShapeInspectorOpen(false);
          setInspectingBar(null);
        }}
        initialBar={inspectingBar}
      />

      {/* Custom Bar Shape Studio Modal */}
      <CustomShapeModal
        isOpen={isCustomShapeModalOpen}
        onClose={() => setIsCustomShapeModalOpen(false)}
        customShapes={project.customShapes || []}
        onSaveShape={handleSaveCustomShape}
        onDeleteShape={handleDeleteCustomShape}
        onSelectForNewBar={(shape) => {
          setEditingBar(null);
          setIsBarModalOpen(true);
        }}
      />

      {/* Section & Floor Template Modal */}
      <SectionTemplateModal
        isOpen={isSectionTemplateModalOpen}
        onClose={() => setIsSectionTemplateModalOpen(false)}
        project={project}
        templates={project.sectionTemplates || []}
        onSaveTemplate={handleSaveSectionTemplate}
        onDeleteTemplate={handleDeleteSectionTemplate}
        onAppendBars={handleAppendBarsFromTemplate}
        onReplaceBars={handleReplaceBarsFromTemplate}
      />
    </div>
  );
}
