'use client';

import React, { useState } from 'react';
import { Habit, HabitMetric, HabitTargetCompletions } from '@/types';
import { HabitCard } from './HabitCard';
import { formatDatePretty, getTodayISO } from '@/lib/utils';
import {
  Plus,
  CheckCircle2,
  Calendar,
  Sparkles,
  X,
  PlusCircle,
  Sliders,
  Target,
  Clock,
} from 'lucide-react';

interface HabitListProps {
  habits: Habit[];
  selectedDate: string;
  onSelectDate: (dateISO: string) => void;
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
  onCreateHabit: (newHabit: Omit<Habit, 'id' | 'createdAt' | 'streak' | 'bestStreak' | 'history'>) => void;
  onEditHabit?: (habitId: string, updatedHabit: Partial<Omit<Habit, 'id' | 'createdAt' | 'streak' | 'bestStreak' | 'history'>>) => void;
  onDeleteHabit: (habitId: string) => void;
}

export const HabitList: React.FC<HabitListProps> = ({
  habits,
  selectedDate,
  onSelectDate,
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
  onCreateHabit,
  onEditHabit,
  onDeleteHabit,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Habit Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Habit['category']>('fitness');
  const [color, setColor] = useState('#10b981');
  const [duration, setDuration] = useState('');
  const [subtasksInput, setSubtasksInput] = useState<string[]>(['']);

  // Target Completions (store as string to allow deleting freely)
  const [targetCountInput, setTargetCountInput] = useState<string>('4');
  const [targetPeriod, setTargetPeriod] = useState<'day' | 'week' | 'month'>('week');

  // Sub-Set Metric fields
  const [metricsInput, setMetricsInput] = useState<
    { label: string; type: 'number' | 'text' | 'boolean'; unit: string }[]
  >([{ label: 'Minutes', type: 'number', unit: 'min' }]);

  const today = getTodayISO();
  const isToday = selectedDate === today;

  // Filter habits
  const filteredHabits = habits.filter((h) => {
    if (activeCategory === 'all') return true;
    return h.category === activeCategory;
  });

  const completedTodayCount = habits.filter(
    (h) => h.history && h.history[selectedDate]
  ).length;
  const totalCount = habits.length;
  const completionPercentage =
    totalCount > 0 ? Math.round((completedTodayCount / totalCount) * 100) : 0;

  const handleAddSubtaskField = () => {
    setSubtasksInput([...subtasksInput, '']);
  };

  const handleSubtaskChange = (index: number, val: string) => {
    const updated = [...subtasksInput];
    updated[index] = val;
    setSubtasksInput(updated);
  };

  const handleRemoveSubtaskField = (index: number) => {
    setSubtasksInput(subtasksInput.filter((_, i) => i !== index));
  };

  const handleAddMetricField = () => {
    setMetricsInput([...metricsInput, { label: '', type: 'number', unit: '' }]);
  };

  const handleMetricChange = (index: number, field: string, val: any) => {
    const updated = [...metricsInput];
    updated[index] = { ...updated[index], [field]: val };
    setMetricsInput(updated);
  };

  const handleRemoveMetricField = (index: number) => {
    setMetricsInput(metricsInput.filter((_, i) => i !== index));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const validSubtasks = subtasksInput
      .filter((s) => s.trim().length > 0)
      .map((s, idx) => ({
        id: `sub_${Date.now()}_${idx}`,
        title: s.trim(),
        completed: false,
      }));

    const validMetrics: HabitMetric[] = metricsInput
      .filter((m) => m.label.trim().length > 0)
      .map((m, idx) => ({
        id: `m_${Date.now()}_${idx}`,
        label: m.label.trim(),
        type: m.type,
        unit: m.unit.trim() || undefined,
      }));

    const parsedCount = parseInt(targetCountInput, 10);
    const validCount = !isNaN(parsedCount) && parsedCount > 0 ? parsedCount : 1;

    onCreateHabit({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      color,
      duration: duration.trim() || undefined,
      subtasks: validSubtasks,
      targetCompletions: {
        count: validCount,
        period: targetPeriod,
      },
      metrics: validMetrics,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setCategory('fitness');
    setColor('#10b981');
    setDuration('');
    setSubtasksInput(['']);
    setTargetCountInput('4');
    setTargetPeriod('week');
    setMetricsInput([{ label: 'Minutes', type: 'number', unit: 'min' }]);
    setIsModalOpen(false);
  };

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'fitness', label: 'Fitness' },
    { id: 'mindset', label: 'Mindset' },
    { id: 'productivity', label: 'Productivity' },
    { id: 'health', label: 'Health' },
    { id: 'learning', label: 'Learning' },
  ];

  return (
    <div className="space-y-4">
      {/* Date Header Bar */}
      <div className="bg-surface-1 border border-surface-border rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-surface-2 border border-surface-border text-emerald-400 flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                {isToday ? 'Today’s Routine' : formatDatePretty(selectedDate)}
              </h3>
              {!isToday && (
                <button
                  type="button"
                  onClick={() => onSelectDate(today)}
                  className="text-[11px] px-2.5 py-0.5 rounded-full bg-surface-2 text-emerald-400 border border-surface-border hover:border-surface-borderHover transition"
                >
                  Return to Today
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
              {completedTodayCount} of {totalCount} completed ({completionPercentage}%)
            </p>
          </div>
        </div>

        {/* Date Selector & Action */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-2 border border-surface-border text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onSelectDate(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition active-press"
          >
            <Plus className="w-4 h-4" />
            <span>New Habit</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-surface-3 text-white border border-surface-borderHover'
                : 'bg-surface-1 text-slate-400 border border-surface-border hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Habit Cards List */}
      <div className="space-y-3">
        {filteredHabits.length > 0 ? (
          filteredHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              selectedDate={selectedDate}
              onToggleComplete={onToggleComplete}
              onToggleSubtask={onToggleSubtask}
              onAddSubtask={onAddSubtask}
              onDeleteSubtask={onDeleteSubtask}
              onUpdateMetricValue={onUpdateMetricValue}
              onAddMetricDefinition={onAddMetricDefinition}
              onDeleteMetricDefinition={onDeleteMetricDefinition}
              onUpdateTargetCompletions={onUpdateTargetCompletions}
              onUpdateDailyNotes={onUpdateDailyNotes}
              onUpdateDailyRating={onUpdateDailyRating}
              onEditHabit={onEditHabit}
              onDeleteHabit={onDeleteHabit}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-surface-1 border border-surface-border rounded-2xl p-6">
            <p className="text-slate-400 text-sm">No habits in this category.</p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Create a habit
            </button>
          </div>
        )}
      </div>

      {/* New Habit Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface-1 border border-surface-border w-full max-w-lg rounded-2xl p-5 sm:p-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-semibold text-white mb-4">Create New Habit</h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Habit Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Morning Mobility, Reading, Deep Work"
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-sm focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short purpose or context..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-sm focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-sm focus:border-emerald-500"
                  >
                    <option value="fitness">Fitness</option>
                    <option value="mindset">Mindset</option>
                    <option value="productivity">Productivity</option>
                    <option value="health">Health</option>
                    <option value="learning">Learning</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Color Marker</label>
                  <div className="flex items-center gap-2 pt-1.5">
                    {['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-5 h-5 rounded-full transition-transform ${
                          color === c ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
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
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g. 1 hour, 30 mins, 45 min"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-sm focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {['30 mins', '45 mins', '1 hour'].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setDuration(dur)}
                        className="px-2 py-1 rounded-lg bg-surface-2 border border-surface-border text-[10px] text-slate-300 hover:text-white hover:border-surface-borderHover whitespace-nowrap"
                      >
                        {dur}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Target Completions */}
              <div className="p-3 rounded-xl bg-surface-2 border border-surface-border space-y-2">
                <span className="text-xs font-medium text-slate-300 block">Frequency Target</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">
                      Min Times ({targetPeriod === 'day' ? 'times / day' : targetPeriod === 'week' ? 'days / week' : 'days / month'})
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={targetPeriod === 'day' ? 24 : targetPeriod === 'week' ? 7 : 31}
                      value={targetCountInput}
                      onChange={(e) => setTargetCountInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-1 border border-surface-border text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Period</label>
                    <select
                      value={targetPeriod}
                      onChange={(e) => setTargetPeriod(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-1 border border-surface-border text-xs text-white"
                    >
                      <option value="day">Per Day</option>
                      <option value="week">Per Week</option>
                      <option value="month">Per Month</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sub-Set Metrics */}
              <div className="p-3 rounded-xl bg-surface-2 border border-surface-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">Sub-Set Variables</span>
                  <button
                    type="button"
                    onClick={handleAddMetricField}
                    className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Variable</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {metricsInput.map((m, idx) => (
                    <div key={`m-field-${idx}`} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={m.label}
                        onChange={(e) => handleMetricChange(idx, 'label', e.target.value)}
                        placeholder="Label (e.g. Minutes, Words)"
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-1 border border-surface-border text-xs text-white"
                      />
                      <select
                        value={m.type}
                        onChange={(e) => handleMetricChange(idx, 'type', e.target.value)}
                        className="w-24 px-2 py-1.5 rounded-lg bg-surface-1 border border-surface-border text-xs text-white"
                      >
                        <option value="number">Number</option>
                        <option value="text">Text</option>
                        <option value="boolean">Yes/No</option>
                      </select>
                      <input
                        type="text"
                        value={m.unit}
                        onChange={(e) => handleMetricChange(idx, 'unit', e.target.value)}
                        placeholder="unit"
                        className="w-16 px-2 py-1.5 rounded-lg bg-surface-1 border border-surface-border text-xs text-white"
                      />
                      {metricsInput.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMetricField(idx)}
                          className="text-slate-400 hover:text-rose-400 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Subtasks */}
              <div className="pt-2 border-t border-surface-border">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-400">Steps Checklist</label>
                  <button
                    type="button"
                    onClick={handleAddSubtaskField}
                    className="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Step</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {subtasksInput.map((sub, idx) => (
                    <div key={`sub-in-${idx}`} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={sub}
                        onChange={(e) => handleSubtaskChange(idx, e.target.value)}
                        placeholder={`Step ${idx + 1}`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-surface-2 border border-surface-border text-white text-xs"
                      />
                      {subtasksInput.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtaskField(idx)}
                          className="text-slate-400 hover:text-rose-400 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 text-slate-300 text-xs font-medium hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition active-press"
                >
                  Create Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
