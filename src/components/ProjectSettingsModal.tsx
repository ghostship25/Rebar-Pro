import React, { useState } from 'react';
import { ProjectMetadata, DesignStandard } from '../types/bbs';
import { X, Check, Settings2 } from 'lucide-react';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: ProjectMetadata;
  onSave: (metadata: ProjectMetadata) => void;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  onClose,
  metadata,
  onSave,
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<ProjectMetadata>({ ...metadata });

  const handleChange = (field: keyof ProjectMetadata, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Project & Engineering Specification</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">Configure consultant metadata, standard code rules, and procurement allowances</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200 rounded-lg hover:bg-slate-200 hover:dark:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Project Title</label>
            <input
              type="text"
              required
              value={formData.projectTitle}
              onChange={(e) => handleChange('projectTitle', e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Client / Employer Name</label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => handleChange('clientName', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Main Contractor</label>
              <input
                type="text"
                value={formData.contractorName}
                onChange={(e) => handleChange('contractorName', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Structural Engineer / Consultant</label>
              <input
                type="text"
                value={formData.structuralEngineer}
                onChange={(e) => handleChange('structuralEngineer', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Checked & Approved By</label>
              <input
                type="text"
                value={formData.checkedBy}
                onChange={(e) => handleChange('checkedBy', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Drawing Number</label>
              <input
                type="text"
                value={formData.drawingNumber}
                onChange={(e) => handleChange('drawingNumber', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Revision</label>
              <input
                type="text"
                value={formData.revision}
                onChange={(e) => handleChange('revision', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Design Standard Code</label>
              <select
                value={formData.standard}
                onChange={(e) => handleChange('standard', e.target.value as DesignStandard)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="IS 2502 / SP 34">IS 2502:1963 / SP 34</option>
                <option value="BS 8666:2020">BS 8666:2020</option>
                <option value="IRC:112">IRC:112 (Bridges & Culverts)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Site Wastage Allowance (%)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="20"
                value={formData.wastagePercent}
                onChange={(e) => handleChange('wastagePercent', Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-200 font-mono text-right focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Binding Wire (kg / MT)</label>
              <input
                type="number"
                step="0.5"
                min="5"
                max="20"
                value={formData.bindingWireRateKgPerMT}
                onChange={(e) => handleChange('bindingWireRateKgPerMT', Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-200 font-mono text-right focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 hover:dark:text-white bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 hover:dark:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-md"
          >
            <Check className="w-4 h-4" />
            Save Specifications
          </button>
        </div>
      </div>
    </div>
  );
};
