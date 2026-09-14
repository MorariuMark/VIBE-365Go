'use client';

import React, { useState } from 'react';
import { Objective, ObjectiveTimeframe } from '@/types';
import {
  Target,
  Plus,
  Clock,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ObjectiveBoardProps {
  objectives: Objective[];
  onToggleObjective: (objectiveId: string) => void;
  onUpdateProgress: (objectiveId: string, progress: number, currentValue?: number) => void;
  onCreateObjective: (
    newObjective: Omit<Objective, 'id' | 'createdAt' | 'completed' | 'progress'>
  ) => void;
  onDeleteObjective: (objectiveId: string) => void;
}

export const ObjectiveBoard: React.FC<ObjectiveBoardProps> = ({
  objectives,
  onToggleObjective,
  onUpdateProgress,
  onCreateObjective,
  onDeleteObjective,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<ObjectiveTimeframe>('daily');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Objective form state
  const [title, setTitle] = useState('');
  const [timeframe, setTimeframe] = useState<ObjectiveTimeframe>('daily');
  const [category, setCategory] = useState('Fitness');
  const [targetValue, setTargetValue] = useState<string>('');
  const [unit, setUnit] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);

  const filteredObjectives = objectives.filter((o) => o.timeframe === selectedTimeframe);
  const completedCount = filteredObjectives.filter((o) => o.completed).length;
  const totalCount = filteredObjectives.length;
  const overallRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggle = (id: string, currentlyCompleted: boolean) => {
    if (!currentlyCompleted) {
      try {
        confetti({
          particleCount: 45,
          spread: 65,
          origin: { y: 0.7 },
          colors: ['#3b82f6', '#10b981', '#f59e0b'],
        });
      } catch {
        // Fallback
      }
    }
    onToggleObjective(id);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreateObjective({
      title: title.trim(),
      timeframe,
      category: category.trim() || 'General',
      dueDate,
      targetValue: targetValue ? Number(targetValue) : undefined,
      currentValue: targetValue ? 0 : undefined,
      unit: unit.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setTitle('');
    setTargetValue('');
    setUnit('');
    setNotes('');
    setIsModalOpen(false);
  };

  const timeframes: { id: ObjectiveTimeframe; label: string; sub: string }[] = [
    { id: 'daily', label: 'Daily', sub: 'Today' },
    { id: 'weekly', label: 'Weekly', sub: '7-Day Sprints' },
    { id: 'monthly', label: 'Monthly', sub: '30-Day Targets' },
    { id: 'quarterly', label: 'Quarterly', sub: 'Macro Horizons' },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Header */}
      <div className="bg-surface-1 border border-surface-border rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-surface-2 border border-surface-border text-blue-400 flex-shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
              Strategic Objectives
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-horizon target tracking across daily, weekly, monthly, and quarterly horizons
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="text-right text-xs tabular-nums">
            <span className="text-slate-400">Achieved: </span>
            <span className="font-semibold text-white">{completedCount}/{totalCount}</span>
            <span className="text-blue-400 font-semibold ml-1.5">({overallRate}%)</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setTimeframe(selectedTimeframe);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition active-press"
          >
            <Plus className="w-4 h-4" />
            <span>New Objective</span>
          </button>
        </div>
      </div>

      {/* Timeframe Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {timeframes.map((tf) => (
          <button
            key={tf.id}
            type="button"
            onClick={() => setSelectedTimeframe(tf.id)}
            className={`p-3 rounded-xl border text-left transition-all active-press ${
              selectedTimeframe === tf.id
                ? 'bg-surface-2 border-blue-500/60 shadow-sm'
                : 'bg-surface-1 border-surface-border hover:border-surface-borderHover'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-semibold ${
                  selectedTimeframe === tf.id ? 'text-blue-400' : 'text-slate-300'
                }`}
              >
                {tf.label}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-3 text-slate-300 font-semibold tabular-nums">
                {objectives.filter((o) => o.timeframe === tf.id).length}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">{tf.sub}</p>
          </button>
        ))}
      </div>

      {/* Objectives Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {filteredObjectives.length > 0 ? (
          filteredObjectives.map((obj) => (
            <div
              key={obj.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                obj.completed
                  ? 'bg-surface-1 border-blue-500/30'
                  : 'bg-surface-1 border-surface-border hover:border-surface-borderHover'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(obj.id, obj.completed)}
                    className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center border transition-all active-press ${
                      obj.completed
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-surface-2 border-surface-border text-transparent hover:border-blue-500/50'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-2 text-blue-400 border border-surface-border">
                        {obj.category}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 tabular-nums">
                        <Clock className="w-3 h-3" /> Due {obj.dueDate}
                      </span>
                    </div>

                    <h4
                      className={`text-sm sm:text-base font-semibold mt-1.5 leading-snug tracking-tight ${
                        obj.completed ? 'text-slate-400 line-through' : 'text-white'
                      }`}
                    >
                      {obj.title}
                    </h4>

                    {obj.notes && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{obj.notes}</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteObjective(obj.id)}
                  className="p-1 text-slate-400 hover:text-rose-400 transition"
                  title="Delete objective"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Progress Slider */}
              <div className="mt-3.5 pt-3 border-t border-surface-border">
                <div className="flex items-center justify-between text-xs mb-1.5 tabular-nums">
                  <span className="text-slate-400">Progress</span>
                  <div className="flex items-center gap-2">
                    {obj.targetValue !== undefined && (
                      <span className="text-slate-400">
                        {obj.currentValue || 0} / {obj.targetValue} {obj.unit || ''}
                      </span>
                    )}
                    <span className="font-semibold text-blue-400">{obj.progress}%</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={obj.progress}
                  onChange={(e) => {
                    const newProg = Number(e.target.value);
                    const newCurr =
                      obj.targetValue !== undefined
                        ? Math.round((newProg / 100) * obj.targetValue * 10) / 10
                        : undefined;
                    onUpdateProgress(obj.id, newProg, newCurr);
                  }}
                  className="w-full h-1.5 bg-surface-2 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 text-center py-12 bg-surface-1 border border-surface-border rounded-2xl p-6">
            <Target className="w-6 h-6 text-slate-500 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No {selectedTimeframe} objectives set.</p>
            <button
              type="button"
              onClick={() => {
                setTimeframe(selectedTimeframe);
                setIsModalOpen(true);
              }}
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Set a {selectedTimeframe} goal
            </button>
          </div>
        )}
      </div>

      {/* New Objective Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface-1 border border-surface-border w-full max-w-md rounded-2xl shadow-xl p-5 sm:p-6 relative my-auto">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-semibold text-white mb-4">New Objective</h3>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Bench 100kg x 12, Run 10k, Read 4 Books"
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-xs focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Timeframe</label>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value as ObjectiveTimeframe)}
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-xs focus:border-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Fitness, Focus, Life"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-xs focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Target</label>
                  <input
                    type="number"
                    step="any"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="100"
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-xs focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="kg, L, days"
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-xs focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-xs focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Strategy, steps..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-xs focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-surface-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition active-press"
                >
                  Save Objective
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
