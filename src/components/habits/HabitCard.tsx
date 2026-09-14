'use client';

import React, { useState } from 'react';
import { Habit, HabitSubtask } from '@/types';
import {
  Check,
  Flame,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  ListTodo,
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
  onDeleteHabit: (habitId: string) => void;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  selectedDate,
  onToggleComplete,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onDeleteHabit,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showAddSubtask, setShowAddSubtask] = useState(false);

  const isCompletedToday = Boolean(habit.history && habit.history[selectedDate]);

  const completedSubtasksCount = habit.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = habit.subtasks.length;
  const subtaskProgress =
    totalSubtasks > 0 ? Math.round((completedSubtasksCount / totalSubtasks) * 100) : 0;

  const handleToggleHabit = () => {
    if (!isCompletedToday) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
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

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all duration-200 ${
        isCompletedToday
          ? 'bg-slate-900/90 border-emerald-500/40 shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)]'
          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Accent strip */}
      <div
        className="absolute top-0 left-0 bottom-0 w-1.5"
        style={{ backgroundColor: habit.color || '#10b981' }}
      />

      <div className="p-4 sm:p-5 pl-5 sm:pl-6">
        {/* Main Habit Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <button
              type="button"
              onClick={handleToggleHabit}
              className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center border transition-all duration-200 ${
                isCompletedToday
                  ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md scale-105'
                  : 'bg-slate-800/80 border-slate-700 hover:border-emerald-500/60 text-transparent'
              }`}
              title={isCompletedToday ? 'Mark incomplete' : 'Mark completed'}
            >
              <Check className="w-4 h-4 stroke-[3]" />
            </button>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4
                  className={`text-base font-semibold transition-all ${
                    isCompletedToday ? 'text-slate-200 line-through decoration-emerald-500/60' : 'text-white'
                  }`}
                >
                  {habit.title}
                </h4>

                {/* Category tag */}
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/50">
                  {habit.category}
                </span>
              </div>

              {habit.description && (
                <p className="text-xs text-slate-400 mt-1 line-clamp-1">{habit.description}</p>
              )}
            </div>
          </div>

          {/* Right badges & controls */}
          <div className="flex items-center gap-2">
            {/* Streak badge */}
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                habit.streak > 0
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/40'
              }`}
              title={`Current streak: ${habit.streak} days | Best: ${habit.bestStreak} days`}
            >
              <Flame className={`w-3.5 h-3.5 ${habit.streak > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-600'}`} />
              <span>{habit.streak}d</span>
            </div>

            {/* Subtask expand toggle */}
            {totalSubtasks > 0 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}

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
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${subtaskProgress}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {completedSubtasksCount}/{totalSubtasks} subtasks
            </span>
          </div>
        )}

        {/* Expandable Subtask List */}
        {isExpanded && (
          <div className="mt-3.5 pt-3 border-t border-slate-800/60 space-y-2">
            {habit.subtasks.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between group py-1 px-2 rounded-lg hover:bg-slate-800/50 transition text-xs"
              >
                <button
                  type="button"
                  onClick={() => onToggleSubtask(habit.id, sub.id)}
                  className="flex items-center gap-2 text-left flex-1"
                >
                  <div
                    className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all ${
                      sub.completed
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                        : 'border-slate-600 bg-slate-800/60'
                    }`}
                  >
                    {sub.completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span
                    className={
                      sub.completed
                        ? 'text-slate-400 line-through decoration-slate-600'
                        : 'text-slate-300'
                    }
                  >
                    {sub.title}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteSubtask(habit.id, sub.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition ml-2"
                  title="Remove subtask"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Add subtask inline input */}
            {showAddSubtask ? (
              <form onSubmit={handleAddSubtaskSubmit} className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Enter subtask name..."
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
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddSubtask(true)}
                className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-emerald-400 transition font-medium mt-1 pt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add subtask</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
