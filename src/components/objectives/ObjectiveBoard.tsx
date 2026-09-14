'use client';

import React, { useState } from 'react';
import { Objective, ObjectiveTimeframe } from '@/types';
import {
  Target,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  X,
  TrendingUp,
  Award,
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
  const [category, setCategory] = useState('Gym');
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
          particleCount: 60,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#38bdf8', '#818cf8', '#34d399'],
        });
      } catch {
        // Confetti fallback
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

    // Reset
    setTitle('');
    setTargetValue('');
    setUnit('');
    setNotes('');
    setIsModalOpen(false);
  };

  const timeframes: { id: ObjectiveTimeframe; label: string; sub: string }[] = [
    { id: 'daily', label: 'Daily', sub: 'Today’s Targets' },
    { id: 'weekly', label: 'Weekly', sub: '7-Day Sprints' },
    { id: 'monthly', label: 'Monthly', sub: '30-Day Milestones' },
    { id: 'quarterly', label: 'Quarterly', sub: 'Macro Objectives' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Objective Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide">
              Strategic Objectives
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-horizon target tracking: Daily, Weekly, Monthly & Quarterly
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="text-right">
            <div className="text-xs text-slate-400">
              Completed: <span className="font-bold text-white">{completedCount}/{totalCount}</span>
            </div>
            <div className="text-xs font-bold text-cyan-400">{overallRate}% Rate</div>
          </div>

          <button
            type="button"
            onClick={() => {
              setTimeframe(selectedTimeframe);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Objective</span>
          </button>
        </div>
      </div>

      {/* Timeframe Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {timeframes.map((tf) => (
          <button
            key={tf.id}
            type="button"
            onClick={() => setSelectedTimeframe(tf.id)}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              selectedTimeframe === tf.id
                ? 'bg-gradient-to-br from-cyan-950/60 to-slate-900 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-sm font-bold ${
                  selectedTimeframe === tf.id ? 'text-cyan-400' : 'text-slate-300'
                }`}
              >
                {tf.label}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
                {objectives.filter((o) => o.timeframe === tf.id).length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{tf.sub}</p>
          </button>
        ))}
      </div>

      {/* Objectives List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredObjectives.length > 0 ? (
          filteredObjectives.map((obj) => (
            <div
              key={obj.id}
              className={`p-5 rounded-2xl border transition-all duration-200 relative overflow-hidden ${
                obj.completed
                  ? 'bg-slate-900/90 border-cyan-500/40 shadow-md'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggle(obj.id, obj.completed)}
                    className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                      obj.completed
                        ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                        : 'bg-slate-800 border-slate-700 hover:border-cyan-500/60 text-transparent'
                    }`}
                    title={obj.completed ? 'Mark incomplete' : 'Mark completed'}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700/60">
                        {obj.category}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Due {obj.dueDate}
                      </span>
                    </div>

                    <h4
                      className={`text-base font-semibold mt-1.5 leading-snug ${
                        obj.completed ? 'text-slate-300 line-through decoration-cyan-500/60' : 'text-white'
                      }`}
                    >
                      {obj.title}
                    </h4>

                    {obj.notes && (
                      <p className="text-xs text-slate-400 mt-1">{obj.notes}</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteObjective(obj.id)}
                  className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Delete objective"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Slider / Bar */}
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Progress</span>
                  <div className="flex items-center gap-2">
                    {obj.targetValue !== undefined && (
                      <span className="text-slate-400">
                        {obj.currentValue || 0} / {obj.targetValue} {obj.unit || ''}
                      </span>
                    )}
                    <span className="font-bold text-cyan-400">{obj.progress}%</span>
                  </div>
                </div>

                <div className="relative flex items-center">
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
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 text-center py-12 bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6">
            <Target className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">
              No {selectedTimeframe} objectives set yet.
            </p>
            <button
              type="button"
              onClick={() => {
                setTimeframe(selectedTimeframe);
                setIsModalOpen(true);
              }}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Set a {selectedTimeframe} goal
            </button>
          </div>
        )}
      </div>

      {/* New Objective Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-bold text-white">New Objective</h3>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Objective Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Bench Press 100kg x 12, Run 10km, Read 4 Books"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Timeframe
                  </label>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value as ObjectiveTimeframe)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Gym, Career, Health"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target Value
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="100"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="kg, reps, L, days"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes & Strategy (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key milestones or execution plan..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-500/20"
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
