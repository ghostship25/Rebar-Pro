import React, { useState, useMemo } from 'react';
import {
  BarItem,
  StructuralMemberType,
  RebarDiameter,
  STANDARD_DIAMETERS,
  StructureNode,
} from '../types/bbs';
import { MiniRebarSvg } from './MiniRebarSvg';
import {
  Search,
  Filter,
  Plus,
  Copy,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Layers,
  Wand2,
  Building,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  Sparkles,
  LayoutGrid,
  List,
} from 'lucide-react';

interface BbsTableProps {
  bars: BarItem[];
  structures?: StructureNode[];
  onAddBar: () => void;
  onEditBar: (bar: BarItem) => void;
  onDuplicateBar: (barId: string) => void;
  onDeleteBar: (barId: string) => void;
  onMoveBar: (barId: string, direction: 'up' | 'down') => void;
  onInspectCanvas: (bar: BarItem) => void;
  onOpenSectionTemplates?: () => void;
  onAddStructure?: () => void;
  onAddBarForContext?: (context: {
    structureName?: string;
    subComponent?: string;
    component?: string;
    member?: StructuralMemberType;
  }) => void;
  onLoadExample?: (type: 'building' | 'boxCulvert' | 'slabCulvert') => void;
}

const MEMBERS: (StructuralMemberType | 'All')[] = [
  'All',
  'Beam',
  'Column',
  'Slab',
  'Footing',
  'Retaining Wall',
  'Culvert',
  'Staircase',
  'Miscellaneous',
];

