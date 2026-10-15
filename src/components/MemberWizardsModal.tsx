import React, { useState } from 'react';
import { BarItem, RebarDiameter, STANDARD_DIAMETERS } from '../types/bbs';
import {
  generateFootingBars,
  generateColumnBars,
  generateBeamBars,
  generateSlabBars,
  generateRetainingWallBars,
  generateCulvertBars,
  generateStaircaseBars,
} from '../utils/wizards';
import { X, Wand2, Plus, RefreshCw, CheckCircle2 } from 'lucide-react';

interface MemberWizardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (newBars: BarItem[], mode: 'append' | 'replace') => void;
}

type WizardTab = 'footing' | 'column' | 'beam' | 'slab' | 'wall' | 'culvert' | 'staircase';

export const MemberWizardsModal: React.FC<MemberWizardsModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<WizardTab>('footing');
  const [insertMode, setInsertMode] = useState<'append' | 'replace'>('append');

  // 1. Footing State
  const [ftgNum, setFtgNum] = useState(4);
  const [ftgL, setFtgL] = useState(2.0);
  const [ftgB, setFtgB] = useState(2.0);
  const [ftgD, setFtgD] = useState(0.45);
  const [ftgCover, setFtgCover] = useState(0.05);
  const [ftgMeshXDia, setFtgMeshXDia] = useState<RebarDiameter>(12);
  const [ftgMeshXSpacing, setFtgMeshXSpacing] = useState(0.15);
  const [ftgMeshYDia, setFtgMeshYDia] = useState<RebarDiameter>(12);
  const [ftgMeshYSpacing, setFtgMeshYSpacing] = useState(0.15);
  const [ftgIncPed, setFtgIncPed] = useState(true);
  const [ftgPedL, setFtgPedL] = useState(0.35);
  const [ftgPedB, setFtgPedB] = useState(0.35);
  const [ftgPedH, setFtgPedH] = useState(0.60);
  const [ftgStarterDia, setFtgStarterDia] = useState<RebarDiameter>(16);
  const [ftgNumStarter, setFtgNumStarter] = useState(8);

  // 2. Column State
  const [colNum, setColNum] = useState(4);
  const [colB, setColB] = useState(0.35);
  const [colD, setColD] = useState(0.35);
  const [colH, setColH] = useState(3.0);
  const [colCover, setColCover] = useState(0.04);
  const [colMainDia, setColMainDia] = useState<RebarDiameter>(16);
  const [colNumMain, setColNumMain] = useState(8);
  const [colLapLen, setColLapLen] = useState(0.80);
  const [colBottomHook, setColBottomHook] = useState(0.30);
  const [colTieDia, setColTieDia] = useState<RebarDiameter>(8);
  const [colConfineSpacing, setColConfineSpacing] = useState(0.10);
  const [colConfineZone, setColConfineZone] = useState(0.60);
  const [colMidSpacing, setColMidSpacing] = useState(0.175);
  const [colDiamond, setColDiamond] = useState(true);

  // 3. Beam State
  const [bmNum, setBmNum] = useState(2);
  const [bmSpan, setBmSpan] = useState(4.20);
  const [bmLeftW, setBmLeftW] = useState(0.35);
  const [bmRightW, setBmRightW] = useState(0.35);
  const [bmB, setBmB] = useState(0.25);
  const [bmD, setBmD] = useState(0.40);
  const [bmCover, setBmCover] = useState(0.025);
  const [bmBottomDia, setBmBottomDia] = useState<RebarDiameter>(16);
  const [bmNumBottom, setBmNumBottom] = useState(3);
  const [bmBottomExtraDia, setBmBottomExtraDia] = useState<RebarDiameter>(16);
  const [bmNumBottomExtra, setBmNumBottomExtra] = useState(2);
  const [bmTopHangerDia, setBmTopHangerDia] = useState<RebarDiameter>(12);
  const [bmNumTopHanger, setBmNumTopHanger] = useState(2);
  const [bmTopExtraLeftDia, setBmTopExtraLeftDia] = useState<RebarDiameter>(16);
  const [bmNumTopExtraLeft, setBmNumTopExtraLeft] = useState(2);
  const [bmTopExtraRightDia, setBmTopExtraRightDia] = useState<RebarDiameter>(16);
  const [bmNumTopExtraRight, setBmNumTopExtraRight] = useState(2);
  const [bmStirrupDia, setBmStirrupDia] = useState<RebarDiameter>(8);
  const [bmSupportSpacing, setBmSupportSpacing] = useState(0.10);
  const [bmMidSpacing, setBmMidSpacing] = useState(0.175);

  // 4. Slab State
  const [slbNum, setSlbNum] = useState(1);
  const [slbLx, setSlbLx] = useState(3.50);
  const [slbLy, setSlbLy] = useState(4.50);
  const [slbT, setSlbT] = useState(0.125);
  const [slbCover, setSlbCover] = useState(0.015);
  const [slbMainDia, setSlbMainDia] = useState<RebarDiameter>(10);
  const [slbMainSpacing, setSlbMainSpacing] = useState(0.15);
  const [slbCrank, setSlbCrank] = useState(true);
  const [slbDistDia, setSlbDistDia] = useState<RebarDiameter>(8);
  const [slbDistSpacing, setSlbDistSpacing] = useState(0.175);
  const [slbChairRate, setSlbChairRate] = useState(0.8);
  const [slbChairDia, setSlbChairDia] = useState<RebarDiameter>(10);

  // 5. Retaining Wall State
  const [wallNum, setWallNum] = useState(1);
  const [wallLen, setWallLen] = useState(6.00);
  const [wallH, setWallH] = useState(3.00);
  const [wallBaseT, setWallBaseT] = useState(0.35);
  const [wallBaseW, setWallBaseW] = useState(2.10);
  const [wallToe, setWallToe] = useState(0.60);
  const [wallHeel, setWallHeel] = useState(1.20);
  const [wallStemDia, setWallStemDia] = useState<RebarDiameter>(16);
  const [wallStemSpacing, setWallStemSpacing] = useState(0.15);
  const [wallDistDia, setWallDistDia] = useState<RebarDiameter>(10);
  const [wallDistSpacing, setWallDistSpacing] = useState(0.20);
  const [wallBaseDia, setWallBaseDia] = useState<RebarDiameter>(12);
  const [wallBaseSpacing, setWallBaseSpacing] = useState(0.15);

  // 6. Culvert State
  const [culType, setCulType] = useState<'Slab Culvert' | 'Single Cell Box Culvert'>('Slab Culvert');
  const [culNum, setCulNum] = useState(1);
  const [culLen, setCulLen] = useState(8.00);
  const [culSpan, setCulSpan] = useState(3.50);
  const [culH, setCulH] = useState(2.50);
  const [culDeckT, setCulDeckT] = useState(0.35);
  const [culInvT, setCulInvT] = useState(0.35);
  const [culWallT, setCulWallT] = useState(0.35);
  const [culHaunch, setCulHaunch] = useState(0.20);
  const [culMainDia, setCulMainDia] = useState<RebarDiameter>(20);
  const [culMainSpacing, setCulMainSpacing] = useState(0.125);
  const [culDistDia, setCulDistDia] = useState<RebarDiameter>(12);
  const [culDistSpacing, setCulDistSpacing] = useState(0.15);
  const [culHaunchDia, setCulHaunchDia] = useState<RebarDiameter>(12);

  // 7. Staircase State
  const [stairNum, setStairNum] = useState(2);
  const [stairSpan, setStairSpan] = useState(2.75);
  const [stairT, setStairT] = useState(0.15);
  const [stairR, setStairR] = useState(0.15);
  const [stairTr, setStairTr] = useState(0.25);
  const [stairL1, setStairL1] = useState(1.20);
  const [stairL2, setStairL2] = useState(1.20);
  const [stairW, setStairW] = useState(1.20);
  const [stairMainDia, setStairMainDia] = useState<RebarDiameter>(12);
  const [stairMainSpacing, setStairMainSpacing] = useState(0.15);
  const [stairDistDia, setStairDistDia] = useState<RebarDiameter>(8);
  const [stairDistSpacing, setStairDistSpacing] = useState(0.20);

  const handleGenerate = () => {
    let generated: BarItem[] = [];

    switch (activeTab) {
      case 'footing':
        generated = generateFootingBars({
          numFootings: ftgNum,
          lengthL: ftgL,
          widthB: ftgB,
          depthD: ftgD,
          clearCover: ftgCover,
          meshXDia: ftgMeshXDia,
          meshXSpacing: ftgMeshXSpacing,
          meshYDia: ftgMeshYDia,
          meshYSpacing: ftgMeshYSpacing,
          includePedestal: ftgIncPed,
          pedestalL: ftgPedL,
          pedestalB: ftgPedB,
          pedestalH: ftgPedH,
          starterBarDia: ftgStarterDia,
          numStarterBars: ftgNumStarter,
          starterLapMultiplier: 50,
          tieDia: 8,
          tieSpacing: 0.15,
        });
        break;

      case 'column':
        generated = generateColumnBars({
          numColumns: colNum,
          widthB: colB,
          depthD: colD,
          heightH: colH,
          clearCover: colCover,
          mainBarDia: colMainDia,
          numMainBars: colNumMain,
          lapLengthM: colLapLen,
          bottomHookM: colBottomHook,
          tieDia: colTieDia,
          confineSpacing: colConfineSpacing,
          confineZoneLength: colConfineZone,
          midSpacing: colMidSpacing,
          includeDiamondTie: colDiamond,
        });
        break;

      case 'beam':
        generated = generateBeamBars({
          numBeams: bmNum,
          clearSpan: bmSpan,
          leftSupportW: bmLeftW,
          rightSupportW: bmRightW,
          widthB: bmB,
          depthD: bmD,
          clearCover: bmCover,
          bottomMainDia: bmBottomDia,
          numBottomMain: bmNumBottom,
          bottomExtraDia: bmBottomExtraDia,
          numBottomExtra: bmNumBottomExtra,
          topHangerDia: bmTopHangerDia,
          numTopHanger: bmNumTopHanger,
          topExtraLeftDia: bmTopExtraLeftDia,
          numTopExtraLeft: bmNumTopExtraLeft,
          topExtraRightDia: bmTopExtraRightDia,
          numTopExtraRight: bmNumTopExtraRight,
          stirrupDia: bmStirrupDia,
          supportStirrupSpacing: bmSupportSpacing,
          midStirrupSpacing: bmMidSpacing,
        });
        break;

      case 'slab':
        generated = generateSlabBars({
          numSlabs: slbNum,
          shortSpanLx: slbLx,
          longSpanLy: slbLy,
          thicknessT: slbT,
          clearCover: slbCover,
          mainDia: slbMainDia,
          mainSpacing: slbMainSpacing,
          crankAlternate: slbCrank,
          distDia: slbDistDia,
          distSpacing: slbDistSpacing,
          chairBarsPerM2: slbChairRate,
          chairDia: slbChairDia,
        });
        break;

      case 'wall':
        generated = generateRetainingWallBars({
          numWalls: wallNum,
          wallLength: wallLen,
          stemHeightH: wallH,
          baseThickness: wallBaseT,
          baseWidth: wallBaseW,
          toeLength: wallToe,
          heelLength: wallHeel,
          stemCover: 0.04,
          stemMainDia: wallStemDia,
          stemMainSpacing: wallStemSpacing,
          stemDistDia: wallDistDia,
          stemDistSpacing: wallDistSpacing,
          baseBottomDia: wallBaseDia,
          baseBottomSpacing: wallBaseSpacing,
        });
        break;

      case 'culvert':
        generated = generateCulvertBars({
          type: culType,
          numCulverts: culNum,
          lengthM: culLen,
          clearSpan: culSpan,
          clearHeight: culH,
          deckThickness: culDeckT,
          invertThickness: culInvT,
          wallThickness: culWallT,
          haunchSize: culHaunch,
          cover: 0.04,
          mainDia: culMainDia,
          mainSpacing: culMainSpacing,
          distDia: culDistDia,
          distSpacing: culDistSpacing,
          haunchDia: culHaunchDia,
        });
        break;

      case 'staircase':
        generated = generateStaircaseBars({
          numFlights: stairNum,
          waistSpanL: stairSpan,
          waistThickness: stairT,
          riserR: stairR,
          treadT: stairTr,
          landing1L: stairL1,
          landing2L: stairL2,
          flightWidth: stairW,
          clearCover: 0.02,
          mainDia: stairMainDia,
          mainSpacing: stairMainSpacing,
          distDia: stairDistDia,
          distSpacing: stairDistSpacing,
        });
        break;
    }

    onGenerate(generated, insertMode);
    onClose();
  };

  const tabs: { key: WizardTab; label: string; sub: string }[] = [
    { key: 'footing', label: 'RCC Footing', sub: 'Mat & Pedestal' },
    { key: 'column', label: 'RCC Column', sub: 'Main & Ties' },
    { key: 'beam', label: 'RCC Beam', sub: 'Flexure & Shear' },
    { key: 'slab', label: 'RCC Slab', sub: '1-Way / 2-Way' },
    { key: 'wall', label: 'Retaining Wall', sub: 'Cantilever' },
    { key: 'culvert', label: 'Culvert', sub: 'Slab & Box' },
    { key: 'staircase', label: 'Staircase', sub: 'Dog-Legged' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Dynamic Structural Member BBS Wizard</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">Parametric rebar generation adhering to IS 456, SP 34, BS 8666 & IRC:112</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200 rounded-lg hover:bg-slate-200 hover:dark:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Selector Tabs */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800/80 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-start px-3.5 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200 hover:bg-slate-200 hover:dark:bg-slate-800/60 border border-transparent'
              }`}
            >
              <span className="font-semibold">{tab.label}</span>
              <span className="text-[10px] text-slate-600 dark:text-slate-400">{tab.sub}</span>
            </button>
          ))}
        </div>

        {/* Wizard Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* FOOTING WIZARD */}
          {activeTab === 'footing' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
                RCC Isolated / Combined Footing Reinforcement Generator
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">No. of Footings</label>
                  <input type="number" min="1" value={ftgNum} onChange={(e) => setFtgNum(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Length L (m)</label>
                  <input type="number" step="0.05" value={ftgL} onChange={(e) => setFtgL(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Width B (m)</label>
                  <input type="number" step="0.05" value={ftgB} onChange={(e) => setFtgB(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Depth D (m)</label>
                  <input type="number" step="0.05" value={ftgD} onChange={(e) => setFtgD(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Mesh X Dia (mm)</label>
                  <select value={ftgMeshXDia} onChange={(e) => setFtgMeshXDia(Number(e.target.value) as RebarDiameter)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono">
                    {STANDARD_DIAMETERS.map(d => <option key={d} value={d}>T{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Mesh X Spacing (m)</label>
                  <input type="number" step="0.025" value={ftgMeshXSpacing} onChange={(e) => setFtgMeshXSpacing(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Mesh Y Dia (mm)</label>
                  <select value={ftgMeshYDia} onChange={(e) => setFtgMeshYDia(Number(e.target.value) as RebarDiameter)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono">
                    {STANDARD_DIAMETERS.map(d => <option key={d} value={d}>T{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Mesh Y Spacing (m)</label>
                  <input type="number" step="0.025" value={ftgMeshYSpacing} onChange={(e) => setFtgMeshYSpacing(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
              </div>

              {/* Pedestal Starter Section */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded-lg border border-slate-200 dark:border-slate-800/80 space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={ftgIncPed} onChange={(e) => setFtgIncPed(e.target.checked)} className="rounded text-cyan-500" />
                  Include Column / Pedestal Starter Dowels & Lateral Ties
                </label>
                {ftgIncPed && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1">Starter Dia (mm)</label>
                      <select value={ftgStarterDia} onChange={(e) => setFtgStarterDia(Number(e.target.value) as RebarDiameter)} className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1.5 text-slate-800 dark:text-slate-200 font-mono">
                        {STANDARD_DIAMETERS.map(d => <option key={d} value={d}>T{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1">No. of Starter Bars</label>
                      <input type="number" min="4" value={ftgNumStarter} onChange={(e) => setFtgNumStarter(Number(e.target.value))} className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1.5 text-slate-800 dark:text-slate-200 font-mono text-right" />
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1">Pedestal Height (m)</label>
                      <input type="number" step="0.05" value={ftgPedH} onChange={(e) => setFtgPedH(Number(e.target.value))} className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1.5 text-slate-800 dark:text-slate-200 font-mono text-right" />
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1">Pedestal Size (m)</label>
                      <input type="number" step="0.05" value={ftgPedL} onChange={(e) => { setFtgPedL(Number(e.target.value)); setFtgPedB(Number(e.target.value)); }} className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1.5 text-slate-800 dark:text-slate-200 font-mono text-right" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* COLUMN WIZARD */}
          {activeTab === 'column' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
                RCC Column Detailing with Ductile Seismic Confinement (IS 13920 / BS 8666)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">No. of Columns</label>
                  <input type="number" min="1" value={colNum} onChange={(e) => setColNum(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Width B (m)</label>
                  <input type="number" step="0.05" value={colB} onChange={(e) => setColB(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Depth D (m)</label>
                  <input type="number" step="0.05" value={colD} onChange={(e) => setColD(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Height H (m)</label>
                  <input type="number" step="0.1" value={colH} onChange={(e) => setColH(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Main Bar Dia (mm)</label>
                  <select value={colMainDia} onChange={(e) => setColMainDia(Number(e.target.value) as RebarDiameter)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono">
                    {STANDARD_DIAMETERS.map(d => <option key={d} value={d}>T{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Total Main Bars</label>
                  <input type="number" min="4" value={colNumMain} onChange={(e) => setColNumMain(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Lap Splice Length (m)</label>
                  <input type="number" step="0.05" value={colLapLen} onChange={(e) => setColLapLen(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Base Hook (m)</label>
                  <input type="number" step="0.05" value={colBottomHook} onChange={(e) => setColBottomHook(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
              </div>

              {/* Confinement Ties Section */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded-lg border border-slate-200 dark:border-slate-800/80 space-y-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Lateral Ties & Confinement Spacing</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1">Tie Rebar Dia (mm)</label>
                    <select value={colTieDia} onChange={(e) => setColTieDia(Number(e.target.value) as RebarDiameter)} className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1.5 text-slate-800 dark:text-slate-200 font-mono">
                      {STANDARD_DIAMETERS.map(d => <option key={d} value={d}>T{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1">Zone A Spacing (m)</label>
                    <input type="number" step="0.025" value={colConfineSpacing} onChange={(e) => setColConfineSpacing(Number(e.target.value))} className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1.5 text-slate-800 dark:text-slate-200 font-mono text-right" />
                  </div>
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1">Zone B Mid Spacing (m)</label>
                    <input type="number" step="0.025" value={colMidSpacing} onChange={(e) => setColMidSpacing(Number(e.target.value))} className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1.5 text-slate-800 dark:text-slate-200 font-mono text-right" />
                  </div>
                  <div className="flex items-center pt-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <input type="checkbox" checked={colDiamond} onChange={(e) => setColDiamond(e.target.checked)} className="rounded text-cyan-500" />
                      Diamond Inner Tie
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BEAM WIZARD */}
          {activeTab === 'beam' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
                RCC Beam Detailing (Bottom Main, Curtailment, Hanger, Support Top Extra, Shear Ties)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">No. of Beams</label>
                  <input type="number" min="1" value={bmNum} onChange={(e) => setBmNum(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Clear Span (m)</label>
                  <input type="number" step="0.1" value={bmSpan} onChange={(e) => setBmSpan(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Beam Width b (m)</label>
                  <input type="number" step="0.05" value={bmB} onChange={(e) => setBmB(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Beam Depth D (m)</label>
                  <input type="number" step="0.05" value={bmD} onChange={(e) => setBmD(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Bottom Main Dia</label>
                  <select value={bmBottomDia} onChange={(e) => setBmBottomDia(Number(e.target.value) as RebarDiameter)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono">
                    {STANDARD_DIAMETERS.map(d => <option key={d} value={d}>T{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Bottom Main Count</label>
                  <input type="number" min="2" value={bmNumBottom} onChange={(e) => setBmNumBottom(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Top Hanger Dia</label>
                  <select value={bmTopHangerDia} onChange={(e) => setBmTopHangerDia(Number(e.target.value) as RebarDiameter)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono">
                    {STANDARD_DIAMETERS.map(d => <option key={d} value={d}>T{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Top Hanger Count</label>
                  <input type="number" min="2" value={bmNumTopHanger} onChange={(e) => setBmNumTopHanger(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
              </div>

              {/* Shear Stirrups and Support Extra */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded-lg border border-slate-200 dark:border-slate-800/80 space-y-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Support Extra Bars & Shear Stirrups</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1">Stirrup Dia</label>
                    <select value={bmStirrupDia} onChange={(e) => setBmStirrupDia(Number(e.target.value) as RebarDiameter)} className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1.5 text-slate-800 dark:text-slate-200 font-mono">
                      {STANDARD_DIAMETERS.map(d => <option key={d} value={d}>T{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1">End Spacing (m)</label>
                    <input type="number" step="0.025" value={bmSupportSpacing} onChange={(e) => setBmSupportSpacing(Number(e.target.value))} className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1.5 text-slate-800 dark:text-slate-200 font-mono text-right" />
                  </div>
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1">Mid Spacing (m)</label>
                    <input type="number" step="0.025" value={bmMidSpacing} onChange={(e) => setBmMidSpacing(Number(e.target.value))} className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1.5 text-slate-800 dark:text-slate-200 font-mono text-right" />
                  </div>
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1">Top Extra Bars (Support)</label>
                    <input type="number" min="0" value={bmNumTopExtraLeft} onChange={(e) => { setBmNumTopExtraLeft(Number(e.target.value)); setBmNumTopExtraRight(Number(e.target.value)); }} className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1.5 text-slate-800 dark:text-slate-200 font-mono text-right" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLAB WIZARD */}
          {activeTab === 'slab' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
                RCC Slab Reinforcement (Short/Long Spans, Cranked 45°, Distribution & Chair Stools)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">No. of Slabs</label>
                  <input type="number" min="1" value={slbNum} onChange={(e) => setSlbNum(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Short Span Lx (m)</label>
                  <input type="number" step="0.1" value={slbLx} onChange={(e) => setSlbLx(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Long Span Ly (m)</label>
                  <input type="number" step="0.1" value={slbLy} onChange={(e) => setSlbLy(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Thickness T (m)</label>
                  <input type="number" step="0.01" value={slbT} onChange={(e) => setSlbT(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Main Bar Dia (mm)</label>
                  <select value={slbMainDia} onChange={(e) => setSlbMainDia(Number(e.target.value) as RebarDiameter)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono">
                    {STANDARD_DIAMETERS.map(d => <option key={d} value={d}>T{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Main Spacing (m)</label>
                  <input type="number" step="0.025" value={slbMainSpacing} onChange={(e) => setSlbMainSpacing(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Dist Bar Dia (mm)</label>
                  <select value={slbDistDia} onChange={(e) => setSlbDistDia(Number(e.target.value) as RebarDiameter)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono">
                    {STANDARD_DIAMETERS.map(d => <option key={d} value={d}>T{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Dist Spacing (m)</label>
                  <input type="number" step="0.025" value={slbDistSpacing} onChange={(e) => setSlbDistSpacing(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
              </div>

              <div className="flex items-center gap-6 p-3 bg-slate-50 dark:bg-slate-950/70 rounded-lg border border-slate-200 dark:border-slate-800/80 text-xs">
                <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={slbCrank} onChange={(e) => setSlbCrank(e.target.checked)} className="rounded text-cyan-500" />
                  Alternate 45° Cranked Bars (Shape 41 at L/4)
                </label>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span>Chair Density:</span>
                  <input type="number" step="0.2" value={slbChairRate} onChange={(e) => setSlbChairRate(Number(e.target.value))} className="w-16 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1 text-slate-800 dark:text-slate-200 font-mono text-right" />
                  <span>nos/m²</span>
                </div>
              </div>
            </div>
          )}

          {/* RETAINING WALL WIZARD */}
          {activeTab === 'wall' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
                Cantilever Retaining Wall Generator (Stem Tension, Distribution & Base Slab)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Wall Length (m)</label>
                  <input type="number" step="0.5" value={wallLen} onChange={(e) => setWallLen(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Stem Height (m)</label>
                  <input type="number" step="0.2" value={wallH} onChange={(e) => setWallH(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Base Width (m)</label>
                  <input type="number" step="0.1" value={wallBaseW} onChange={(e) => setWallBaseW(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Base Thickness (m)</label>
                  <input type="number" step="0.05" value={wallBaseT} onChange={(e) => setWallBaseT(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Stem Main Dia</label>
                  <select value={wallStemDia} onChange={(e) => setWallStemDia(Number(e.target.value) as RebarDiameter)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono">
                    {STANDARD_DIAMETERS.map(d => <option key={d} value={d}>T{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Stem Main Spacing (m)</label>
                  <input type="number" step="0.025" value={wallStemSpacing} onChange={(e) => setWallStemSpacing(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Dist Bar Dia</label>
                  <select value={wallDistDia} onChange={(e) => setWallDistDia(Number(e.target.value) as RebarDiameter)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono">
                    {STANDARD_DIAMETERS.map(d => <option key={d} value={d}>T{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Base Bottom Dia</label>
                  <select value={wallBaseDia} onChange={(e) => setWallBaseDia(Number(e.target.value) as RebarDiameter)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono">
                    {STANDARD_DIAMETERS.map(d => <option key={d} value={d}>T{d}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* CULVERT WIZARD */}
          {activeTab === 'culvert' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
                RCC Slab & Box Culvert Rebar Generator (IRC:112 Highway Standard)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Culvert Type</label>
                  <select value={culType} onChange={(e) => setCulType(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-medium">
                    <option value="Slab Culvert">Slab Culvert</option>
                    <option value="Single Cell Box Culvert">Single Cell Box Culvert</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Clear Span (m)</label>
                  <input type="number" step="0.2" value={culSpan} onChange={(e) => setCulSpan(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Length / Road Width (m)</label>
                  <input type="number" step="0.5" value={culLen} onChange={(e) => setCulLen(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Deck Slab Thickness (m)</label>
                  <input type="number" step="0.05" value={culDeckT} onChange={(e) => setCulDeckT(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Main Deck Dia</label>
                  <select value={culMainDia} onChange={(e) => setCulMainDia(Number(e.target.value) as RebarDiameter)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono">
                    {STANDARD_DIAMETERS.map(d => <option key={d} value={d}>T{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Main Spacing (m)</label>
                  <input type="number" step="0.025" value={culMainSpacing} onChange={(e) => setCulMainSpacing(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Dist Rebar Dia</label>
                  <select value={culDistDia} onChange={(e) => setCulDistDia(Number(e.target.value) as RebarDiameter)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono">
                    {STANDARD_DIAMETERS.map(d => <option key={d} value={d}>T{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">45° Haunch Corner Dia</label>
                  <select value={culHaunchDia} onChange={(e) => setCulHaunchDia(Number(e.target.value) as RebarDiameter)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono">
                    {STANDARD_DIAMETERS.map(d => <option key={d} value={d}>T{d}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STAIRCASE WIZARD */}
          {activeTab === 'staircase' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
                RCC Dog-Legged Staircase Detailing (SP 34 Anti-Pop-Out Re-Entrant Joint Rule)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">No. of Flights</label>
                  <input type="number" min="1" value={stairNum} onChange={(e) => setStairNum(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Waist Span L (m)</label>
                  <input type="number" step="0.1" value={stairSpan} onChange={(e) => setStairSpan(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Flight Width (m)</label>
                  <input type="number" step="0.1" value={stairW} onChange={(e) => setStairW(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Waist Thickness (m)</label>
                  <input type="number" step="0.01" value={stairT} onChange={(e) => setStairT(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Riser R (m)</label>
                  <input type="number" step="0.01" value={stairR} onChange={(e) => setStairR(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Tread T (m)</label>
                  <input type="number" step="0.01" value={stairTr} onChange={(e) => setStairTr(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Landing 1 (m)</label>
                  <input type="number" step="0.1" value={stairL1} onChange={(e) => setStairL1(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Landing 2 (m)</label>
                  <input type="number" step="0.1" value={stairL2} onChange={(e) => setStairL2(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-slate-800 dark:text-slate-200 font-mono text-right" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            <span>Action Mode:</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                name="insertMode"
                value="append"
                checked={insertMode === 'append'}
                onChange={() => setInsertMode('append')}
                className="text-cyan-500"
              />
              Append to Schedule
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                name="insertMode"
                value="replace"
                checked={insertMode === 'replace'}
                onChange={() => setInsertMode('replace')}
                className="text-cyan-500"
              />
              Replace Entire Schedule
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 hover:dark:text-white bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 hover:dark:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              Generate Rebars Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
