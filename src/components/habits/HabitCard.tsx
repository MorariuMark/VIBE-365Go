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
  FileText,
  Sliders,
  X,
  Target,
  Clock,
  Edit2,
  Star,
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
  onUpdateDailyRating?: (habitId: string, dateISO: string, rating: number) => void;
  onEditHabit?: (habitId: string, updatedHabit: Partial<Omit<Habit, 'id' | 'createdAt' | 'streak' | 'bestStreak' | 'history'>>) => void;
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
  onUpdateDailyRating,
  onEditHabit,
  onDeleteHabit,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showAddMetricModal, setShowAddMetricModal] = useState(false);
  const [showEditHabitModal, setShowEditHabitModal] = useState(false);

  // Edit Habit Modal State
  const [editTitle, setEditTitle] = useState(habit.title);
  const [editDescription, setEditDescription] = useState(habit.description || '');
  const [editCategory, setEditCategory] = useState<Habit['category']>(habit.category);
  const [editColor, setEditColor] = useState(habit.color || '#10b981');
  const [editDuration, setEditDuration] = useState(habit.duration || '');

  // New subtask state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showAddSubtask, setShowAddSubtask] = useState(false);

  // Goal edit state (allow string to permit empty deletion without forcing 1)
  const [goalCountInput, setGoalCountInput] = useState<string>(
    habit.targetCompletions ? String(habit.targetCompletions.count) : '4'
  );
  const [goalPeriod, setGoalPeriod] = useState<'day' | 'week' | 'month'>(
    habit.targetCompletions?.period || 'week'
  );

  // New metric field state
  const [metricLabel, setMetricLabel] = useState('');
  const [metricType, setMetricType] = useState<'number' | 'text' | 'boolean'>('number');
  const [metricUnit, setMetricUnit] = useState('');

  const isCompletedToday = Boolean(habit.history && habit.history[selectedDate]);
  const currentDailyNote = habit.dailyNotes?.[selectedDate] || '';
  const currentDailyMetrics = habit.dailyMetricValues?.[selectedDate] || {};
  const currentRating = habit.dailyRatings?.[selectedDate] || 0;

  const completedSubtasksCount = habit.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = habit.subtasks.length;
  const subtaskProgress =
    totalSubtasks > 0 ? Math.round((completedSubtasksCount / totalSubtasks) * 100) : 0;

  // Period completion count
  const currentPeriodCompletions = React.useMemo(() => {
    if (!habit.targetCompletions || !habit.history) return 0;
    const now = new Date(selectedDate);
    let count = 0;

    if (habit.targetCompletions.period === 'day') {
      if (habit.history[selectedDate]) count = 1;
    } else if (habit.targetCompletions.period === 'week') {
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
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#10b981', '#3b82f6', '#f59e0b'],
        });
      } catch {
        // Fallback
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
    const parsed = parseInt(goalCountInput, 10);
    const validCount = !isNaN(parsed) && parsed > 0 ? parsed : 1;
    onUpdateTargetCompletions(habit.id, {
      count: validCount,
      period: goalPeriod,
    });
    setGoalCountInput(String(validCount));
    setShowGoalModal(false);
  };

  const handleSaveEditHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    if (onEditHabit) {
      onEditHabit(habit.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        category: editCategory,
        color: editColor,
        duration: editDuration.trim() || undefined,
      });
    }
    setShowEditHabitModal(false);
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
      className={`rounded-2xl border transition-all duration-150 ${
        isCompletedToday
          ? 'bg-surface-1 border-emerald-500/40'
          : 'bg-surface-1 border-surface-border hover:border-surface-borderHover'
      }`}
    >
      <div className="p-4 sm:p-5 space-y-3.5">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Tactile Checkbox */}
            <button
              type="button"
              onClick={handleToggleHabit}
              className={`mt-0.5 flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center border active-press transition-all ${
                isCompletedToday
                  ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                  : 'bg-surface-2 border-surface-border hover:border-emerald-500/60 text-transparent'
              }`}
              title={isCompletedToday ? 'Mark incomplete' : 'Mark completed'}
            >
              <Check className="w-4 h-4 stroke-[3]" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4
                  className={`text-sm sm:text-base font-semibold tracking-tight transition-colors ${
                    isCompletedToday ? 'text-slate-300 line-through decoration-emerald-500/50' : 'text-white'
                  }`}
                >
                  {habit.title}
                </h4>

                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-2 text-slate-400 border border-surface-border capitalize">
                  {habit.category}
                </span>
              </div>

              {habit.description && (
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{habit.description}</p>
              )}
            </div>
          </div>

          {/* Badges & Actions */}
          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
            {/* Duration Badge */}
            {habit.duration && (
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface-2 border border-surface-border text-[11px] text-slate-300 font-medium tabular-nums"
                title={`Target duration: ${habit.duration}`}
              >
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>{habit.duration}</span>
              </div>
            )}

            {/* Target completions badge */}
            {habit.targetCompletions ? (
              <button
                type="button"
                onClick={() => {
                  setGoalCountInput(String(habit.targetCompletions?.count || 4));
                  setGoalPeriod(habit.targetCompletions?.period || 'week');
                  setShowGoalModal(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-2 border border-surface-border hover:border-surface-borderHover text-[11px] text-slate-300 font-medium tabular-nums transition"
                title="Edit daily/weekly/monthly frequency goal"
              >
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {currentPeriodCompletions}/{habit.targetCompletions.count} {habit.targetCompletions.period}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setGoalCountInput('4');
                  setGoalPeriod('week');
                  setShowGoalModal(true);
                }}
                className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-lg border border-surface-border hover:border-surface-borderHover"
              >
                + Goal
              </button>
            )}

            {/* Streak Badge */}
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold tabular-nums ${
                habit.streak > 0
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-surface-2 text-slate-400 border border-surface-border'
              }`}
              title={`Streak: ${habit.streak} days`}
            >
              <Flame className={`w-3.5 h-3.5 ${habit.streak > 0 ? 'text-amber-400' : 'text-slate-600'}`} />
              <span>{habit.streak}d</span>
            </div>

            {/* Edit Habit Button */}
            <button
              type="button"
              onClick={() => {
                setEditTitle(habit.title);
                setEditDescription(habit.description || '');
                setEditCategory(habit.category);
                setEditColor(habit.color || '#10b981');
                setEditDuration(habit.duration || '');
                setShowEditHabitModal(true);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-2 transition"
              title="Edit habit details"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            {/* Expand toggle */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-2 transition"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Delete button */}
            <button
              type="button"
              onClick={() => onDeleteHabit(habit.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Delete habit"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progress Bar for Subtasks */}
        {totalSubtasks > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-surface-2 h-1 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-200"
                style={{ width: `${subtaskProgress}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-medium tabular-nums whitespace-nowrap">
              {completedSubtasksCount} of {totalSubtasks} steps
            </span>
          </div>
        )}

        {/* Expandable Details Area */}
        {isExpanded && (
          <div className="pt-3 border-t border-surface-border space-y-3.5">
            {/* Subtasks Checklist */}
            {habit.subtasks.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-400 block mb-1">
                  Steps
                </span>
                {habit.subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between group py-1 px-2 rounded-lg hover:bg-surface-2 transition text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleSubtask(habit.id, sub.id)}
                      className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition ${
                          sub.completed
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'border-surface-border bg-surface-2'
                        }`}
                      >
                        {sub.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span
                        className={`truncate ${
                          sub.completed ? 'text-slate-400 line-through' : 'text-slate-200'
                        }`}
                      >
                        {sub.title}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteSubtask(habit.id, sub.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 transition ml-2"
                      title="Remove step"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Sub-Set Metrics Section */}
            <div className="bg-surface-2 border border-surface-border rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  <span>Sub-Set Metrics ({selectedDate})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddMetricModal(true)}
                  className="text-[11px] font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1"
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
                        className="bg-surface-1 border border-surface-border rounded-lg p-2 flex flex-col justify-between gap-1 group"
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-medium text-slate-400 truncate">
                            {m.label} {m.unit ? `(${m.unit})` : ''}
                          </label>
                          <button
                            type="button"
                            onClick={() => onDeleteMetricDefinition(habit.id, m.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 p-0.5"
                            title="Remove variable"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

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
                              className="w-full px-2 py-1 rounded bg-surface-2 border border-surface-border text-xs font-medium text-white tabular-nums focus:border-blue-500"
                            />
                            {m.unit && <span className="text-[10px] text-slate-400">{m.unit}</span>}
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
                            className="w-full px-2 py-1 rounded bg-surface-2 border border-surface-border text-xs text-white focus:border-blue-500"
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
                            className={`w-full py-1 px-2 rounded text-[11px] font-medium border transition flex items-center justify-center gap-1.5 ${
                              Boolean(currentVal)
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-surface-2 text-slate-400 border-surface-border'
                            }`}
                          >
                            <Check className={`w-3 h-3 ${Boolean(currentVal) ? 'opacity-100' : 'opacity-20'}`} />
                            <span>{Boolean(currentVal) ? 'Yes' : 'No'}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  No sub-set variables attached yet (e.g. minutes, words).
                </p>
              )}
            </div>

            {/* Daily Note & Session Rating Section */}
            <div className="space-y-2 pt-1 border-t border-surface-border/50">
              {/* Session Rating 1 to 5 */}
              <div className="flex items-center justify-between bg-surface-2/60 border border-surface-border rounded-xl px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-medium text-slate-300">Session Rating:</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        const newRating = currentRating === star ? 0 : star;
                        if (onUpdateDailyRating) {
                          onUpdateDailyRating(habit.id, selectedDate, newRating);
                        }
                      }}
                      className={`p-1 rounded-lg transition-transform active-press ${
                        star <= currentRating
                          ? 'text-amber-400 hover:scale-110'
                          : 'text-slate-600 hover:text-slate-400'
                      }`}
                      title={`Rate session ${star}/5`}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          star <= currentRating ? 'fill-amber-400' : 'fill-transparent'
                        }`}
                      />
                    </button>
                  ))}
                  {currentRating > 0 && (
                    <span className="text-[11px] font-semibold text-amber-400 ml-1.5 tabular-nums">
                      {currentRating}/5
                    </span>
                  )}
                </div>
              </div>

              {/* Daily Note */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setShowNotes(!showNotes)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Note for {selectedDate} {currentDailyNote ? '• (Logged)' : ''}</span>
                  {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showNotes && (
                  <textarea
                    rows={2}
                    value={currentDailyNote}
                    onChange={(e) => onUpdateDailyNotes(habit.id, selectedDate, e.target.value)}
                    placeholder="Add notes or thoughts for this habit today..."
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-surface-border text-xs text-white placeholder:text-slate-400 focus:border-emerald-500"
                  />
                )}
              </div>
            </div>

            {/* Add Subtask Trigger */}
            {showAddSubtask ? (
              <form onSubmit={handleAddSubtaskSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Step description..."
                  autoFocus
                  className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-surface-2 border border-surface-border text-white placeholder:text-slate-400 focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 transition"
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
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add step</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Goal Target Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-surface-1 border border-surface-border rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-2">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>Target Completions</span>
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
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Frequency</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setGoalPeriod('day');
                    }}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${
                      goalPeriod === 'day'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40'
                        : 'bg-surface-2 text-slate-400 border-surface-border'
                    }`}
                  >
                    Per Day
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGoalPeriod('week');
                    }}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${
                      goalPeriod === 'week'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40'
                        : 'bg-surface-2 text-slate-400 border-surface-border'
                    }`}
                  >
                    Per Week
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGoalPeriod('month');
                    }}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${
                      goalPeriod === 'month'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40'
                        : 'bg-surface-2 text-slate-400 border-surface-border'
                    }`}
                  >
                    Per Month
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">
                  Minimum count ({goalPeriod === 'day' ? 'times / day' : goalPeriod === 'week' ? 'days / week' : 'days / month'})
                </label>
                <input
                  type="number"
                  min="1"
                  max={goalPeriod === 'day' ? 24 : goalPeriod === 'week' ? 7 : 31}
                  value={goalCountInput}
                  onChange={(e) => setGoalCountInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-sm tabular-nums focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-surface-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Habit Modal */}
      {showEditHabitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface-1 border border-surface-border w-full max-w-lg rounded-2xl p-5 sm:p-6 shadow-2xl relative my-auto">
            <button
              type="button"
              onClick={() => setShowEditHabitModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-semibold text-white mb-4">Edit Habit</h3>

            <form onSubmit={handleSaveEditHabit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Habit Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Morning Mobility, Reading, Deep Work"
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-sm focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Short purpose or context..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-sm focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-sm focus:border-emerald-500"
                  >
                    <option value="fitness">Fitness</option>
                    <option value="mindset">Mindset</option>
                    <option value="productivity">Productivity</option>
                    <option value="health">Health</option>
                    <option value="learning">Learning</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Color Marker</label>
                  <div className="flex items-center gap-2 pt-1.5">
                    {['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`w-5 h-5 rounded-full transition-transform ${
                          editColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Target Duration Field */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Target Duration (e.g. 1 hour, 30 mins, 45 min)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Clock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      placeholder="e.g. 1 hour, 30 mins, 45 min"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-sm focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {['30 mins', '45 mins', '1 hour'].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setEditDuration(dur)}
                        className="px-2 py-1 rounded-lg bg-surface-2 border border-surface-border text-[10px] text-slate-300 hover:text-white hover:border-surface-borderHover whitespace-nowrap"
                      >
                        {dur}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setShowEditHabitModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 text-slate-300 text-xs font-medium hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition active-press"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Metric Variable Modal */}
      {showAddMetricModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-surface-1 border border-surface-border rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-2">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>Add Sub-Set Metric</span>
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
                <label className="block text-xs text-slate-400 mb-1 font-medium">Metric Label *</label>
                <input
                  type="text"
                  required
                  value={metricLabel}
                  onChange={(e) => setMetricLabel(e.target.value)}
                  placeholder="e.g. Minutes, Words, Pages"
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-xs focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Type</label>
                  <select
                    value={metricType}
                    onChange={(e) => setMetricType(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-xs focus:border-blue-500"
                  >
                    <option value="number">Number</option>
                    <option value="text">Text</option>
                    <option value="boolean">Yes/No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Unit</label>
                  <input
                    type="text"
                    value={metricUnit}
                    onChange={(e) => setMetricUnit(e.target.value)}
                    placeholder="min, words"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-xs focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMetricModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-surface-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
