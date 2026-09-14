'use client';

import React, { useState } from 'react';
import { Habit, HabitMetric, HabitTargetCompletions } from '@/types';
import {
  Check,
  Flame,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  ListTodo,
  FileText,
  Sliders,
  Settings2,
  X,
  Target,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface HabitCardProps {
  habit: Habit;
  selectedDate: string;
  onToggleComplete: (habitId: string, dateISO: string) => void;
  onToggleSubtask: (habitId: string, subtaskId: string) => void;
  onAddSubtask: (habitId: string, subtaskTitle: string) => void;
  onDeleteSubtask: (habitId: string, subtaskId: string) => void;
  onUpdateMetricValue: (
    habitId: string,
    dateISO: string,
    metricId: string,
    value: string | number | boolean
  ) => void;
  onAddMetricDefinition: (habitId: string, metric: HabitMetric) => void;
  onDeleteMetricDefinition: (habitId: string, metricId: string) => void;
  onUpdateTargetCompletions: (habitId: string, target: HabitTargetCompletions) => void;
  onUpdateDailyNotes: (habitId: string, dateISO: string, notes: string) => void;
  onDeleteHabit: (habitId: string) => void;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  selectedDate,
  onToggleComplete,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onUpdateMetricValue,
  onAddMetricDefinition,
  onDeleteMetricDefinition,
  onUpdateTargetCompletions,
  onUpdateDailyNotes,
  onDeleteHabit,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showAddMetricModal, setShowAddMetricModal] = useState(false);

  // New subtask state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showAddSubtask, setShowAddSubtask] = useState(false);

  // Goal edit state
  const [goalCount, setGoalCount] = useState<number>(habit.targetCompletions?.count || 4);
  const [goalPeriod, setGoalPeriod] = useState<'week' | 'month'>(
    habit.targetCompletions?.period || 'week'
  );

  // New metric field state
  const [metricLabel, setMetricLabel] = useState('');
  const [metricType, setMetricType] = useState<'number' | 'text' | 'boolean'>('number');
  const [metricUnit, setMetricUnit] = useState('');

  const isCompletedToday = Boolean(habit.history && habit.history[selectedDate]);
  const currentDailyNote = habit.dailyNotes?.[selectedDate] || '';
  const currentDailyMetrics = habit.dailyMetricValues?.[selectedDate] || {};

  const completedSubtasksCount = habit.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = habit.subtasks.length;
  const subtaskProgress =
    totalSubtasks > 0 ? Math.round((completedSubtasksCount / totalSubtasks) * 100) : 0;

  // Calculate completions in current period
  const currentPeriodCompletions = React.useMemo(() => {
    if (!habit.targetCompletions || !habit.history) return 0;
    const now = new Date(selectedDate);
    let count = 0;

    if (habit.targetCompletions.period === 'week') {
      // Current week (Monday to Sunday)
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const iso = d.toISOString().split('T')[0];
        if (habit.history[iso]) count++;
      }
    } else {
      // Current month
      const year = now.getFullYear();
      const month = now.getMonth();
      Object.keys(habit.history).forEach((iso) => {
        const d = new Date(iso);
        if (d.getFullYear() === year && d.getMonth() === month && habit.history[iso]) {
          count++;
        }
      });
    }

    return count;
  }, [habit.history, habit.targetCompletions, selectedDate]);

  const handleToggleHabit = () => {
    if (!isCompletedToday) {
      try {
        confetti({
          particleCount: 45,
          spread: 55,
          origin: { y: 0.8 },
          colors: ['#10b981', '#34d399', '#06b6d4'],
        });
      } catch {
        // Safe confetti fallback
      }
    }
    onToggleComplete(habit.id, selectedDate);
  };

  const handleAddSubtaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    onAddSubtask(habit.id, newSubtaskTitle.trim());
    setNewSubtaskTitle('');
    setShowAddSubtask(false);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateTargetCompletions(habit.id, {
      count: goalCount,
      period: goalPeriod,
    });
    setShowGoalModal(false);
  };

  const handleCreateMetric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!metricLabel.trim()) return;
    onAddMetricDefinition(habit.id, {
      id: `m_${Date.now()}`,
      label: metricLabel.trim(),
      type: metricType,
      unit: metricUnit.trim() || undefined,
    });
    setMetricLabel('');
    setMetricUnit('');
    setShowAddMetricModal(false);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all duration-200 ${
        isCompletedToday
          ? 'bg-slate-900/90 border-emerald-500/40 shadow-[0_0_20px_-5px_rgba(16,185,129,0.15)]'
          : 'bg-slate-900/70 border-slate-800/90 hover:border-slate-700'
      }`}
    >
      {/* Left accent strip */}
      <div
        className="absolute top-0 left-0 bottom-0 w-1.5"
        style={{ backgroundColor: habit.color || '#10b981' }}
      />

      <div className="p-3.5 sm:p-5 pl-4.5 sm:pl-6 space-y-3.5">
        {/* Main Habit Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={handleToggleHabit}
              className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center border transition-all duration-200 ${
                isCompletedToday
                  ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md scale-105'
                  : 'bg-slate-800/90 border-slate-700 hover:border-emerald-500/60 text-transparent'
              }`}
              title={isCompletedToday ? 'Mark incomplete' : 'Mark completed'}
            >
              <Check className="w-4 h-4 stroke-[3]" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h4
                  className={`text-sm sm:text-base font-bold truncate transition-all ${
                    isCompletedToday ? 'text-slate-200 line-through decoration-emerald-500/60' : 'text-white'
                  }`}
                >
                  {habit.title}
                </h4>

                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
                  {habit.category}
                </span>
              </div>

              {habit.description && (
                <p className="text-xs text-slate-400 mt-0.5 truncate">{habit.description}</p>
              )}
            </div>
          </div>

          {/* Right badges & controls */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {/* Target completions badge (min per week or month) */}
            {habit.targetCompletions && (
              <button
                type="button"
                onClick={() => setShowGoalModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:border-emerald-500/50 text-[11px] text-slate-300 font-semibold transition"
                title="Click to edit weekly/monthly completion goal"
              >
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {currentPeriodCompletions}/{habit.targetCompletions.count} / {habit.targetCompletions.period}
                </span>
              </button>
            )}

            {!habit.targetCompletions && (
              <button
                type="button"
                onClick={() => setShowGoalModal(true)}
                className="text-[10px] text-slate-500 hover:text-emerald-400 px-2 py-1 rounded-lg border border-dashed border-slate-800 hover:border-slate-700"
              >
                + Set Goal
              </button>
            )}

            {/* Streak badge */}
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                habit.streak > 0
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/40'
              }`}
              title={`Current streak: ${habit.streak} days`}
            >
              <Flame className={`w-3.5 h-3.5 ${habit.streak > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-600'}`} />
              <span>{habit.streak}d</span>
            </div>

            {/* Subtask expand toggle */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Delete habit button */}
            <button
              type="button"
              onClick={() => onDeleteHabit(habit.id)}
              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Delete habit"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Subtask progress bar */}
        {totalSubtasks > 0 && (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${subtaskProgress}%` }}
              />
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium whitespace-nowrap">
              {completedSubtasksCount}/{totalSubtasks} steps
            </span>
          </div>
        )}

        {/* Expandable Details Container */}
        {isExpanded && (
          <div className="pt-2 border-t border-slate-800/60 space-y-3.5">
            {/* Subtasks checklist */}
            {habit.subtasks.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Checklist Steps
                </span>
                {habit.subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between group py-1 px-2 rounded-lg hover:bg-slate-800/40 transition text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleSubtask(habit.id, sub.id)}
                      className="flex items-center gap-2 text-left flex-1 min-w-0"
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center transition-all ${
                          sub.completed
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'border-slate-600 bg-slate-800/60'
                        }`}
                      >
                        {sub.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span
                        className={`truncate ${
                          sub.completed
                            ? 'text-slate-400 line-through decoration-slate-600'
                            : 'text-slate-300'
                        }`}
                      >
                        {sub.title}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteSubtask(habit.id, sub.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition ml-2"
                      title="Remove step"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Sub-Set Metrics Section (inputs: minutes, words, int/float/string/bool) */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Sub-Set Metric Variables (Day Log)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddMetricModal(true)}
                  className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Metric</span>
                </button>
              </div>

              {habit.metrics && habit.metrics.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {habit.metrics.map((m) => {
                    const currentVal = currentDailyMetrics[m.id];

                    return (
                      <div
                        key={m.id}
                        className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 flex flex-col justify-between gap-1 group relative"
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                            {m.label} {m.unit ? `(${m.unit})` : ''}
                          </label>
                          <button
                            type="button"
                            onClick={() => onDeleteMetricDefinition(habit.id, m.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-0.5"
                            title="Remove metric variable"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Dynamic Input based on metric type */}
                        {m.type === 'number' && (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="any"
                              value={currentVal !== undefined ? Number(currentVal) : ''}
                              onChange={(e) =>
                                onUpdateMetricValue(
                                  habit.id,
                                  selectedDate,
                                  m.id,
                                  e.target.value === '' ? '' : parseFloat(e.target.value)
                                )
                              }
                              placeholder="0"
                              className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                            />
                            {m.unit && <span className="text-[10px] text-slate-500">{m.unit}</span>}
                          </div>
                        )}

                        {m.type === 'text' && (
                          <input
                            type="text"
                            value={currentVal !== undefined ? String(currentVal) : ''}
                            onChange={(e) =>
                              onUpdateMetricValue(habit.id, selectedDate, m.id, e.target.value)
                            }
                            placeholder="Type value..."
                            className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                          />
                        )}

                        {m.type === 'boolean' && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateMetricValue(
                                habit.id,
                                selectedDate,
                                m.id,
                                !Boolean(currentVal)
                              )
                            }
                            className={`w-full py-1 px-2 rounded text-[11px] font-bold border transition flex items-center justify-center gap-1.5 ${
                              Boolean(currentVal)
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                : 'bg-slate-950 text-slate-400 border-slate-800'
                            }`}
                          >
                            <Check className={`w-3 h-3 ${Boolean(currentVal) ? 'opacity-100' : 'opacity-20'}`} />
                            <span>{Boolean(currentVal) ? 'Yes / Achieved' : 'No'}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">
                  No sub-set metrics defined. Add variables like minutes, words, amount, or boolean flags.
                </p>
              )}
            </div>

            {/* Daily Note Section */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowNotes(!showNotes)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Notes for {selectedDate} {currentDailyNote ? '• (Logged)' : ''}</span>
                  {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {showNotes && (
                <textarea
                  rows={2}
                  value={currentDailyNote}
                  onChange={(e) => onUpdateDailyNotes(habit.id, selectedDate, e.target.value)}
                  placeholder="Record insights, reflections, or context for this habit today..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              )}
            </div>

            {/* Quick add subtask trigger */}
            {showAddSubtask ? (
              <form onSubmit={handleAddSubtaskSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Enter subtask step..."
                  autoFocus
                  className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 transition"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSubtask(false)}
                  className="px-2 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddSubtask(true)}
                className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-emerald-400 transition font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add checklist step</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Goal Target Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>Minimum Completions Goal</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowGoalModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Frequency
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGoalPeriod('week')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      goalPeriod === 'week'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Per Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoalPeriod('month')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      goalPeriod === 'month'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Per Month
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Minimum Times ({goalPeriod === 'week' ? 'days / week' : 'days / month'})
                </label>
                <input
                  type="number"
                  min="1"
                  max={goalPeriod === 'week' ? 7 : 31}
                  value={goalCount}
                  onChange={(e) => setGoalCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Metric Variable Modal */}
      {showAddMetricModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Add Sub-Set Metric Variable</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddMetricModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMetric} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Metric Label *
                </label>
                <input
                  type="text"
                  required
                  value={metricLabel}
                  onChange={(e) => setMetricLabel(e.target.value)}
                  placeholder="e.g. Minutes, Words, Pages, Rating"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Value Type
                  </label>
                  <select
                    value={metricType}
                    onChange={(e) => setMetricType(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="number">Number (int/float)</option>
                    <option value="text">Text (string)</option>
                    <option value="boolean">Yes/No (boolean)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Unit (Optional)
                  </label>
                  <input
                    type="text"
                    value={metricUnit}
                    onChange={(e) => setMetricUnit(e.target.value)}
                    placeholder="min, words, ml"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMetricModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold"
                >
                  Add Variable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
