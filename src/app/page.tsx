'use client';

import React, { useState, useEffect } from 'react';
import {
  AppDataBackup,
  Habit,
  Objective,
  WorkoutDayLog,
  MuscleGroup,
  UserGymProfile,
  HabitMetric,
  HabitTargetCompletions,
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
  Grid,
} from 'lucide-react';

type ActiveTab = 'habits' | 'fitness' | 'objectives';
type FitnessSubTab = 'calendar' | 'matrix' | 'curves';

export default function Home() {
  const [data, setData] = useState<AppDataBackup | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('habits');
  const [fitnessSubTab, setFitnessSubTab] = useState<FitnessSubTab>('calendar');
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

  const handleUpdateMetricValue = (
    habitId: string,
    dateISO: string,
    metricId: string,
    value: string | number | boolean
  ) => {
    updateData((prev) => {
      const habits = prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        const dateValues = { ...(h.dailyMetricValues?.[dateISO] || {}) };
        dateValues[metricId] = value;
        return {
          ...h,
          dailyMetricValues: {
            ...(h.dailyMetricValues || {}),
            [dateISO]: dateValues,
          },
        };
      });
      return { ...prev, habits };
    });
  };

  const handleAddMetricDefinition = (habitId: string, metric: HabitMetric) => {
    updateData((prev) => {
      const habits = prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        const currentMetrics = h.metrics || [];
        return {
          ...h,
          metrics: [...currentMetrics, metric],
        };
      });
      return { ...prev, habits };
    });
  };

  const handleDeleteMetricDefinition = (habitId: string, metricId: string) => {
    updateData((prev) => {
      const habits = prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        return {
          ...h,
          metrics: (h.metrics || []).filter((m) => m.id !== metricId),
        };
      });
      return { ...prev, habits };
    });
  };

  const handleUpdateTargetCompletions = (
    habitId: string,
    target: HabitTargetCompletions
  ) => {
    updateData((prev) => {
      const habits = prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        return {
          ...h,
          targetCompletions: target,
        };
      });
      return { ...prev, habits };
    });
  };

  const handleUpdateDailyNotes = (
    habitId: string,
    dateISO: string,
    notes: string
  ) => {
    updateData((prev) => {
      const habits = prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        return {
          ...h,
          dailyNotes: {
            ...(h.dailyNotes || {}),
            [dateISO]: notes,
          },
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

  // Fitness Handlers
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

  const bestOverallStreak = Math.max(0, ...data.habits.map((h) => h.bestStreak));

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#090e1a]/95 border-b border-slate-800/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-black text-base sm:text-lg text-white tracking-tight">
                  VIBE <span className="text-emerald-400">365</span>
                </span>
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Pro
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block truncate">
                Habits, Fitness & Objectives
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs: Habits, Fitness, Objectives */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800/80">
            <button
              type="button"
              onClick={() => setActiveTab('habits')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'habits'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Habits</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fitness')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'fitness'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>Fitness</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('objectives')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'objectives'
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Objectives</span>
            </button>
          </nav>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Best Streak Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-slate-400">Best:</span>
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
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition"
              title="Backup data and JSON export/import"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Backup</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs (Fixed Clean Spacing) */}
        <div className="flex md:hidden items-center justify-around border-t border-slate-800/60 px-1 py-1.5 bg-slate-950/90">
          <button
            type="button"
            onClick={() => setActiveTab('habits')}
            className={`flex-1 flex flex-col items-center py-1 rounded-lg text-xs font-bold transition ${
              activeTab === 'habits' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Habits</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fitness')}
            className={`flex-1 flex flex-col items-center py-1 rounded-lg text-xs font-bold transition ${
              activeTab === 'fitness' ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-400'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Fitness</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('objectives')}
            className={`flex-1 flex flex-col items-center py-1 rounded-lg text-xs font-bold transition ${
              activeTab === 'objectives' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400'
            }`}
          >
            <Target className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Objectives</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-7 flex-1 w-full space-y-6 sm:space-y-8">
        {/* TAB 1: HABITS */}
        {activeTab === 'habits' && (
          <div className="space-y-6">
            {/* Detailed Habits Activity Matrix with Days of Week & Month */}
            <ContributionGrid
              habits={data.habits}
              workoutLogs={data.workoutLogs}
              colorTheme="emerald"
              mode="habits"
              title="Habits Activity Matrix"
              subtitle="Daily habit completions and routine consistency grid"
              onSelectDate={(dateISO) => {
                setSelectedDate(dateISO);
              }}
            />

            {/* Daily Habits Checklist & Subtasks & Dynamic Metrics */}
            <HabitList
              habits={data.habits}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onToggleComplete={handleToggleHabitComplete}
              onToggleSubtask={handleToggleSubtask}
              onAddSubtask={handleAddSubtask}
              onDeleteSubtask={handleDeleteSubtask}
              onUpdateMetricValue={handleUpdateMetricValue}
              onAddMetricDefinition={handleAddMetricDefinition}
              onDeleteMetricDefinition={handleDeleteMetricDefinition}
              onUpdateTargetCompletions={handleUpdateTargetCompletions}
              onUpdateDailyNotes={handleUpdateDailyNotes}
              onCreateHabit={handleCreateHabit}
              onDeleteHabit={handleDeleteHabit}
            />
          </div>
        )}

        {/* TAB 2: FITNESS (formerly IronForge) */}
        {activeTab === 'fitness' && (
          <div className="space-y-6">
            {/* Fitness Sub-Section Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setFitnessSubTab('calendar')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  fitnessSubTab === 'calendar'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Weekly Calendar & Log</span>
              </button>

              <button
                type="button"
                onClick={() => setFitnessSubTab('matrix')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  fitnessSubTab === 'matrix'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Blue Activity Matrix</span>
              </button>

              <button
                type="button"
                onClick={() => setFitnessSubTab('curves')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  fitnessSubTab === 'curves'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Strength Curves</span>
              </button>
            </div>

            {/* Sub-view 1: Weekly Calendar & Day Logger */}
            {fitnessSubTab === 'calendar' && (
              <div className="space-y-6">
                <WeeklyCalendar
                  workoutLogs={data.workoutLogs}
                  gymProfile={data.gymProfile}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onOpenDayWorkout={(dateISO) => setActiveWorkoutDate(dateISO)}
                  onUpdateGymProfile={handleUpdateGymProfile}
                />

                {/* Quick Session Launch Card */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-white">
                      Workout for {selectedDate}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Open dedicated session view to log Push/Pull/Legs exercises, sets, reps & drop sets.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveWorkoutDate(selectedDate)}
                    className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs transition shadow-lg shadow-cyan-500/20 whitespace-nowrap self-stretch sm:self-auto justify-center"
                  >
                    <Dumbbell className="w-4 h-4 stroke-[2.5]" />
                    <span>Open {selectedDate} Session</span>
                  </button>
                </div>
              </div>
            )}

            {/* Sub-view 2: Dedicated Blue Activity Matrix for Gym */}
            {fitnessSubTab === 'matrix' && (
              <div className="space-y-6">
                <ContributionGrid
                  workoutLogs={data.workoutLogs}
                  colorTheme="blue"
                  mode="gym"
                  title="Fitness Workout Activity Matrix"
                  subtitle="Dedicated training consistency grid showing workout days, splits & volume in blue"
                  onSelectDate={(dateISO) => {
                    setSelectedDate(dateISO);
                    setActiveWorkoutDate(dateISO);
                  }}
                />
              </div>
            )}

            {/* Sub-view 3: Strength Curves (now subsection of fitness) */}
            {fitnessSubTab === 'curves' && (
              <div className="space-y-6">
                <ProgressCurves
                  workoutLogs={data.workoutLogs}
                  muscleGroups={data.muscleGroups}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 3: OBJECTIVES */}
        {activeTab === 'objectives' && (
          <ObjectiveBoard
            objectives={data.objectives}
            onToggleObjective={handleToggleObjective}
            onUpdateProgress={handleUpdateObjectiveProgress}
            onCreateObjective={handleCreateObjective}
            onDeleteObjective={handleDeleteObjective}
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
      <footer className="border-t border-slate-800/80 bg-[#090e1a] py-5 sm:py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 VIBE 365. Built for high performers & athletes.</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Habits & Sub-sets</span>
            <span>•</span>
            <span>Blue Fitness Matrix</span>
            <span>•</span>
            <span>Strength Curves</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
