'use client';

import React, { useState } from 'react';
import { Habit } from '@/types';
import { HabitCard } from './HabitCard';
import { formatDatePretty, getTodayISO } from '@/lib/utils';
import {
  Plus,
  Filter,
  CheckCircle2,
  Calendar,
  Sparkles,
  X,
  PlusCircle,
} from 'lucide-react';

interface HabitListProps {
  habits: Habit[];
  selectedDate: string;
  onSelectDate: (dateISO: string) => void;
  onToggleComplete: (habitId: string, dateISO: string) => void;
  onToggleSubtask: (habitId: string, subtaskId: string) => void;
  onAddSubtask: (habitId: string, subtaskTitle: string) => void;
  onDeleteSubtask: (habitId: string, subtaskId: string) => void;
  onCreateHabit: (newHabit: Omit<Habit, 'id' | 'createdAt' | 'streak' | 'bestStreak' | 'history'>) => void;
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
  onCreateHabit,
  onDeleteHabit,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Habit Modal State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Habit['category']>('fitness');
  const [color, setColor] = useState('#10b981');
  const [subtasksInput, setSubtasksInput] = useState<string[]>(['']);

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

    onCreateHabit({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      color,
      subtasks: validSubtasks,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setCategory('fitness');
    setColor('#10b981');
    setSubtasksInput(['']);
    setIsModalOpen(false);
  };

  const categories = [
    { id: 'all', label: 'All Habits' },
    { id: 'fitness', label: 'Fitness' },
    { id: 'mindset', label: 'Mindset' },
    { id: 'productivity', label: 'Productivity' },
    { id: 'health', label: 'Health' },
    { id: 'learning', label: 'Learning' },
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <div className="space-y-5">
      {/* Date & Completion Header Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white">
                {isToday ? 'Today’s Habits' : formatDatePretty(selectedDate)}
              </h3>
              {!isToday && (
                <button
                  type="button"
                  onClick={() => onSelectDate(today)}
                  className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 hover:bg-slate-700 transition"
                >
                  Jump to Today
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {completedTodayCount} of {totalCount} completed ({completionPercentage}%)
            </p>
          </div>
        </div>

        {/* Date input & New Habit trigger */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onSelectDate(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Habit</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Habit Cards Grid / List */}
      <div className="grid grid-cols-1 gap-3.5">
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
              onDeleteHabit={onDeleteHabit}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6">
            <p className="text-slate-400 text-sm">No habits found in this category.</p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Create your first habit
            </button>
          </div>
        )}
      </div>

      {/* New Habit Creation Modal */}
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
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Create New Habit</h3>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Habit Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Read 20 Pages, Cold Shower, Stretching"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Expand knowledge & focus daily"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Habit['category'])}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Badge Color</label>
                  <div className="flex items-center gap-2 pt-1">
                    {['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#f43f5e'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          color === c ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Subtasks builder */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Subtasks Checklist (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSubtaskField}
                    className="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Step</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {subtasksInput.map((sub, idx) => (
                    <div key={`sub-input-${idx}`} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={sub}
                        onChange={(e) => handleSubtaskChange(idx, e.target.value)}
                        placeholder={`Step ${idx + 1} (e.g. Drink 250ml water)`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                      />
                      {subtasksInput.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtaskField(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form buttons */}
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
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
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