export const BbsTable: React.FC<BbsTableProps> = ({
  bars,
  structures = [],
  onAddBar,
  onEditBar,
  onDuplicateBar,
  onDeleteBar,
  onMoveBar,
  onInspectCanvas,
  onOpenSectionTemplates,
  onAddStructure,
  onAddBarForContext,
  onLoadExample,
}) => {
  const [selectedStructure, setSelectedStructure] = useState<string>('All');
  const [selectedMember, setSelectedMember] = useState<StructuralMemberType | 'All'>('All');
  const [selectedDia, setSelectedDia] = useState<RebarDiameter | 'All'>('All');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroupCollapse = (grpKey: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [grpKey]: !prev[grpKey] }));
  };

  // Extract unique structures
  const uniqueStructures = useMemo(() => {
    const set = new Set<string>();
    structures.forEach((s) => set.add(s.name));
    bars.forEach((b) => {
      if (b.structureName && b.structureName.trim()) {
        set.add(b.structureName.trim());
      }
    });
    return Array.from(set).sort();
  }, [structures, bars]);

  // Extract unique sections
  const uniqueSections = useMemo(() => {
    const set = new Set<string>();
    bars.forEach((b) => {
      if (b.subComponent && b.subComponent.trim()) {
        set.add(b.subComponent.trim());
      } else if (b.floorOrSection && b.floorOrSection.trim()) {
        set.add(b.floorOrSection.trim());
      }
    });
    return Array.from(set).sort();
  }, [bars]);

  // Filtered bars
  const filteredBars = bars.filter((bar) => {
    if (selectedStructure !== 'All') {
      const sName = bar.structureName || 'General';
      if (sName !== selectedStructure) return false;
    }
    if (selectedMember !== 'All' && bar.member !== selectedMember) return false;
    if (selectedDia !== 'All' && bar.diameter !== selectedDia) return false;
    if (selectedSection !== 'All') {
      const sec = bar.subComponent || bar.floorOrSection?.trim() || 'General';
      if (sec !== selectedSection) return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchMark = bar.barMark.toLowerCase().includes(q);
      const matchDesc = bar.description.toLowerCase().includes(q);
      const matchMember = bar.member.toLowerCase().includes(q);
      const matchStruct = (bar.structureName || '').toLowerCase().includes(q);
      const matchComp = (bar.component || '').toLowerCase().includes(q);
      const matchGrid = (bar.gridOrSection || '').toLowerCase().includes(q);
      const matchSec = (bar.floorOrSection || '').toLowerCase().includes(q);
      if (!matchMark && !matchDesc && !matchMember && !matchStruct && !matchComp && !matchGrid && !matchSec) {
        return false;
      }
    }
    return true;
  });

  const totalFilteredWeight = filteredBars.reduce((sum, b) => sum + b.totalWeight, 0);
  const totalFilteredLength = filteredBars.reduce((sum, b) => sum + b.totalLength, 0);
  const totalFilteredBarsCount = filteredBars.reduce((sum, b) => sum + b.totalBars, 0);

  // Grouped structure hierarchy for grouped view
  const groupedData = useMemo(() => {
    const structMap: Record<string, {
      structureName: string;
      totalWeight: number;
      totalBars: number;
      components: Record<string, {
        componentName: string;
        subComponent?: string;
        member?: StructuralMemberType;
        bars: BarItem[];
        totalWeight: number;
      }>;
    }> = {};

    filteredBars.forEach((bar) => {
      const sName = bar.structureName || 'General Structure';
      const cName = bar.component || bar.member || 'Main Component';
      const key = `${sName}:::${cName}`;

      if (!structMap[sName]) {
        structMap[sName] = {
          structureName: sName,
          totalWeight: 0,
          totalBars: 0,
          components: {},
        };
      }
      structMap[sName].totalWeight += bar.totalWeight;
      structMap[sName].totalBars += bar.totalBars;

      if (!structMap[sName].components[key]) {
        structMap[sName].components[key] = {
          componentName: cName,
          subComponent: bar.subComponent || bar.floorOrSection,
          member: bar.member,
          bars: [],
          totalWeight: 0,
        };
      }
      structMap[sName].components[key].bars.push(bar);
      structMap[sName].components[key].totalWeight += bar.totalWeight;
    });

    return Object.values(structMap);
  }, [filteredBars]);

  return (
    <div className="space-y-4">
      {/* Control Bar: Filters, Search & Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-950/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Structure Filter */}
          {uniqueStructures.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-600 dark:text-slate-400">Structure:</span>
              <select
                value={selectedStructure}
                onChange={(e) => setSelectedStructure(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="All" className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">All Structures</option>
                {uniqueStructures.map((s) => (
                  <option key={s} value={s} className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Member Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-600 dark:text-slate-400">Member:</span>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value as any)}
              className="bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              {MEMBERS.map((m) => (
                <option key={m} value={m} className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Section / Floor Filter */}
          {uniqueSections.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
              <Building className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-600 dark:text-slate-400">Section:</span>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-none cursor-pointer max-w-[140px] truncate"
              >
                <option value="All" className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">All Sections</option>
                {uniqueSections.map((sec) => (
                  <option key={sec} value={sec} className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                    {sec}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Diameter Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-mono">Φ:</span>
            <select
              value={selectedDia}
              onChange={(e) => setSelectedDia(e.target.value === 'All' ? 'All' : (Number(e.target.value) as RebarDiameter))}
              className="bg-transparent text-slate-800 dark:text-slate-200 font-medium font-mono focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-100 dark:bg-slate-900">All Sizes</option>
              {STANDARD_DIAMETERS.map((d) => (
                <option key={d} value={d} className="bg-slate-100 dark:bg-slate-900">T{d} mm</option>
              ))}
            </select>
          </div>

          {/* Search box */}
          <div className="relative flex-1 min-w-[170px]">
            <Search className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Mark, Structure, Component..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-500 placeholder:dark:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* View Toggle & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                viewMode === 'grouped' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200'
              }`}
              title="Grouped by Structure & Component"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grouped</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('flat')}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                viewMode === 'flat' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200'
              }`}
              title="Continuous Flat Table"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Flat</span>
            </button>
          </div>

          {onOpenSectionTemplates && (
            <button
              type="button"
              onClick={onOpenSectionTemplates}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-200 bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-700/60 rounded-lg transition-colors cursor-pointer"
              title="Use saved section templates by specifying span length"
            >
              <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Templates</span>
            </button>
          )}

          <button
            type="button"
            onClick={onAddBar}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Bar Mark</span>
          </button>
        </div>
      </div>

      {/* Main Schedule Display */}
      {bars.length === 0 ? (
        /* Empty Schedule Workspace State */
        <div className="bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-xl text-center space-y-6">
          <div className="max-w-xl mx-auto space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center mx-auto text-cyan-400">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Clean Bar Bending Schedule</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              No rebar marks have been added yet. Create a structure (e.g. <b>Drain, Culvert, Building, Pavement, Abutment</b>)
              to start detailing rebar marks, sub-components, and grids.
            </p>
          </div>

          {/* Quick-start Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
            <div
              onClick={() => onAddStructure ? onAddStructure() : onAddBar()}
              className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-100 hover:dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group"
            >
              <div className="text-2xl mb-1.5">🌊 🌉</div>
              <div className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-cyan-300">
                1. Add Structure
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Define a Drain, Box Culvert, Building, or Pavement with its sub-components & sections.
              </p>
            </div>

            <div
              onClick={onAddBar}
              className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-100 hover:dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group"
            >
              <div className="text-2xl mb-1.5">📐 ✍️</div>
              <div className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-cyan-300">
                2. Add Custom Bar Mark
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Detail straight, L-bars, stirrups, or cranked bars with parametric IS/BS shape codes.
              </p>
            </div>

            <div
              onClick={onOpenSectionTemplates}
              className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-100 hover:dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group"
            >
              <div className="text-2xl mb-1.5">⚡ 📏</div>
              <div className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-300">
                3. Section Templates
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Saved parametric templates: simply enter span length $L$ or depth $D$ to instantiate a complete schedule.
              </p>
            </div>

            {onLoadExample && (
              <div
                onClick={() => onLoadExample('boxCulvert')}
                className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-100 hover:dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer group"
              >
                <div className="text-2xl mb-1.5">🏗️ 📋</div>
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-amber-300">
                  4. Load Culvert Example
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                  Load an RCC Box Culvert with barrel, aprons, wingwalls, and linked cutting schedule.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Populated Schedule Table */
        <div className="bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-900/95 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[11px] select-none">
                <tr>
                  <th className="py-2.5 px-2.5 w-12 text-center">#</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Bar Mark</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Structure</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Component / Section</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Description</th>
                  <th className="py-2.5 px-2 text-center">Shape</th>
                  <th className="py-2.5 px-2.5 text-center">Dia Φ</th>
                  <th className="py-2.5 px-2 text-right">Elem</th>
                  <th className="py-2.5 px-2 text-right">Bars</th>
                  <th className="py-2.5 px-2.5 text-right font-bold text-slate-700 dark:text-slate-300">Total</th>
                  <th className="py-2.5 px-2 text-right font-mono text-slate-600 dark:text-slate-400">A</th>
                  <th className="py-2.5 px-2 text-right font-mono text-slate-600 dark:text-slate-400">B</th>
                  <th className="py-2.5 px-2 text-right font-mono text-slate-600 dark:text-slate-400">C</th>
                  <th className="py-2.5 px-3 text-right font-mono text-cyan-400 font-bold">Cut (m)</th>
                  <th className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">Run (m)</th>
                  <th className="py-2.5 px-2 text-right font-mono text-slate-600 dark:text-slate-400">kg/m</th>
                  <th className="py-2.5 px-3 text-right font-bold text-amber-400">Weight (kg)</th>
                  <th className="py-2.5 px-3 text-center w-28">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono text-[12px]">
                {filteredBars.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="py-12 text-center text-slate-500 dark:text-slate-500 font-sans">
                      No rebar rows match current filter.
                    </td>
                  </tr>
                ) : viewMode === 'grouped' ? (
                  /* GROUPED VIEW BY STRUCTURE & COMPONENT */
                  groupedData.map((group) => {
                    const isCollapsed = collapsedGroups[group.structureName] ?? false;

                    return (
                      <React.Fragment key={group.structureName}>
                        {/* Structure Group Header */}
                        <tr className="bg-slate-100 dark:bg-slate-900/90 border-y border-slate-300 dark:border-slate-700/80 select-none">
                          <td colSpan={18} className="py-2 px-3">
                            <div className="flex items-center justify-between font-sans">
                              <div
                                onClick={() => toggleGroupCollapse(group.structureName)}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                {isCollapsed ? (
                                  <ChevronRight className="w-4 h-4 text-cyan-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-cyan-400" />
                                )}
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wide">
                                  {group.structureName}
                                </span>
                                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                                  ({group.totalBars} Bars)
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-xs font-mono font-bold text-amber-300">
                                  {group.totalWeight.toFixed(2)} kg
                                  <span className="text-[10px] text-amber-400/80 ml-1">
                                    ({(group.totalWeight / 1000).toFixed(3)} MT)
                                  </span>
                                </span>

                                {onAddBarForContext && (
                                  <button
                                    type="button"
                                    onClick={() => onAddBarForContext({ structureName: group.structureName })}
                                    className="text-[10px] font-semibold px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded hover:bg-cyan-500/30 transition-colors cursor-pointer"
                                  >
                                    + Add Bar
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Components inside Structure */}
                        {!isCollapsed &&
                          Object.values(group.components).map((comp) => (
                            <React.Fragment key={`${group.structureName}-${comp.componentName}`}>
                              {/* Sub-header for component */}
                              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/40 text-[11px] font-sans">
                                <td colSpan={18} className="py-1 px-4 text-slate-600 dark:text-slate-400">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                      <span className="font-semibold text-slate-800 dark:text-slate-200">{comp.componentName}</span>
                                      {comp.subComponent && (
                                        <span className="text-slate-500 dark:text-slate-500 font-normal">
                                          [{comp.subComponent}]
                                        </span>
                                      )}
                                      <span className="text-[10px] text-slate-500 dark:text-slate-500 font-mono">
                                        ({comp.bars.length} bar marks)
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-amber-300/90 text-[11px]">
                                        {comp.totalWeight.toFixed(2)} kg
                                      </span>
                                      {onAddBarForContext && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onAddBarForContext({
                                              structureName: group.structureName,
                                              subComponent: comp.subComponent,
                                              component: comp.componentName,
                                              member: comp.member,
                                            })
                                          }
                                          className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
                                        >
                                          + Bar
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>

                              {/* Bar Rows */}
                              {comp.bars.map((bar, barIdx) => renderBarRow(bar, barIdx, filteredBars.indexOf(bar)))}
                            </React.Fragment>
                          ))}
                      </React.Fragment>
                    );
                  })
                ) : (
                  /* FLAT VIEW */
                  filteredBars.map((bar, index) => renderBarRow(bar, index, index))
                )}
              </tbody>

              {/* Table Footer with Filter Totals */}
              {filteredBars.length > 0 && (
                <tfoot className="bg-slate-100 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  <tr>
                    <td colSpan={7} className="py-3 px-3 text-slate-600 dark:text-slate-400 uppercase text-[11px]">
                      Schedule Subtotals ({filteredBars.length} Bar Marks)
                    </td>
                    <td colSpan={3} className="py-3 px-3 text-right text-cyan-400">
                      {totalFilteredBarsCount} Bars
                    </td>
                    <td colSpan={3}></td>
                    <td></td>
                    <td className="py-3 px-3 text-right text-cyan-300">
                      {totalFilteredLength.toFixed(3)} m
                    </td>
                    <td></td>
                    <td className="py-3 px-3 text-right text-amber-400 text-sm">
                      {totalFilteredWeight.toFixed(2)} kg
                    </td>
                    <td className="py-3 px-2 text-center text-[11px] text-amber-300">
                      {(totalFilteredWeight / 1000).toFixed(3)} MT
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );

  function renderBarRow(bar: BarItem, localIdx: number, globalIdx: number) {
    const isOversized = bar.cuttingLength > 12.0;

    return (
      <tr
        key={bar.id}
        className="hover:bg-slate-100 hover:dark:bg-slate-900/60 transition-colors group"
      >
        {/* Index & Move Controls */}
        <td className="py-2 px-2 text-center text-slate-500 dark:text-slate-500">
          <div className="flex items-center justify-center gap-0.5">
            <button
              type="button"
              onClick={() => onMoveBar(bar.id, 'up')}
              disabled={globalIdx === 0}
              className="text-slate-400 dark:text-slate-600 hover:text-slate-700 hover:dark:text-slate-300 disabled:opacity-20 cursor-pointer"
              title="Move Up"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <span className="text-[10px] w-4">{globalIdx + 1}</span>
            <button
              type="button"
              onClick={() => onMoveBar(bar.id, 'down')}
              disabled={globalIdx === filteredBars.length - 1}
              className="text-slate-400 dark:text-slate-600 hover:text-slate-700 hover:dark:text-slate-300 disabled:opacity-20 cursor-pointer"
              title="Move Down"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
        </td>

        {/* Bar Mark */}
        <td className="py-2 px-3 font-bold text-cyan-300 whitespace-nowrap">
          {bar.barMark}
        </td>

        {/* Structure */}
        <td className="py-2 px-3 font-sans text-xs whitespace-nowrap text-slate-700 dark:text-slate-300">
          {bar.structureName ? (
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-[11px]">
              {bar.structureName}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-600 text-[11px]">—</span>
          )}
        </td>

        {/* Component / Section */}
        <td className="py-2 px-3 font-sans text-xs whitespace-nowrap text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-medium text-slate-800 dark:text-slate-200">{bar.component || bar.member}</span>
            {(bar.subComponent || bar.gridOrSection) && (
              <span className="text-[10px] text-slate-500 dark:text-slate-500">
                ({bar.subComponent || ''} {bar.gridOrSection ? `• ${bar.gridOrSection}` : ''})
              </span>
            )}
          </div>
        </td>

        {/* Description & Remarks */}
        <td className="py-2 px-3 font-sans text-xs">
          <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">{bar.description}</div>
          {bar.remarks && (
            <div className="text-[10px] text-slate-600 dark:text-slate-400 italic line-clamp-1">{bar.remarks}</div>
          )}
        </td>

        {/* Shape Code & Mini Vector preview */}
        <td className="py-1 px-2 text-center">
          <button
            type="button"
            onClick={() => onInspectCanvas(bar)}
            className="flex flex-col items-center mx-auto hover:opacity-80 transition-opacity cursor-pointer"
            title="Click to view detailed vector CAD drawing & formula trace"
          >
            <MiniRebarSvg shapeCode={bar.shapeCode} className="w-14 h-7" />
            <span className="text-[9px] text-cyan-400/80 font-mono">
              {bar.customShapeId ? 'Custom' : `#${bar.shapeCode}`}
            </span>
          </button>
        </td>

        {/* Diameter */}
        <td className="py-2 px-2.5 text-center font-bold text-slate-800 dark:text-slate-200">
          T{bar.diameter}
        </td>

        {/* No. of Elements */}
        <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
          {bar.numElements}
        </td>

        {/* Bars per Element */}
        <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
          {bar.numBarsPerElement}
        </td>

        {/* Total Bars */}
        <td className="py-2 px-2.5 text-right font-bold text-slate-800 dark:text-slate-200">
          {bar.totalBars}
        </td>

        {/* Dim A */}
        <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">
          {bar.dimA.toFixed(3)}
        </td>

        {/* Dim B */}
        <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
          {bar.dimB !== undefined ? bar.dimB.toFixed(3) : '—'}
        </td>

        {/* Dim C */}
        <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
          {bar.dimC !== undefined ? bar.dimC.toFixed(3) : '—'}
        </td>

        {/* Cutting Length */}
        <td className="py-2 px-3 text-right font-bold whitespace-nowrap">
          <span className={isOversized ? 'text-amber-400 underline decoration-dotted' : 'text-cyan-400'}>
            {bar.cuttingLength.toFixed(3)}
          </span>
          {isOversized && (
            <span className="ml-1 text-[10px] text-amber-500 font-sans" title="Cutting length > 12.0m stock length">
              ⚠️
            </span>
          )}
        </td>

        {/* Total Length */}
        <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">
          {bar.totalLength.toFixed(3)}
        </td>

        {/* Unit Weight */}
        <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
          {bar.unitWeight.toFixed(3)}
        </td>

        {/* Total Weight */}
        <td className="py-2 px-3 text-right font-bold text-amber-300">
          {bar.totalWeight.toFixed(2)}
        </td>

        {/* Row Actions */}
        <td className="py-2 px-2 text-center">
          <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onEditBar(bar)}
              className="p-1 rounded text-slate-600 dark:text-slate-400 hover:text-cyan-400 hover:bg-slate-200 hover:dark:bg-slate-800 transition-colors cursor-pointer"
              title="Edit Rebar"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDuplicateBar(bar.id)}
              className="p-1 rounded text-slate-600 dark:text-slate-400 hover:text-cyan-400 hover:bg-slate-200 hover:dark:bg-slate-800 transition-colors cursor-pointer"
              title="Duplicate Bar"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteBar(bar.id)}
              className="p-1 rounded text-slate-600 dark:text-slate-400 hover:text-rose-400 hover:bg-slate-200 hover:dark:bg-slate-800 transition-colors cursor-pointer"
              title="Delete Bar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  }
};
