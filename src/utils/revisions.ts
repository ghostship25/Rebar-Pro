import { BarItem, RevisionSnapshot, MAX_REVISIONS } from '../types/bbs';

export interface BarChange {
  barMark: string;
  fields: string[];
  weightBefore: number;
  weightAfter: number;
}

export interface RevisionDiff {
  added: BarItem[];
  removed: BarItem[];
  changed: BarChange[];
  weightBefore: number;
  weightAfter: number;
}

const COMPARED: { key: keyof BarItem; label: string }[] = [
  { key: 'diameter', label: 'Dia' },
  { key: 'shapeCode', label: 'Shape' },
  { key: 'numElements', label: 'Elements' },
  { key: 'numBarsPerElement', label: 'Bars/elem' },
  { key: 'dimA', label: 'A' },
  { key: 'dimB', label: 'B' },
  { key: 'dimC', label: 'C' },
  { key: 'dimD', label: 'D' },
  { key: 'dimE', label: 'E' },
  { key: 'cuttingLength', label: 'Cut length' },
  { key: 'description', label: 'Description' },
];

const sum = (bars: BarItem[]) => bars.reduce((s, b) => s + b.totalWeight, 0);

/** Compares two schedules by bar id (falling back to bar mark for imported/re-created bars). */
export function diffBars(before: BarItem[], after: BarItem[]): RevisionDiff {
  const keyOf = (b: BarItem) => b.id;
  const beforeMap = new Map(before.map((b) => [keyOf(b), b]));
  const afterMap = new Map(after.map((b) => [keyOf(b), b]));

  const added: BarItem[] = [];
  const changed: BarChange[] = [];
  after.forEach((b) => {
    const old = beforeMap.get(keyOf(b));
    if (!old) {
      added.push(b);
      return;
    }
    const fields = COMPARED.filter(({ key }) => old[key] !== b[key]).map((c) => c.label);
    if (old.barMark !== b.barMark) fields.unshift('Bar mark');
    if (fields.length) {
      changed.push({ barMark: b.barMark, fields, weightBefore: old.totalWeight, weightAfter: b.totalWeight });
    }
  });
  const removed = before.filter((b) => !afterMap.has(keyOf(b)));

  return { added, removed, changed, weightBefore: sum(before), weightAfter: sum(after) };
}

export function createRevision(bars: BarItem[], label: string, note: string): RevisionSnapshot {
  return {
    id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    label: label.trim().slice(0, 40) || 'Revision',
    note: note.trim().slice(0, 500),
    createdAt: new Date().toISOString(),
    bars: JSON.parse(JSON.stringify(bars)) as BarItem[],
  };
}

/** Appends a snapshot, dropping the oldest when over the cap. */
export function appendRevision(existing: RevisionSnapshot[] | undefined, rev: RevisionSnapshot): RevisionSnapshot[] {
  return [...(existing || []), rev].slice(-MAX_REVISIONS);
}

/** Suggests the next label: R-00 -> R-01, R1 -> R2, otherwise "R<count>". */
export function nextRevisionLabel(current: string, count: number): string {
  const m = current.match(/^(.*?)(\d+)(\D*)$/);
  if (m) {
    const num = String(parseInt(m[2], 10) + 1).padStart(m[2].length, '0');
    return `${m[1]}${num}`.trim();
  }
  return `R${count + 1}`;
}
