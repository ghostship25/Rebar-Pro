import React, { useState } from 'react';
import {
  StructureNode,
  SubComponentNode,
  ComponentNode,
  GridSectionNode,
  StructureCategory,
  StructuralMemberType,
  BarItem,
} from '../types/bbs';
import {
  FolderPlus,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Layers,
  Building,
  Box,
  Compass,
  Check,
  X,
  Filter,
} from 'lucide-react';

interface StructureManagerProps {
  structures: StructureNode[];
  onUpdateStructures: (structures: StructureNode[]) => void;
  bars: BarItem[];
  onAddBarForContext?: (context: {
    structureName: string;
    subComponent?: string;
    component?: string;
    gridOrSection?: string;
    member?: StructuralMemberType;
  }) => void;
  selectedFilter: {
    structureId?: string;
    subComponentId?: string;
    componentId?: string;
  };
  onSelectFilter: (filter: {
    structureId?: string;
    subComponentId?: string;
    componentId?: string;
    structureName?: string;
    subComponentName?: string;
    componentName?: string;
  }) => void;
}

// Preset structure definitions with typical civil engineering sub-components & components
export const STRUCTURE_PRESETS: {
  type: StructureCategory;
  name: string;
  label: string;
  icon: string;
  description: string;
  defaultSubComponents: {
    name: string;
    components: { name: string; memberType: StructuralMemberType; grids: string[] }[];
  }[];
}[] = [
  {
    type: 'drain',
    name: 'RCC Stormwater Drain',
    label: 'Drain',
    icon: '🌊',
    description: 'Roadside drain, chute drain, box channel with bed slab & sidewalls',
    defaultSubComponents: [
      {
        name: 'Reach 1 (Ch 0+000 to 0+200)',
        components: [
          { name: 'Drain Bed / Invert Slab', memberType: 'Slab', grids: ['Transverse Main', 'Longitudinal Dist'] },
          { name: 'Side Wall (Left & Right)', memberType: 'Retaining Wall', grids: ['Vertical Outer', 'Horizontal Inner'] },
          { name: 'Top Precast Cover / Grate', memberType: 'Slab', grids: ['Top Mesh'] },
        ],
      },
    ],
  },
  {
    type: 'culvert',
    name: 'RCC Box Culvert',
    label: 'Culvert',
    icon: '🌉',
    description: 'Single/multi-cell barrel, inlet & outlet aprons, wingwalls & curtain walls',
    defaultSubComponents: [
      {
        name: 'Barrel Section (Span 3.0m x 3.0m)',
        components: [
          { name: 'Bottom Raft / Invert', memberType: 'Slab', grids: ['Bottom Layer', 'Top Layer'] },
          { name: 'Sidewalls & Haunches', memberType: 'Retaining Wall', grids: ['Inner Face', 'Outer Face', 'Corner Haunch'] },
          { name: 'Top Deck Slab', memberType: 'Slab', grids: ['Bottom Tension', 'Top Distribution'] },
        ],
      },
      {
        name: 'Inlet & Outlet Structures',
        components: [
          { name: 'Apron Slab', memberType: 'Slab', grids: ['Bed Mesh'] },
          { name: 'Wingwalls', memberType: 'Retaining Wall', grids: ['Stem Vertical', 'Stem Horizontal'] },
          { name: 'Curtain Wall', memberType: 'Footing', grids: ['Cutoff Wall Steel'] },
        ],
      },
    ],
  },
  {
    type: 'building',
    name: 'RCC Framed Building',
    label: 'Building',
    icon: '🏢',
    description: 'Footings, columns, plinth/floor beams, slabs, and staircase',
    defaultSubComponents: [
      {
        name: 'Foundation Level',
        components: [
          { name: 'Isolated Footing F1', memberType: 'Footing', grids: ['Bottom Mesh X-Y'] },
          { name: 'Pedestal & Starter Bars', memberType: 'Column', grids: ['Starter Lap Dowels'] },
        ],
      },
      {
        name: 'Ground Floor',
        components: [
          { name: 'Columns C1', memberType: 'Column', grids: ['Main Vertical', 'Seismic Ties'] },
          { name: 'Floor Beams B1', memberType: 'Beam', grids: ['Span 1-2', 'Shear Stirrups'] },
          { name: 'Floor Slab S1', memberType: 'Slab', grids: ['Short Span Main', 'Long Span Dist'] },
        ],
      },
    ],
  },
  {
    type: 'pavement',
    name: 'Rigid Concrete Pavement',
    label: 'Pavement',
    icon: '🛣️',
    description: 'PQC slab, dowel bar cradle, tie bars, expansion joints, approach slab',
    defaultSubComponents: [
      {
        name: 'Carriageway Panels (Bay 1-10)',
        components: [
          { name: 'Transverse Contraction Joint (Dowel)', memberType: 'Miscellaneous', grids: ['Wheel Path Cradles'] },
          { name: 'Longitudinal Joint (Tie Bars)', memberType: 'Miscellaneous', grids: ['Deformed Tie Bars'] },
          { name: 'Pavement Slab Reinforcement', memberType: 'Slab', grids: ['Edge Rebar', 'Corner Mesh'] },
        ],
      },
    ],
  },
  {
    type: 'bridge',
    name: 'Bridge / Flyover Substructure',
    label: 'Bridge',
    icon: '🏗️',
    description: 'Abutments, return wingwalls, piers, pier caps, crash barriers',
    defaultSubComponents: [
      {
        name: 'Abutment A1 & Wingwalls',
        components: [
          { name: 'Abutment Stem', memberType: 'Retaining Wall', grids: ['Earth Face', 'Front Face'] },
          { name: 'Wingwall (Return / Flared)', memberType: 'Retaining Wall', grids: ['Outer Face', 'Inner Face'] },
          { name: 'Dirt Wall & Ballast Wall', memberType: 'Beam', grids: ['Top Retaining'] },
          { name: 'Apron & Drop Wall', memberType: 'Slab', grids: ['Scour Protection'] },
        ],
      },
      {
        name: 'Pier P1',
        components: [
          { name: 'Pier Shaft / Column', memberType: 'Column', grids: ['Longitudinal Main', 'Confinement Spiral'] },
          { name: 'Pier Cap / Pedestal', memberType: 'Beam', grids: ['Tension Cap Steel', 'Pedestal Starter'] },
        ],
      },
    ],
  },
  {
    type: 'retaining_wall',
    name: 'Cantilever Retaining Wall',
    label: 'Retaining Wall',
    icon: '🧱',
    description: 'Toe, heel base slab, stem vertical & horizontal distribution, haunch',
    defaultSubComponents: [
      {
        name: 'Wall Section 1 (Height 4.5m)',
        components: [
          { name: 'Base Raft (Heel & Toe)', memberType: 'Footing', grids: ['Toe Top Tension', 'Heel Bottom Tension'] },
          { name: 'Stem Wall', memberType: 'Retaining Wall', grids: ['Earth Face Main', 'Front Face Distribution'] },
          { name: 'Key / Shear Wall', memberType: 'Footing', grids: ['Sliding Key'] },
        ],
      },
    ],
  },
];

