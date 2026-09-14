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
import { getTodayISO, formatDatePretty } from '@/lib/utils';
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
  Grid,
  Activity,
  Plus,
  ChevronRight,
  ShieldCheck,
  Scale,
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
      <div className="min-h-screen flex items-center justify-center bg-[#07080c] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">
            INITIALIZING VIBE 365 OS...
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
    if (window.confirm('Delete this habit permanently?')) {
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

  // HUD computed metrics
  const todayHabitsTotal = data.habits.length;
  const todayHabitsDone = data.habits.filter((h) => h.history?.[selectedDate]).length;
  const todayHabitsPct =
    todayHabitsTotal > 0 ? Math.round((todayHabitsDone / todayHabitsTotal) * 100) : 0;
  const bestOverallStreak = Math.max(0, ...data.habits.map((h) => h.bestStreak));
  const currentActiveStreak = Math.max(0, ...data.habits.map((h) => h.streak));
  const todayWorkout = data.workoutLogs[selectedDate];
  const previousWeight = getPreviousLoggedWeight(selectedDate);
  const weightDelta =
    todayWorkout?.bodyWeightKg && previousWeight
      ? (todayWorkout.bodyWeightKg - previousWeight).toFixed(1)
      : null;

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-black">
      {/* Precision Engineered Top Bar */}
      <header className="sticky top-0 z-40 bg-[#07080c]/90 border-b border-[#1a1f2e] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Brand Mark & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#111520] border border-[#232a3e] flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-inner">
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white font-sans">
                  VIBE <span className="text-emerald-400">365</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  PERFORMANCE OS
                </span>
              </div>
            </div>
          </div>

          {/* Unified Architectural Segmented Capsule Nav */}
          <nav className="hidden md:flex items-center bg-[#0d1017] p-1 rounded-xl border border-[#1b2030]">
            <button
              type="button"
              onClick={() => setActiveTab('habits')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'habits'
                  ? 'bg-[#1a2133] text-white border border-[#2e3752] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Habits</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-slate-400">
                {data.habits.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fitness')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'fitness'
                  ? 'bg-[#1a2133] text-white border border-[#2e3752] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5 text-blue-400" />
              <span>Fitness</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-slate-400 uppercase">
                {todayWorkout?.splitType || 'PPL'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('objectives')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'objectives'
                  ? 'bg-[#1a2133] text-white border border-[#2e3752] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>Objectives</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-slate-400">
                {data.objectives.length}
              </span>
            </button>
          </nav>

          {/* Right Action Strip */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Quick Workout Button */}
            <button
              type="button"
              onClick={() => setActiveWorkoutDate(selectedDate)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-sm active-press"
            >
              <Dumbbell className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Log Session</span>
            </button>

            {/* Backup & System Modal */}
            <button
              type="button"
              onClick={() => setIsDataModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d1017] hover:bg-[#141924] text-slate-300 border border-[#1c2234] text-xs font-medium transition"
              title="Backup database and JSON sync"
            >
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline font-mono">Sync</span>
            </button>
          </div>
        </div>
      </header>

      {/* Athletic Performance HUD Strip */}
      <section className="border-b border-[#141824] bg-[#090b10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* HUD 1: Date & Target Day */}
            <div className="bg-[#0e1119] border border-[#1b2131] rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Target Date
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm sm:text-base font-bold text-white">
                  {formatDatePretty(selectedDate)}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {selectedDate === getTodayISO() ? 'TODAY' : 'PAST'}
                </span>
              </div>
            </div>

            {/* HUD 2: Daily Habit Progress */}
            <div className="bg-[#0e1119] border border-[#1b2131] rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Daily Habits
                </span>
                <span className="text-xs font-bold font-numeric text-emerald-400">
                  {todayHabitsPct}%
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 bg-[#181e2e] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${todayHabitsPct}%` }}
                  />
                </div>
                <span className="text-[11px] font-numeric text-slate-400 whitespace-nowrap">
                  {todayHabitsDone}/{todayHabitsTotal}
                </span>
              </div>
            </div>

            {/* HUD 3: Training Split */}
            <div className="bg-[#0e1119] border border-[#1b2131] rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Workout Session
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
                  {todayWorkout?.title || (todayWorkout?.splitType ? `${todayWorkout.splitType} Day` : 'Push Day')}
                </span>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                    todayWorkout?.completed
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {todayWorkout?.completed ? 'COMPLETED' : 'PENDING'}
                </span>
              </div>
            </div>

            {/* HUD 4: Consistency Streak */}
            <div className="bg-[#0e1119] border border-[#1b2131] rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Streak Record
              </span>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="text-sm sm:text-base font-bold text-white font-numeric">
                    {currentActiveStreak}d
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  Best: <span className="text-slate-300 font-bold">{bestOverallStreak}d</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full space-y-6 sm:space-y-8 mb-16 md:mb-6">
        {/* TAB 1: HABITS */}
        {activeTab === 'habits' && (
          <div className="space-y-6">
            {/* Habits Consistency Matrix */}
            <ContributionGrid
              habits={data.habits}
              workoutLogs={data.workoutLogs}
              colorTheme="emerald"
              mode="habits"
              title="Habits Activity Matrix"
              subtitle="GitHub-style consistency matrix tracking your daily completions and momentum"
              onSelectDate={(dateISO) => {
                setSelectedDate(dateISO);
              }}
            />

            {/* Habit Checklist, Subtasks & Metrics */}
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

        {/* TAB 2: FITNESS */}
        {activeTab === 'fitness' && (
          <div className="space-y-6">
            {/* Fitness Sub-Section Tabs */}
            <div className="flex items-center gap-1 bg-[#0d1017] border border-[#1b2030] p-1 rounded-xl w-full sm:w-auto overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setFitnessSubTab('calendar')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  fitnessSubTab === 'calendar'
                    ? 'bg-[#1a2133] text-white border border-[#2e3752]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Weekly Schedule</span>
              </button>

              <button
                type="button"
                onClick={() => setFitnessSubTab('matrix')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  fitnessSubTab === 'matrix'
                    ? 'bg-[#1a2133] text-white border border-[#2e3752]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Grid className="w-3.5 h-3.5 text-blue-400" />
                <span>Blue Activity Matrix</span>
              </button>

              <button
                type="button"
                onClick={() => setFitnessSubTab('curves')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  fitnessSubTab === 'curves'
                    ? 'bg-[#1a2133] text-white border border-[#2e3752]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Strength Curves & 1RM</span>
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

                {/* Session Launch Card */}
                <div className="athletic-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                        {selectedDate}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-white">
                        {todayWorkout?.title || 'Scheduled Training Session'}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Log progressive overload sets, reps, drop sets formula, and daily weigh-in.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveWorkoutDate(selectedDate)}
                    className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-sm whitespace-nowrap self-stretch sm:self-auto justify-center active-press"
                  >
                    <Dumbbell className="w-4 h-4 stroke-[2.5]" />
                    <span>Open Workout Ledger</span>
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
                  title="Fitness Activity Matrix"
                  subtitle="Sapphire consistency matrix tracking workouts, weekly volume, and active training days"
                  onSelectDate={(dateISO) => {
                    setSelectedDate(dateISO);
                    setActiveWorkoutDate(dateISO);
                  }}
                />
              </div>
            )}

            {/* Sub-view 3: Strength Curves */}
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

      {/* Dedicated Day Workout Modal */}
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

      {/* Mobile Floating Bottom Dock */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-[#090b10]/95 border-t border-[#1c2234] backdrop-blur-xl p-1.5 flex items-center justify-around">
        <button
          type="button"
          onClick={() => setActiveTab('habits')}
          className={`flex-1 flex flex-col items-center py-2 rounded-xl text-xs font-semibold transition active-press ${
            activeTab === 'habits' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-[10px] mt-1 font-mono">Habits</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fitness')}
          className={`flex-1 flex flex-col items-center py-2 rounded-xl text-xs font-semibold transition active-press ${
            activeTab === 'fitness' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span className="text-[10px] mt-1 font-mono">Fitness</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('objectives')}
          className={`flex-1 flex flex-col items-center py-2 rounded-xl text-xs font-semibold transition active-press ${
            activeTab === 'objectives' ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400'
          }`}
        >
          <Target className="w-4 h-4" />
          <span className="text-[10px] mt-1 font-mono">Goals</span>
        </button>
      </div>

      {/* Technical Footer */}
      <footer className="border-t border-[#141824] bg-[#07080c] py-5 text-center text-xs text-slate-500 mt-auto hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>VIBE 365 LOCAL ENGINE ACTIVE</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>HABITS</span>
            <span>•</span>
            <span>BLUE MATRIX</span>
            <span>•</span>
            <span>PROGRESSIVE OVERLOAD</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
