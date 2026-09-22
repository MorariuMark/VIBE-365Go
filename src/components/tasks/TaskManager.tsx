'use client';

import React, { useState } from 'react';
import { TaskItem, TaskPriority } from '@/types';
import { getTodayISO, formatDatePretty } from '@/lib/utils';
import {
  CheckSquare,
  Plus,
  Trash2,
  RotateCcw,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  Flag,
  History,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TaskManagerProps {
  tasks: TaskItem[];
  completedTasks: TaskItem[];
  onAddTask: (task: TaskItem) => void;
  onCompleteTask: (taskId: string) => void;
  onDeleteTask: (taskId: string, fromHistory?: boolean) => void;
  onRestoreTask: (taskId: string) => void;
  onClearCompletedTasks: () => void;
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  tasks,
  completedTasks,
  onAddTask,
  onCompleteTask,
  onDeleteTask,
  onRestoreTask,
  onClearCompletedTasks,
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [newTitle, setNewTitle] = useState('');
  const [newDeadline, setNewDeadline] = useState(getTodayISO());
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newNotes, setNewNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const todayISO = getTodayISO();

  // Create Task Handler
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: TaskItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newTitle.trim(),
      deadline: newDeadline || todayISO,
      completed: false,
      createdAt: new Date().toISOString(),
      priority: newPriority,
      notes: newNotes.trim() || undefined,
    };

    onAddTask(newTask);
    setNewTitle('');
    setNewNotes('');
    setIsAdding(false);
  };

  // Complete Task with subtle celebration
  const handleCheck = (taskId: string) => {
    confetti({
      particleCount: 28,
      spread: 45,
      origin: { y: 0.85 },
      colors: ['#10b981', '#38bdf8', '#fbbf24'],
    });
    onCompleteTask(taskId);
  };

  // Filter Active Tasks
  const filteredActive = (tasks || []).filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q);
  });

  const overdueTasks = filteredActive.filter((t) => t.deadline < todayISO);
  const todayTasks = filteredActive.filter((t) => t.deadline === todayISO);
  const upcomingTasks = filteredActive.filter((t) => t.deadline > todayISO);

  // Filter Completed History
  const filteredHistory = (completedTasks || []).filter((t) => {
    if (!searchQuery.trim()) return true;
    return t.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Card */}
      <div className="athletic-card rounded-2xl p-4 sm:p-6 border border-[#1b2234] bg-[#0a0d14] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-sm">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight font-sans">
                TACTICAL TASK LEDGER
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/70 text-cyan-400 border border-cyan-800/40">
                {(tasks || []).length} ACTIVE // {(completedTasks || []).length} ARCHIVED
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Execute high-priority missions with strict deadlines. Completed tasks automatically archive to history.
            </p>
          </div>
        </div>

        {/* View Switcher & New Task Toggle */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <div className="flex items-center bg-[#10141e] p-1 rounded-xl border border-[#1c2336]">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'active'
                  ? 'bg-[#1a2133] text-white border border-[#2e3752] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active ({(tasks || []).length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-[#1a2133] text-white border border-[#2e3752] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>History ({(completedTasks || []).length})</span>
            </button>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-sm active-press flex-shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Add Task</span>
          </button>
        </div>
      </div>

      {/* Add Task Quick Expand Console */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="athletic-card rounded-2xl p-4 sm:p-5 border border-emerald-500/40 bg-[#0d121c] space-y-4 shadow-xl animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>New Deadline Task Protocol</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-slate-500 hover:text-slate-300 font-mono"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Task Directive / Action
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Complete high-protein meal prep for the week..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-[#080b12] border border-[#1e263a] rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Deadline Date
              </label>
              <input
                type="date"
                required
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="w-full bg-[#080b12] border border-[#1e263a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Priority Tier
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-[#080b12] p-1 rounded-xl border border-[#1e263a]">
                {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewPriority(p)}
                    className={`py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                      newPriority === p
                        ? p === 'high'
                          ? 'bg-rose-950 text-rose-300 border border-rose-700/60'
                          : p === 'medium'
                          ? 'bg-amber-950 text-amber-300 border border-amber-700/60'
                          : 'bg-slate-800 text-slate-300 border border-slate-600'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Tactical Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="Optional details, links, or sub-context..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full bg-[#080b12] border border-[#1e263a] rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-[#121622] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-sm active-press"
            >
              Commit Task
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      {(tasks.length > 3 || completedTasks.length > 3) && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter tasks by directive or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d1017] border border-[#1b2234] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/70"
          />
        </div>
      )}

      {/* TAB 1: ACTIVE TASKS */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          {filteredActive.length === 0 && (
            <div className="p-12 text-center rounded-2xl border border-dashed border-[#1e2638] bg-[#090c13] space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white font-mono">ALL DIRECTIVES CLEARED</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No active tasks pending. Click <strong>Add Task</strong> above to log an upcoming deadline.
              </p>
            </div>
          )}

          {/* Section: OVERDUE */}
          {overdueTasks.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
                <AlertCircle className="w-4 h-4" />
                <span>Overdue Missions ({overdueTasks.length})</span>
              </div>
              <div className="space-y-2">
                {overdueTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onComplete={() => handleCheck(t.id)}
                    onDelete={() => onDeleteTask(t.id)}
                    statusTheme="overdue"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section: DUE TODAY */}
          {todayTasks.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                <span>Due Today ({todayTasks.length})</span>
              </div>
              <div className="space-y-2">
                {todayTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onComplete={() => handleCheck(t.id)}
                    onDelete={() => onDeleteTask(t.id)}
                    statusTheme="today"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section: UPCOMING */}
          {upcomingTasks.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                <Calendar className="w-4 h-4" />
                <span>Upcoming Targets ({upcomingTasks.length})</span>
              </div>
              <div className="space-y-2">
                {upcomingTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onComplete={() => handleCheck(t.id)}
                    onDelete={() => onDeleteTask(t.id)}
                    statusTheme="upcoming"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ARCHIVED HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400 font-mono">
              Completed tasks retain lightweight metadata (Title, Completed Time, Deadline).
            </div>
            {completedTasks.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Permanently clear all completed task history?')) {
                    onClearCompletedTasks();
                  }
                }}
                className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-mono transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}
          </div>

          {filteredHistory.length === 0 ? (
            <div className="p-10 text-center rounded-2xl border border-dashed border-[#1e2638] bg-[#090c13] text-slate-400 text-xs">
              No completed tasks in history archive yet.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-[#0c0f17] border border-[#1b2234] flex items-center justify-between gap-3 text-xs opacity-80 hover:opacity-100 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-emerald-950/60 border border-emerald-700/50 flex items-center justify-center text-emerald-400 flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-300 line-through truncate block">
                        {t.title}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                        <span>Completed: {t.completedAt ? t.completedAt.slice(0, 16).replace('T', ' ') : 'Done'}</span>
                        <span>•</span>
                        <span>Original Deadline: {t.deadline}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onRestoreTask(t.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/40 transition"
                      title="Restore to active queue"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(t.id, true)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
                      title="Permanently remove record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function TaskCard({
  task,
  onComplete,
  onDelete,
  statusTheme,
}: {
  task: TaskItem;
  onComplete: () => void;
  onDelete: () => void;
  statusTheme: 'overdue' | 'today' | 'upcoming';
}) {
  const borderClass =
    statusTheme === 'overdue'
      ? 'border-rose-900/40 bg-rose-950/10 hover:border-rose-700/60'
      : statusTheme === 'today'
      ? 'border-emerald-800/40 bg-emerald-950/10 hover:border-emerald-600/60'
      : 'border-[#1b2234] bg-[#0c0f17] hover:border-[#27324c]';

  const priorityBadge =
    task.priority === 'high'
      ? 'text-rose-400 bg-rose-950/80 border-rose-800/50'
      : task.priority === 'medium'
      ? 'text-amber-400 bg-amber-950/80 border-amber-800/50'
      : 'text-slate-400 bg-slate-900 border-slate-800';

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-between gap-3.5 transition group shadow-sm ${borderClass}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        {/* Checkbox */}
        <button
          type="button"
          onClick={onComplete}
          className="w-5 h-5 rounded-md border border-slate-600 hover:border-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center mt-0.5 flex-shrink-0 transition active-press text-transparent hover:text-emerald-400"
          title="Complete mission"
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>

        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-xs sm:text-sm text-white tracking-wide">
              {task.title}
            </span>
            {task.priority && (
              <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${priorityBadge}`}>
                {task.priority}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>Deadline: {formatDatePretty(task.deadline)}</span>
            </span>
            {task.notes && (
              <span className="text-slate-400 italic truncate max-w-xs sm:max-w-md">
                — "{task.notes}"
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 opacity-40 group-hover:opacity-100 transition flex-shrink-0"
        title="Delete task"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