export const StructureManager: React.FC<StructureManagerProps> = ({
  structures,
  onUpdateStructures,
  bars,
  onAddBarForContext,
  selectedFilter,
  onSelectFilter,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [isAddingStructure, setIsAddingStructure] = useState(false);
  const [newStructureName, setNewStructureName] = useState('');
  const [newStructureType, setNewStructureType] = useState<StructureCategory>('drain');

  // Adding sub-component state
  const [addingSubCompParentId, setAddingSubCompParentId] = useState<string | null>(null);
  const [newSubCompName, setNewSubCompName] = useState('');

  // Adding component state
  const [addingCompParentId, setAddingCompParentId] = useState<string | null>(null); // structureId:subCompId
  const [newCompName, setNewCompName] = useState('');
  const [newCompMemberType, setNewCompMemberType] = useState<StructuralMemberType>('Beam');

  // Adding grid state
  const [addingGridParentId, setAddingGridParentId] = useState<string | null>(null);
  const [newGridName, setNewGridName] = useState('');

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Add a structure using a preset
  const handleAddPresetStructure = (preset: typeof STRUCTURE_PRESETS[0]) => {
    const newStruct: StructureNode = {
      id: `struct-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: preset.name,
      type: preset.type,
      description: preset.description,
      subComponents: preset.defaultSubComponents.map((sc, scIdx) => ({
        id: `subcomp-${Date.now()}-${scIdx}`,
        name: sc.name,
        components: sc.components.map((c, cIdx) => ({
          id: `comp-${Date.now()}-${scIdx}-${cIdx}`,
          name: c.name,
          memberType: c.memberType,
          grids: c.grids.map((g, gIdx) => ({
            id: `grid-${Date.now()}-${scIdx}-${cIdx}-${gIdx}`,
            name: g,
          })),
        })),
      })),
    };

    const updated = [...structures, newStruct];
    onUpdateStructures(updated);
    setExpandedNodes((prev) => ({ ...prev, [newStruct.id]: true }));
  };

  // Add custom structure
  const handleAddCustomStructure = () => {
    if (!newStructureName.trim()) return;
    const newStruct: StructureNode = {
      id: `struct-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newStructureName.trim(),
      type: newStructureType,
      subComponents: [],
    };
    onUpdateStructures([...structures, newStruct]);
    setNewStructureName('');
    setIsAddingStructure(false);
    setExpandedNodes((prev) => ({ ...prev, [newStruct.id]: true }));
  };

  // Add sub-component
  const handleAddSubComponent = (structureId: string) => {
    if (!newSubCompName.trim()) return;
    const updated = structures.map((st) => {
      if (st.id === structureId) {
        const newSub: SubComponentNode = {
          id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          name: newSubCompName.trim(),
          components: [],
        };
        return {
          ...st,
          subComponents: [...(st.subComponents || []), newSub],
        };
      }
      return st;
    });
    onUpdateStructures(updated);
    setNewSubCompName('');
    setAddingSubCompParentId(null);
    setExpandedNodes((prev) => ({ ...prev, [structureId]: true }));
  };

  // Add component
  const handleAddComponent = (structureId: string, subCompId: string) => {
    if (!newCompName.trim()) return;
    const updated = structures.map((st) => {
      if (st.id === structureId) {
        const updatedSubs = (st.subComponents || []).map((sc) => {
          if (sc.id === subCompId) {
            const newComp: ComponentNode = {
              id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              name: newCompName.trim(),
              memberType: newCompMemberType,
              grids: [],
            };
            return {
              ...sc,
              components: [...(sc.components || []), newComp],
            };
          }
          return sc;
        });
        return { ...st, subComponents: updatedSubs };
      }
      return st;
    });
    onUpdateStructures(updated);
    setNewCompName('');
    setAddingCompParentId(null);
    setExpandedNodes((prev) => ({ ...prev, [subCompId]: true }));
  };

  // Add grid
  const handleAddGrid = (structureId: string, subCompId: string, compId: string) => {
    if (!newGridName.trim()) return;
    const updated = structures.map((st) => {
      if (st.id === structureId) {
        const updatedSubs = (st.subComponents || []).map((sc) => {
          if (sc.id === subCompId) {
            const updatedComps = (sc.components || []).map((c) => {
              if (c.id === compId) {
                const newGrid: GridSectionNode = {
                  id: `grid-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                  name: newGridName.trim(),
                };
                return {
                  ...c,
                  grids: [...(c.grids || []), newGrid],
                };
              }
              return c;
            });
            return { ...sc, components: updatedComps };
          }
          return sc;
        });
        return { ...st, subComponents: updatedSubs };
      }
      return st;
    });
    onUpdateStructures(updated);
    setNewGridName('');
    setAddingGridParentId(null);
    setExpandedNodes((prev) => ({ ...prev, [compId]: true }));
  };

  // Delete structure
  const handleDeleteStructure = (structureId: string) => {
    if (confirm('Delete this structure? Any existing bars in this structure will remain in the schedule.')) {
      onUpdateStructures(structures.filter((s) => s.id !== structureId));
      if (selectedFilter.structureId === structureId) {
        onSelectFilter({});
      }
    }
  };

  // Delete component or sub-component
  const handleDeleteSubComponent = (structureId: string, subCompId: string) => {
    const updated = structures.map((st) => {
      if (st.id === structureId) {
        return {
          ...st,
          subComponents: (st.subComponents || []).filter((sc) => sc.id !== subCompId),
        };
      }
      return st;
    });
    onUpdateStructures(updated);
  };

  const handleDeleteComponent = (structureId: string, subCompId: string, compId: string) => {
    const updated = structures.map((st) => {
      if (st.id === structureId) {
        const updatedSubs = (st.subComponents || []).map((sc) => {
          if (sc.id === subCompId) {
            return {
              ...sc,
              components: (sc.components || []).filter((c) => c.id !== compId),
            };
          }
          return sc;
        });
        return { ...st, subComponents: updatedSubs };
      }
      return st;
    });
    onUpdateStructures(updated);
  };

  // Get bar count and weight for a structure or component
  const getStatsForStructure = (structName: string) => {
    const matching = bars.filter((b) => (b.structureName || '').toLowerCase() === structName.toLowerCase());
    const count = matching.length;
    const weightKg = matching.reduce((sum, b) => sum + b.totalWeight, 0);
    return { count, weightKg };
  };

  const getStatsForComponent = (structName: string, compName: string) => {
    const matching = bars.filter(
      (b) =>
        (b.structureName || '').toLowerCase() === structName.toLowerCase() &&
        ((b.component || b.member || '').toLowerCase() === compName.toLowerCase())
    );
    const count = matching.length;
    const weightKg = matching.reduce((sum, b) => sum + b.totalWeight, 0);
    return { count, weightKg };
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Project Structures & Components Breakdown
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
            {structures.length} {structures.length === 1 ? 'Structure' : 'Structures'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedFilter.structureId && (
            <button
              type="button"
              onClick={() => onSelectFilter({})}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3 text-rose-400" />
              <span>Clear Filter</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAddingStructure((prev) => !prev)}
            className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Add Structure</span>
          </button>
        </div>
      </div>

      {/* Add Structure Form or Preset Quick-Selector */}
      {isAddingStructure && (
        <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-900/90 border border-cyan-800/40 rounded-xl animate-in fade-in duration-200">
          <div className="text-xs font-bold text-cyan-300 mb-2">1-Click Civil Engineering Structure Presets:</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-3">
            {STRUCTURE_PRESETS.map((p) => (
              <button
                key={p.type}
                type="button"
                onClick={() => {
                  handleAddPresetStructure(p);
                  setIsAddingStructure(false);
                }}
                className="flex flex-col items-center text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-950/70 hover:bg-cyan-950/50 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group"
              >
                <span className="text-xl mb-1 group-hover:scale-110 transition-transform">{p.icon}</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-cyan-300">{p.label}</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">{p.name}</span>
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mb-1.5">Or define a custom structure:</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="e.g. Stormwater Drain Section 1, RCC Box Culvert 2-Cell, Tower A"
              value={newStructureName}
              onChange={(e) => setNewStructureName(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <select
              value={newStructureType}
              onChange={(e) => setNewStructureType(e.target.value as StructureCategory)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="drain">Drain</option>
              <option value="culvert">Culvert</option>
              <option value="building">Building</option>
              <option value="pavement">Pavement</option>
              <option value="bridge">Bridge</option>
              <option value="retaining_wall">Retaining Wall</option>
              <option value="water_tank">Water Tank / Sump</option>
              <option value="other">Other / General</option>
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddCustomStructure}
                className="px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded text-xs transition-colors cursor-pointer"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setIsAddingStructure(false)}
                className="px-2.5 py-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200 text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Structure Tree View */}
      {structures.length === 0 ? (
        <div className="py-6 text-center bg-slate-100 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          <Layers className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">No structures added to this project yet.</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-500 max-w-md mx-auto mt-1 mb-3">
            Add a civil structure (e.g. <b>Drain, Culvert, Building, Pavement, Abutment</b>) to organize your components, grids, and rebar marks.
          </p>
          <button
            type="button"
            onClick={() => setIsAddingStructure(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Add First Structure</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {structures.map((struct) => {
            const isExpanded = expandedNodes[struct.id] ?? true;
            const isSelected = selectedFilter.structureId === struct.id && !selectedFilter.componentId;
            const stats = getStatsForStructure(struct.name);

            return (
              <div
                key={struct.id}
                className={`border rounded-lg transition-all ${
                  isSelected
                    ? 'border-cyan-500/70 bg-cyan-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/40 hover:border-slate-300 hover:dark:border-slate-700'
                }`}
              >
                {/* Structure Row */}
                <div className="flex items-center justify-between p-2.5 gap-2 select-none">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleExpand(struct.id)}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200 cursor-pointer p-0.5"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    <div
                      onClick={() =>
                        onSelectFilter({
                          structureId: struct.id,
                          structureName: struct.name,
                        })
                      }
                      className="cursor-pointer flex items-center gap-2 flex-1 min-w-0"
                    >
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate hover:text-cyan-300">
                        {struct.name}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {struct.type}
                      </span>
                    </div>
                  </div>

                  {/* Stats & Actions */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                      {stats.count} {stats.count === 1 ? 'bar' : 'bars'}
                    </span>
                    {stats.weightKg > 0 && (
                      <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
                        {stats.weightKg.toFixed(1)} kg
                      </span>
                    )}

                    {onAddBarForContext && (
                      <button
                        type="button"
                        onClick={() =>
                          onAddBarForContext({
                            structureName: struct.name,
                          })
                        }
                        className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 px-2 py-1 rounded border border-cyan-800/50 transition-colors cursor-pointer"
                        title="Add bar to this structure"
                      >
                        + Bar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setAddingSubCompParentId(struct.id)}
                      className="text-[10px] text-indigo-300 hover:text-indigo-200 bg-indigo-950/40 px-2 py-1 rounded border border-indigo-800/40 transition-colors cursor-pointer"
                      title="Add sub-component/section (e.g. Barrel, Apron, Ground Floor)"
                    >
                      + Section
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteStructure(struct.id)}
                      className="text-slate-500 dark:text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                      title="Delete Structure"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub-component Add Form */}
                {addingSubCompParentId === struct.id && (
                  <div className="px-6 py-2 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 animate-in fade-in duration-150">
                    <input
                      type="text"
                      placeholder="Sub-component / Section name (e.g. Barrel Section, Inlet Apron, Floor 1, Ch 0+000-0+100)"
                      value={newSubCompName}
                      onChange={(e) => setNewSubCompName(e.target.value)}
                      className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSubComponent(struct.id)}
                      className="px-2.5 py-1 bg-indigo-500 text-white rounded text-xs font-semibold hover:bg-indigo-400 cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingSubCompParentId(null);
                        setNewSubCompName('');
                      }}
                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Children: Sub-components & Components */}
                {isExpanded && struct.subComponents && struct.subComponents.length > 0 && (
                  <div className="pl-6 pr-3 pb-2 pt-1 space-y-1.5 border-t border-slate-200 dark:border-slate-800/60">
                    {struct.subComponents.map((subComp) => {
                      const isSubExpanded = expandedNodes[subComp.id] ?? true;
                      const isSubSelected = selectedFilter.subComponentId === subComp.id;

                      return (
                        <div
                          key={subComp.id}
                          className={`rounded border text-xs ${
                            isSubSelected
                              ? 'border-indigo-500/60 bg-indigo-950/20'
                              : 'border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/40'
                          }`}
                        >
                          {/* Sub-component Header */}
                          <div className="flex items-center justify-between p-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleExpand(subComp.id)}
                                className="text-slate-500 dark:text-slate-500 hover:text-slate-700 hover:dark:text-slate-300 p-0.5 cursor-pointer"
                              >
                                {isSubExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <span
                                onClick={() =>
                                  onSelectFilter({
                                    structureId: struct.id,
                                    structureName: struct.name,
                                    subComponentId: subComp.id,
                                    subComponentName: subComp.name,
                                  })
                                }
                                className="font-medium text-slate-800 dark:text-slate-200 cursor-pointer hover:text-indigo-300 truncate"
                              >
                                {subComp.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setAddingCompParentId(`${struct.id}:${subComp.id}`)}
                                className="text-[10px] text-emerald-300 hover:text-emerald-200 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 cursor-pointer"
                                title="Add structural component (Beam, Column, Abutment, Slab, Wingwall, Apron, etc.)"
                              >
                                + Component
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteSubComponent(struct.id, subComp.id)}
                                className="text-slate-400 dark:text-slate-600 hover:text-rose-400 p-0.5 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Component Add Form */}
                          {addingCompParentId === `${struct.id}:${subComp.id}` && (
                            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-wrap animate-in fade-in duration-150">
                              <input
                                type="text"
                                placeholder="Component name (e.g. Abutment, Wingwall, Apron, Beam, Column, Slab, Drain Bed)"
                                value={newCompName}
                                onChange={(e) => setNewCompName(e.target.value)}
                                className="flex-1 min-w-[200px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                              />
                              <select
                                value={newCompMemberType}
                                onChange={(e) => setNewCompMemberType(e.target.value as StructuralMemberType)}
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-700 dark:text-slate-300"
                              >
                                <option value="Beam">Beam</option>
                                <option value="Column">Column</option>
                                <option value="Slab">Slab</option>
                                <option value="Footing">Footing / Raft</option>
                                <option value="Retaining Wall">Retaining Wall / Abutment / Wingwall</option>
                                <option value="Culvert">Culvert</option>
                                <option value="Staircase">Staircase</option>
                                <option value="Miscellaneous">Miscellaneous / Dowel / Tie</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleAddComponent(struct.id, subComp.id)}
                                className="px-2.5 py-1 bg-emerald-500 text-slate-950 rounded text-xs font-bold hover:bg-emerald-400 cursor-pointer"
                              >
                                Save Component
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingCompParentId(null);
                                  setNewCompName('');
                                }}
                                className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          {/* Components inside Sub-component */}
                          {isSubExpanded && subComp.components && subComp.components.length > 0 && (
                            <div className="pl-6 pr-2 pb-2 space-y-1 border-t border-slate-200 dark:border-slate-800/40 pt-1">
                              {subComp.components.map((comp) => {
                                const compStats = getStatsForComponent(struct.name, comp.name);
                                const isCompSelected = selectedFilter.componentId === comp.id;

                                return (
                                  <div
                                    key={comp.id}
                                    className={`flex items-center justify-between p-1.5 rounded text-xs ${
                                      isCompSelected
                                        ? 'bg-emerald-950/30 text-emerald-200 border border-emerald-500/40'
                                        : 'bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 hover:dark:bg-slate-900'
                                    }`}
                                  >
                                    <div
                                      onClick={() =>
                                        onSelectFilter({
                                          structureId: struct.id,
                                          structureName: struct.name,
                                          subComponentId: subComp.id,
                                          subComponentName: subComp.name,
                                          componentId: comp.id,
                                          componentName: comp.name,
                                        })
                                      }
                                      className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                      <span className="font-medium text-slate-800 dark:text-slate-200 hover:text-emerald-300 truncate">
                                        {comp.name}
                                      </span>
                                      <span className="text-[10px] text-slate-500 dark:text-slate-500">({comp.memberType})</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {compStats.count > 0 && (
                                        <span className="text-[10px] font-mono text-cyan-400">
                                          {compStats.count} bars ({compStats.weightKg.toFixed(1)} kg)
                                        </span>
                                      )}

                                      {onAddBarForContext && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onAddBarForContext({
                                              structureName: struct.name,
                                              subComponent: subComp.name,
                                              component: comp.name,
                                              member: comp.memberType,
                                            })
                                          }
                                          className="text-[10px] font-semibold px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded hover:bg-cyan-500/30 cursor-pointer"
                                          title={`Add bar mark specifically to ${comp.name}`}
                                        >
                                          + Add Bar
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteComponent(struct.id, subComp.id, comp.id)}
                                        className="text-slate-400 dark:text-slate-600 hover:text-rose-400 p-0.5 cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
