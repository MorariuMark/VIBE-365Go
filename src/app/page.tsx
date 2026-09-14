'use client';

import React, { useState, useEffect } from 'react';
import {
  AppDataBackup,
  Habit,
  Objective,
  WorkoutDayLog,
  MuscleGroup,
  UserGymProfile,
} from '@/types';
import { getStoredData, saveStoredData } from '@/lib/storage';
import { getTodayISO } from '@/lib/utils';
import { ContributionGrid } from '@/components/habits/ContributionGrid';
import { HabitList } from '@/components/habits/HabitList';
import { ObjectiveBoard } from '@/components/objectives/ObjectiveBoard';
import { WeeklyCalendar } from '@/components/gym/WeeklyCalendar';
import { DayWorkoutModal } from '@/components/gym/DayWorkoutModal';
import { ProgressCurves } from '@/components/gym/ProgressCurves';
import { DataManagementModal } from '@/components/common/DataManagementModal';
import {
  Flame,
  CheckCircle2,
  Dumbbell,
  Target,
  TrendingUp,
  Database,
  Calendar,
  Sparkles,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

type ActiveTab = 'habits' | 'gym' | 'objectives' | 'analytics';

export default function Home() {
  const [data, setData] = useState<AppDataBackup | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('habits');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());

  // Gym dedicated day modal
  const [activeWorkoutDate, setActiveWorkoutDate] = useState<string | null>(null);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  // Load from local storage
  useEffect(() => {
    const loaded = getStoredData();
    setData(loaded);
  }, []);

  // Save to local storage on mutation
  const updateData = (updater: (prev: AppDataBackup) => AppDataBackup) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveStoredData(next);
      return next;
    });
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold tracking-wide text-slate-300">
            Initializing VIBE 365...
          </span>
        </div>
      </div>
    );
  }

  // Habits Handlers
  const handleToggleHabitComplete = (habitId: string, dateISO: string) => {
    updateData((prev) => {
      const habits = prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        const currentHist = { ...(h.history || {}) };
        const isCurrentlyDone = Boolean(currentHist[dateISO]);
        currentHist[dateISO] = !isCurrentlyDone;

        // Recalculate streak
        let streak = h.streak;
        if (!isCurrentlyDone) {
          streak += 1;
        } else {
          streak = Math.max(0, streak - 1);
        }
        const bestStreak = Math.max(h.bestStreak, streak);

        return {
          ...h,
          history: currentHist,
          streak,
          bestStreak,
        };
      });
      return { ...prev, habits };
    });
  };

  const handleToggleSubtask = (habitId: string, subtaskId: string) => {
    updateData((prev) => {
      const habits = prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        const subtasks = h.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, completed: !s.completed } : s
        );
        return { ...h, subtasks };
      });
      return { ...prev, habits };
    });
  };

  const handleAddSubtask = (habitId: string, subtaskTitle: string) => {
    updateData((prev) => {
      const habits = prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        const newSub = {
          id: `sub_${Date.now()}`,
          title: subtaskTitle,
          completed: false,
        };
        return { ...h, subtasks: [...h.subtasks, newSub] };
      });
      return { ...prev, habits };
    });
  };

  const handleDeleteSubtask = (habitId: string, subtaskId: string) => {
    updateData((prev) => {
      const habits = prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        return {
          ...h,
          subtasks: h.subtasks.filter((s) => s.id !== subtaskId),
        };
      });
      return { ...prev, habits };
    });
  };

  const handleCreateHabit = (
    newHabitData: Omit<Habit, 'id' | 'createdAt' | 'streak' | 'bestStreak' | 'history'>
  ) => {
    const newHabit: Habit = {
      ...newHabitData,
      id: `habit_${Date.now()}`,
      createdAt: selectedDate,
      streak: 0,
      bestStreak: 0,
      history: {},
    };
    updateData((prev) => ({
      ...prev,
      habits: [newHabit, ...prev.habits],
    }));
  };

  const handleDeleteHabit = (habitId: string) => {
    if (window.confirm('Are you sure you want to delete this habit?')) {
      updateData((prev) => ({
        ...prev,
        habits: prev.habits.filter((h) => h.id !== habitId),
      }));
    }
  };

  // Objectives Handlers
  const handleToggleObjective = (objectiveId: string) => {
    updateData((prev) => {
      const objectives = prev.objectives.map((o) => {
        if (o.id !== objectiveId) return o;
        const willComplete = !o.completed;
        return {
          ...o,
          completed: willComplete,
          progress: willComplete ? 100 : o.progress === 100 ? 50 : o.progress,
        };
      });
      return { ...prev, objectives };
    });
  };

  const handleUpdateObjectiveProgress = (
    objectiveId: string,
    progress: number,
    currentValue?: number
  ) => {
    updateData((prev) => {
      const objectives = prev.objectives.map((o) => {
        if (o.id !== objectiveId) return o;
        return {
          ...o,
          progress,
          currentValue: currentValue !== undefined ? currentValue : o.currentValue,
          completed: progress >= 100,
        };
      });
      return { ...prev, objectives };
    });
  };

  const handleCreateObjective = (
    newObj: Omit<Objective, 'id' | 'createdAt' | 'completed' | 'progress'>
  ) => {
    const created: Objective = {
      ...newObj,
      id: `obj_${Date.now()}`,
      createdAt: getTodayISO(),
      completed: false,
      progress: 0,
    };
    updateData((prev) => ({
      ...prev,
      objectives: [created, ...prev.objectives],
    }));
  };

  const handleDeleteObjective = (objectiveId: string) => {
    if (window.confirm('Delete this objective?')) {
      updateData((prev) => ({
        ...prev,
        objectives: prev.objectives.filter((o) => o.id !== objectiveId),
      }));
    }
  };

  // Gym Handlers
  const handleSaveWorkout = (workout: WorkoutDayLog) => {
    updateData((prev) => ({
      ...prev,
      workoutLogs: {
        ...prev.workoutLogs,
        [workout.dateISO]: workout,
      },
    }));
  };

  const handleUpdateGymProfile = (profilePatch: Partial<UserGymProfile>) => {
    updateData((prev) => ({
      ...prev,
      gymProfile: {
        ...prev.gymProfile,
        ...profilePatch,
      },
    }));
  };

  const handleAddCustomMuscleGroup = (
    name: string,
    split: 'push' | 'pull' | 'legs' | 'custom',
    isPermanent: boolean
  ): MuscleGroup => {
    const newGroup: MuscleGroup = {
      id: `mg_${Date.now()}_${name.toLowerCase().replace(/\s+/g, '_')}`,
      name,
      defaultSplit: split,
      isPermanent,
      exercises: [],
    };

    if (isPermanent) {
      updateData((prev) => ({
        ...prev,
        muscleGroups: [...prev.muscleGroups, newGroup],
      }));
    }

    return newGroup;
  };

  const handleAddCustomExercise = (muscleGroupId: string, exerciseName: string) => {
    updateData((prev) => {
      const muscleGroups = prev.muscleGroups.map((g) => {
        if (g.id !== muscleGroupId) return g;
        const newEx = {
          id: `ex_${Date.now()}_${exerciseName.toLowerCase().replace(/\s+/g, '_')}`,
          name: exerciseName,
          muscleGroupId,
          isCustom: true,
        };
        return {
          ...g,
          exercises: [...g.exercises, newEx],
        };
      });
      return { ...prev, muscleGroups };
    });
  };

  // Previous day weight comparison
  const getPreviousLoggedWeight = (dateStr: string): number | undefined => {
    const dates = Object.keys(data.workoutLogs)
      .filter((d) => d < dateStr && data.workoutLogs[d].bodyWeightKg)
      .sort();
    if (dates.length === 0) return undefined;
    return data.workoutLogs[dates[dates.length - 1]].bodyWeightKg;
  };

  // Top stats
  const totalStreaks = data.habits.reduce((acc, h) => acc + h.streak, 0);
  const avgStreak =
    data.habits.length > 0 ? Math.round(totalStreaks / data.habits.length) : 0;
  const bestOverallStreak = Math.max(0, ...data.habits.map((h) => h.bestStreak));

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
      {/* Top Professional Header */}
      <header className="sticky top-0 z-40 bg-[#090e1a]/95 border-b border-slate-800/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand logo & tagline */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-white tracking-tight">
                  VIBE <span className="text-emerald-400">365</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Pro
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Habit Matrix & IronForge Progressive Overload
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800/80">
            <button
              type="button"
              onClick={() => setActiveTab('habits')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'habits'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Habits & Grid</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('gym')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'gym'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>IronForge Gym</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('objectives')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'objectives'
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Objectives</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Strength Curves</span>
            </button>
          </nav>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Best Streak Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-slate-400">Best Streak:</span>
              <span className="font-bold text-white">{bestOverallStreak}d</span>
            </div>

            {/* Quick Workout Modal Button */}
            <button
              type="button"
              onClick={() => setActiveWorkoutDate(selectedDate)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold transition"
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Workout</span>
            </button>

            {/* Data & JSON Button */}
            <button
              type="button"
              onClick={() => setIsDataModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition"
              title="Export/Import JSON backup and database state"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Data & Backup</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden items-center justify-around border-t border-slate-800/60 px-2 py-2 bg-slate-950">
          <button
            type="button"
            onClick={() => setActiveTab('habits')}
            className={`flex flex-col items-center gap-1 text-[11px] font-bold ${
              activeTab === 'habits' ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Habits</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gym')}
            className={`flex flex-col items-center gap-1 text-[11px] font-bold ${
              activeTab === 'gym' ? 'text-cyan-400' : 'text-slate-500'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>Gym</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('objectives')}
            className={`flex flex-col items-center gap-1 text-[11px] font-bold ${
              activeTab === 'objectives' ? 'text-indigo-400' : 'text-slate-500'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Goals</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center gap-1 text-[11px] font-bold ${
              activeTab === 'analytics' ? 'text-amber-400' : 'text-slate-500'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Curves</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full space-y-8">
        {/* Tab 1: Habits & Consistency Grid */}
        {activeTab === 'habits' && (
          <div className="space-y-6">
            {/* GitHub-Style Contribution Consistency Matrix */}
            <ContributionGrid
              habits={data.habits}
              workoutLogs={data.workoutLogs}
              onSelectDate={(dateISO) => {
                setSelectedDate(dateISO);
              }}
            />

            {/* Daily Habits Checklist & Subtasks */}
            <HabitList
              habits={data.habits}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onToggleComplete={handleToggleHabitComplete}
              onToggleSubtask={handleToggleSubtask}
              onAddSubtask={handleAddSubtask}
              onDeleteSubtask={handleDeleteSubtask}
              onCreateHabit={handleCreateHabit}
              onDeleteHabit={handleDeleteHabit}
            />
          </div>
        )}

        {/* Tab 2: IronForge Gym Tracker */}
        {activeTab === 'gym' && (
          <div className="space-y-6">
            <WeeklyCalendar
              workoutLogs={data.workoutLogs}
              gymProfile={data.gymProfile}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onOpenDayWorkout={(dateISO) => setActiveWorkoutDate(dateISO)}
              onUpdateGymProfile={handleUpdateGymProfile}
            />

            {/* Quick action bar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-white">
                  Ready to crush today’s session?
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select a day above or click to launch the dedicated workout logger with
                  Push/Pull/Legs splits, sticky exercises, and drop-set formulas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveWorkoutDate(selectedDate)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs transition shadow-lg shadow-cyan-500/20 whitespace-nowrap"
              >
                <Dumbbell className="w-4 h-4 stroke-[2.5]" />
                <span>Open {selectedDate} Workout Log</span>
              </button>
            </div>

            {/* Quick Preview of Strength Curves */}
            <ProgressCurves
              workoutLogs={data.workoutLogs}
              muscleGroups={data.muscleGroups}
            />
          </div>
        )}

        {/* Tab 3: Objectives */}
        {activeTab === 'objectives' && (
          <ObjectiveBoard
            objectives={data.objectives}
            onToggleObjective={handleToggleObjective}
            onUpdateProgress={handleUpdateObjectiveProgress}
            onCreateObjective={handleCreateObjective}
            onDeleteObjective={handleDeleteObjective}
          />
        )}

        {/* Tab 4: Strength Curves & Insights */}
        {activeTab === 'analytics' && (
          <ProgressCurves
            workoutLogs={data.workoutLogs}
            muscleGroups={data.muscleGroups}
          />
        )}
      </main>

      {/* Dedicated Day Workout Modal (pops up when selecting a calendar day) */}
      {activeWorkoutDate && (
        <DayWorkoutModal
          dateISO={activeWorkoutDate}
          workout={data.workoutLogs[activeWorkoutDate]}
          muscleGroups={data.muscleGroups}
          previousWeightKg={getPreviousLoggedWeight(activeWorkoutDate)}
          onClose={() => setActiveWorkoutDate(null)}
          onSaveWorkout={handleSaveWorkout}
          onAddCustomMuscleGroup={handleAddCustomMuscleGroup}
          onAddCustomExercise={handleAddCustomExercise}
        />
      )}

      {/* Data Management & JSON Backup Modal */}
      {isDataModalOpen && (
        <DataManagementModal
          onClose={() => setIsDataModalOpen(false)}
          onDataLoaded={(newData) => setData(newData)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090e1a] py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 VIBE 365. Built for high performers & serious athletes.</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Progressive Overload</span>
            <span>•</span>
            <span>Drop Sets Support</span>
            <span>•</span>
            <span>JSON Backup Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
