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
  HabitBreaker,
  TaskItem,
  SleepLog,
  PhotoMetadata,
  UserSettings,
} from '@/types';
import {
  getStoredData,
  saveStoredData,
  moveToTrash,
  restoreFromTrash,
  purgeFromTrash,
  emptyTrash,
  recordAction,
  addTask,
  completeTask,
  deleteTask,
  restoreTask,
  clearCompletedTasks,
  saveSleepLog,
  deleteSleepLog,
  saveFitnessPhotoMetadata,
  deleteFitnessPhotoMetadata,
  updateUserSettings,
} from '@/lib/storage';
import { getTodayISO, formatDatePretty } from '@/lib/utils';
import { ContributionGrid } from '@/components/habits/ContributionGrid';
import { HabitList } from '@/components/habits/HabitList';
import { ObjectiveBoard } from '@/components/objectives/ObjectiveBoard';
import { WeeklyCalendar } from '@/components/gym/WeeklyCalendar';
import { DayWorkoutModal } from '@/components/gym/DayWorkoutModal';
import { ProgressCurves } from '@/components/gym/ProgressCurves';
import { DataManagementModal } from '@/components/common/DataManagementModal';
import { TrashCanModal } from '@/components/common/TrashCanModal';
import { ActionLogModal } from '@/components/common/ActionLogModal';
import { HabitBreakerBoard } from '@/components/breakers/HabitBreakerBoard';
import { TaskManager } from '@/components/tasks/TaskManager';
import { SleepTracker } from '@/components/sleep/SleepTracker';
import { DailyFitnessPhotos } from '@/components/gym/DailyFitnessPhotos';
import { SettingsView } from '@/components/settings/SettingsView';
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
  Trash2,
  History,
  ShieldAlert,
  Bot,
  Sparkles,
  CheckSquare,
  Moon,
  Settings,
  Camera,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import { AIChatView } from '@/components/chat/AIChatView';
import {
  CloudSyncStatus,
  loadCloudData,
  queueCloudSync,
  subscribeSyncStatus,
} from '@/lib/cloudSync';

type ActiveTab = 'habits' | 'fitness' | 'breakers' | 'objectives' | 'tasks' | 'sleep' | 'chat' | 'settings';
type FitnessSubTab = 'calendar' | 'matrix' | 'curves' | 'photos';

export default function Home() {
  const [data, setData] = useState<AppDataBackup | null>(null);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('idle');
  const [lastSynced, setLastSynced] = useState<Date | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<ActiveTab>('habits');
  const [fitnessSubTab, setFitnessSubTab] = useState<FitnessSubTab>('calendar');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());

  // Modal states
  const [activeWorkoutDate, setActiveWorkoutDate] = useState<string | null>(null);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [isActionLogModalOpen, setIsActionLogModalOpen] = useState(false);

  // Load from local storage immediately, then fetch from Supabase cloud
  useEffect(() => {
    const loaded = getStoredData();
    setData(loaded);

    // Seamlessly fetch cloud state and merge
    loadCloudData().then((cloudState) => {
      if (cloudState) {
        setData(cloudState);
      }
    });

    // Subscribe to cloud sync status
    const unsubscribe = subscribeSyncStatus((status, time) => {
      setSyncStatus(status);
      setLastSynced(time);
    });

    return () => unsubscribe();
  }, []);

  // Save to local storage on mutation and debounced sync to Supabase
  const updateData = (updater: (prev: AppDataBackup) => AppDataBackup) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveStoredData(next);
      queueCloudSync(next);
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

  // Habits Handlers with Audit Logging
  const handleToggleHabitComplete = (habitId: string, dateISO: string) => {
    updateData((prev) => {
      let habitTitle = '';
      let isDoneNow = false;

      const habits = prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        habitTitle = h.title;
        const currentHist = { ...(h.history || {}) };
        const isCurrentlyDone = Boolean(currentHist[dateISO]);
        isDoneNow = !isCurrentlyDone;
        currentHist[dateISO] = isDoneNow;

        let streak = h.streak;
        if (isDoneNow) {
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

      const next = { ...prev, habits };
      return recordAction(
        next,
        'habit_toggle',
        habitId,
        habitTitle,
        isDoneNow
          ? `Marked "${habitTitle}" completed for ${dateISO}`
          : `Unchecked "${habitTitle}" for ${dateISO}`
      );
    });
  };

  const handleToggleSubtask = (habitId: string, subtaskId: string) => {
    updateData((prev) => {
      let subtaskTitle = '';
      let habitTitle = '';
      let isDone = false;

      const habits = prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        habitTitle = h.title;
        const subtasks = h.subtasks.map((s) => {
          if (s.id === subtaskId) {
            subtaskTitle = s.title;
            isDone = !s.completed;
            return { ...s, completed: isDone };
          }
          return s;
        });
        return { ...h, subtasks };
      });

      const next = { ...prev, habits };
      return recordAction(
        next,
        'subtask_toggle',
        subtaskId,
        subtaskTitle || habitTitle,
        `${isDone ? 'Completed' : 'Unchecked'} subtask "${subtaskTitle}" under "${habitTitle}"`
      );
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
      let habitTitle = '';
      const habits = prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        habitTitle = h.title;
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

      const next = { ...prev, habits };
      return recordAction(
        next,
        'metric_update',
        habitId,
        habitTitle,
        `Logged metric value "${value}" for "${habitTitle}" on ${dateISO}`
      );
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
    updateData((prev) => {
      const next = {
        ...prev,
        habits: [newHabit, ...prev.habits],
      };
      return recordAction(
        next,
        'habit_create',
        newHabit.id,
        newHabit.title,
        `Created habit "${newHabit.title}" in category ${newHabit.category}`
      );
    });
  };

  // 30-Day Soft-Delete for Habits
  const handleDeleteHabit = (habitId: string) => {
    updateData((prev) => {
      const target = prev.habits.find((h) => h.id === habitId);
      if (!target) return prev;
      return moveToTrash(
        prev,
        'habit',
        habitId,
        target.title,
        `${target.subtasks?.length || 0} subtasks • ${target.category}`,
        target
      );
    });
  };

  // Objectives Handlers with Audit Logging
  const handleToggleObjective = (objectiveId: string) => {
    updateData((prev) => {
      let objTitle = '';
      let isCompleted = false;
      const objectives = prev.objectives.map((o) => {
        if (o.id !== objectiveId) return o;
        objTitle = o.title;
        isCompleted = !o.completed;
        return {
          ...o,
          completed: isCompleted,
          progress: isCompleted ? 100 : o.progress === 100 ? 50 : o.progress,
        };
      });

      const next = { ...prev, objectives };
      return recordAction(
        next,
        'objective_update',
        objectiveId,
        objTitle,
        `${isCompleted ? 'Achieved' : 'Reopened'} objective "${objTitle}"`
      );
    });
  };

  const handleUpdateObjectiveProgress = (
    objectiveId: string,
    progress: number,
    currentValue?: number
  ) => {
    updateData((prev) => {
      let objTitle = '';
      const objectives = prev.objectives.map((o) => {
        if (o.id !== objectiveId) return o;
        objTitle = o.title;
        return {
          ...o,
          progress,
          currentValue: currentValue !== undefined ? currentValue : o.currentValue,
          completed: progress >= 100,
        };
      });

      const next = { ...prev, objectives };
      return recordAction(
        next,
        'objective_update',
        objectiveId,
        objTitle,
        `Updated progress to ${progress}% on "${objTitle}"`
      );
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
    updateData((prev) => {
      const next = {
        ...prev,
        objectives: [created, ...prev.objectives],
      };
      return recordAction(
        next,
        'objective_create',
        created.id,
        created.title,
        `Created ${created.timeframe} objective "${created.title}"`
      );
    });
  };

  // 30-Day Soft-Delete for Objectives
  const handleDeleteObjective = (objectiveId: string) => {
    updateData((prev) => {
      const target = prev.objectives.find((o) => o.id === objectiveId);
      if (!target) return prev;
      return moveToTrash(
        prev,
        'objective',
        objectiveId,
        target.title,
        `${target.timeframe} goal • Due ${target.dueDate}`,
        target
      );
    });
  };

  // Fitness Handlers with Audit Logging
  const handleSaveWorkout = (workout: WorkoutDayLog) => {
    updateData((prev) => {
      const next = {
        ...prev,
        workoutLogs: {
          ...prev.workoutLogs,
          [workout.dateISO]: workout,
        },
      };
      return recordAction(
        next,
        'workout_save',
        workout.dateISO,
        workout.title,
        `Saved session "${workout.title}" with ${workout.exercises?.length || 0} exercises${
          workout.bodyWeightKg ? ` and body weight ${workout.bodyWeightKg}kg` : ''
        }`
      );
    });
  };

  const handleDeleteWorkout = (dateISO: string) => {
    updateData((prev) => {
      const target = prev.workoutLogs[dateISO];
      if (!target) return prev;
      return moveToTrash(
        prev,
        'workout',
        dateISO,
        target.title || `Workout on ${dateISO}`,
        `${(target.splitType || 'workout').toUpperCase()} • ${target.exercises?.length || 0} exercises`,
        target
      );
    });
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

  // Habit Breakers Handlers with Audit Logging
  const handleLogBreakerExecution = (
    breakerId: string,
    dateISO: string,
    executed: boolean,
    metricValue?: number,
    notes?: string,
    metricHours?: number,
    metricMinutes?: number
  ) => {
    updateData((prev) => {
      let breakerTitle = '';
      const habitBreakers = (prev.habitBreakers || []).map((b) => {
        if (b.id !== breakerId) return b;
        breakerTitle = b.title;
        const logs = { ...(b.logs || {}) };
        if (!executed) {
          delete logs[dateISO];
        } else {
          logs[dateISO] = {
            dateISO,
            executed: true,
            metricValue,
            metricHours,
            metricMinutes,
            notes,
            loggedAt: new Date().toISOString(),
          };
        }
        return { ...b, logs };
      });

      const next = { ...prev, habitBreakers };
      const timeDetail =
        metricHours !== undefined || metricMinutes !== undefined
          ? ` (${metricHours || 0}h ${metricMinutes || 0}m)`
          : metricValue !== undefined
          ? ` (Value: ${metricValue})`
          : '';
      return recordAction(
        next,
        'breaker_log',
        breakerId,
        breakerTitle || 'Habit Breaker',
        executed
          ? `Logged execution for "${breakerTitle}" on ${dateISO}${timeDetail}`
          : `Marked "${breakerTitle}" clean on ${dateISO}`
      );
    });
  };

  const handleCreateBreaker = (
    newBreakerData: Omit<HabitBreaker, 'id' | 'createdAt' | 'logs'>
  ) => {
    const newBreaker: HabitBreaker = {
      ...newBreakerData,
      id: `breaker_${Date.now()}`,
      createdAt: selectedDate,
      logs: {},
    };
    updateData((prev) => {
      const next = {
        ...prev,
        habitBreakers: [newBreaker, ...(prev.habitBreakers || [])],
      };
      return recordAction(
        next,
        'breaker_create',
        newBreaker.id,
        newBreaker.title,
        `Initiated elimination plan for "${newBreaker.title}" (${newBreaker.durationMonths} months, ${newBreaker.aggressiveness})`
      );
    });
  };

  // 30-Day Soft-Delete for Breakers
  const handleDeleteBreaker = (breakerId: string) => {
    updateData((prev) => {
      const target = (prev.habitBreakers || []).find((b) => b.id === breakerId);
      if (!target) return prev;
      return moveToTrash(
        prev,
        'habitBreaker',
        breakerId,
        target.title,
        `${target.durationMonths} months plan • ${target.trackingType}`,
        target
      );
    });
  };

  // Trash Can Restoration & Purge Handlers
  const handleRestoreFromTrash = (trashId: string) => {
    updateData((prev) => restoreFromTrash(prev, trashId));
  };

  const handlePurgeFromTrash = (trashId: string) => {
    updateData((prev) => purgeFromTrash(prev, trashId));
  };

  const handleEmptyAllTrash = () => {
    updateData((prev) => emptyTrash(prev));
  };

  // Task Handlers (Manual Task System with Auto-Archiving History)
  const handleAddTask = (newTask: TaskItem) => {
    updateData((prev) => addTask(prev, newTask));
  };

  const handleCompleteTask = (taskId: string) => {
    updateData((prev) => completeTask(prev, taskId));
  };

  const handleDeleteTask = (taskId: string, fromHistory = false) => {
    updateData((prev) => deleteTask(prev, taskId, fromHistory));
  };

  const handleRestoreTask = (taskId: string) => {
    updateData((prev) => restoreTask(prev, taskId));
  };

  const handleClearCompletedTasks = () => {
    updateData((prev) => clearCompletedTasks(prev));
  };

  // Sleep Handlers
  const handleSaveSleepLog = (sleepLog: SleepLog) => {
    updateData((prev) => saveSleepLog(prev, sleepLog));
  };

  const handleDeleteSleepLog = (dateISO: string) => {
    updateData((prev) => deleteSleepLog(prev, dateISO));
  };

  // Fitness Photo Metadata Handlers (<1MB Optimized)
  const handleSaveFitnessPhoto = (photoMeta: PhotoMetadata) => {
    updateData((prev) => saveFitnessPhotoMetadata(prev, photoMeta));
  };

  const handleDeleteFitnessPhoto = (photoId: string, dateISO: string) => {
    updateData((prev) => deleteFitnessPhotoMetadata(prev, photoId, dateISO));
  };

  // User Settings Handler
  const handleUpdateSettings = (patch: Partial<UserSettings>) => {
    updateData((prev) => updateUserSettings(prev, patch));
  };

  // Export / Import Backup Helpers
  const handleExportBackup = () => {
    if (!data) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `VIBE365_BACKUP_${getTodayISO()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (importedData: AppDataBackup) => {
    setData(importedData);
    saveStoredData(importedData);
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
  const trashCount = (data.trash || []).length;
  const auditCount = (data.actionLogs || []).length;

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-black">
      {/* Precision Engineered Top Bar */}
      <header className="sticky top-0 z-40 bg-[#07080c]/90 border-b border-[#1a1f2e] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Mobile Active Section Indicator */}
          <div className="flex md:hidden items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              {activeTab === 'habits' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {activeTab === 'fitness' && <Dumbbell className="w-4 h-4 text-blue-400" />}
              {activeTab === 'breakers' && <ShieldAlert className="w-4 h-4 text-rose-400" />}
              {activeTab === 'objectives' && <Target className="w-4 h-4 text-amber-400" />}
              {activeTab === 'tasks' && <CheckSquare className="w-4 h-4 text-sky-400" />}
              {activeTab === 'sleep' && <Moon className="w-4 h-4 text-indigo-400" />}
              {activeTab === 'chat' && <Bot className="w-4 h-4 text-emerald-400" />}
              {activeTab === 'settings' && <Settings className="w-4 h-4 text-purple-400" />}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white tracking-wide capitalize truncate flex items-center gap-1.5">
                <span>
                  {activeTab === 'chat'
                    ? 'AI Coach'
                    : activeTab === 'objectives'
                    ? 'Objectives'
                    : activeTab}
                </span>
                {activeTab === 'chat' && (
                  <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-700/50">
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-[10px] font-mono text-slate-500 truncate">
                {selectedDate === getTodayISO() ? 'TODAY' : selectedDate}
              </p>
            </div>
          </div>

          {/* Desktop 6 Core Sections Segmented Capsule Nav */}
          <nav className="hidden md:flex items-center bg-[#0d1017] p-1 rounded-xl border border-[#1b2030] overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('habits')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
              onClick={() => setActiveTab('breakers')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'breakers'
                  ? 'bg-[#1a2133] text-white border border-[#2e3752] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Breakers</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-slate-400">
                {(data.habitBreakers || []).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('objectives')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'tasks'
                  ? 'bg-[#1a2133] text-white border border-[#2e3752] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
              <span>Tasks</span>
              {(data.tasks || []).length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950/80 text-sky-300 border border-sky-800/40">
                  {(data.tasks || []).length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sleep')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'sleep'
                  ? 'bg-[#1a2133] text-white border border-[#2e3752] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sleep</span>
              {data.sleepLogs?.[selectedDate] && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/40">
                  {data.sleepLogs[selectedDate].durationHours}h
                </span>
              )}
            </button>
          </nav>

          {/* Top Right Permanent Actions Strip (AI Coach, Settings, Workout, Logs, Trash, Sync) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {/* Permanent AI Coach in Top Right Corner */}
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-sm active-press ${
                activeTab === 'chat'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                  : 'bg-[#0d1017] hover:bg-[#131b26] text-emerald-400 border-emerald-800/50 hover:border-emerald-600/60'
              }`}
              title="Open AI Coach"
            >
              <Bot className="w-3.5 h-3.5 stroke-[2.2]" />
              <span className="font-semibold hidden xs:inline">AI Coach</span>
              <span
                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                  activeTab === 'chat'
                    ? 'bg-black/30 text-slate-950 border-black/20'
                    : 'bg-emerald-950 text-emerald-400 border-emerald-700/50'
                }`}
              >
                AI
              </span>
            </button>

            {/* Permanent Settings in Top Right Corner */}
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-sm active-press ${
                activeTab === 'settings'
                  ? 'bg-purple-950/80 text-purple-200 border-purple-600'
                  : 'bg-[#0d1017] hover:bg-[#161426] text-slate-300 border-[#1c2234] hover:border-purple-800/50'
              }`}
              title="Settings & System Configuration"
            >
              <Settings
                className={`w-3.5 h-3.5 ${
                  activeTab === 'settings' ? 'text-purple-300' : 'text-purple-400'
                }`}
              />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {/* Quick Workout Button */}
            <button
              type="button"
              onClick={() => setActiveWorkoutDate(selectedDate)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-sm active-press"
              title="Log Workout Session"
            >
              <Dumbbell className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Log Session</span>
            </button>

            {/* Audit Log Ledger Button */}
            <button
              type="button"
              onClick={() => setIsActionLogModalOpen(true)}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-[#0d1017] hover:bg-[#141924] text-slate-300 border border-[#1c2234] text-xs font-medium transition"
              title="View immutable action audit ledger"
            >
              <History className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden lg:inline font-mono">Logs</span>
              {auditCount > 0 && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-blue-950 text-blue-400 border border-blue-800/50 hidden md:inline">
                  {auditCount}
                </span>
              )}
            </button>

            {/* 30-Day Trash Can Button */}
            <button
              type="button"
              onClick={() => setIsTrashModalOpen(true)}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                trashCount > 0
                  ? 'bg-rose-950/30 text-rose-300 border-rose-800/40 hover:bg-rose-900/40'
                  : 'bg-[#0d1017] hover:bg-[#141924] text-slate-400 border-[#1c2234]'
              }`}
              title="Open Trash Can (30-day retention)"
            >
              <Trash2 className={`w-3.5 h-3.5 ${trashCount > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
              <span className="hidden sm:inline font-mono">Trash</span>
              {trashCount > 0 && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-rose-900/60 text-rose-300 border border-rose-700/50">
                  {trashCount}
                </span>
              )}
            </button>

            {/* Supabase Cloud Sync Status Button */}
            <button
              type="button"
              onClick={() => setIsDataModalOpen(true)}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                syncStatus === 'synced'
                  ? 'bg-emerald-950/20 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/30'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-950/20 text-amber-300 border-amber-800/40 hover:bg-amber-900/30'
                  : syncStatus === 'offline'
                  ? 'bg-slate-900/60 text-slate-400 border-slate-700/50 hover:bg-slate-800/50'
                  : 'bg-[#0d1017] hover:bg-[#141924] text-slate-300 border-[#1c2234]'
              }`}
              title={
                syncStatus === 'synced'
                  ? `Cloud Synced${lastSynced ? ` at ${lastSynced.toLocaleTimeString()}` : ''}`
                  : syncStatus === 'syncing'
                  ? 'Syncing changes to Supabase cloud...'
                  : syncStatus === 'offline'
                  ? 'Offline / Local cache mode'
                  : 'Supabase Cloud Sync & Backup'
              }
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              ) : syncStatus === 'synced' ? (
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <CloudOff className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="hidden sm:inline font-mono">
                {syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing' : 'Cloud'}
              </span>
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
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 flex-1 w-full space-y-6 sm:space-y-8 pb-28 md:pb-8">
        {/* TAB 1: HABITS */}
        {activeTab === 'habits' && (
          <div className="space-y-6">
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

              <button
                type="button"
                onClick={() => setFitnessSubTab('photos')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  fitnessSubTab === 'photos'
                    ? 'bg-[#1a2133] text-white border border-[#2e3752]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-blue-400" />
                <span>Physique Photos (&lt;1MB)</span>
                {Object.values(data.fitnessPhotos || {}).reduce(
                  (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
                  0
                ) > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-300 border border-blue-800/40">
                    {Object.values(data.fitnessPhotos || {}).reduce(
                      (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
                      0
                    )}
                  </span>
                )}
              </button>
            </div>

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

            {fitnessSubTab === 'curves' && (
              <div className="space-y-6">
                <ProgressCurves
                  workoutLogs={data.workoutLogs}
                  muscleGroups={data.muscleGroups}
                />
              </div>
            )}

            {fitnessSubTab === 'photos' && (
              <DailyFitnessPhotos
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                fitnessPhotos={data.fitnessPhotos || {}}
                onSavePhotoMetadata={handleSaveFitnessPhoto}
                onDeletePhotoMetadata={handleDeleteFitnessPhoto}
              />
            )}
          </div>
        )}

        {/* TAB 3: HABIT BREAKERS */}
        {activeTab === 'breakers' && (
          <HabitBreakerBoard
            breakers={data.habitBreakers || []}
            selectedDate={selectedDate}
            onLogExecution={handleLogBreakerExecution}
            onCreateBreaker={handleCreateBreaker}
            onDeleteBreaker={handleDeleteBreaker}
          />
        )}

        {/* TAB 4: OBJECTIVES */}
        {activeTab === 'objectives' && (
          <ObjectiveBoard
            objectives={data.objectives}
            onToggleObjective={handleToggleObjective}
            onUpdateProgress={handleUpdateObjectiveProgress}
            onCreateObjective={handleCreateObjective}
            onDeleteObjective={handleDeleteObjective}
          />
        )}

        {/* TAB 5: TASKS & DEADLINES (AUTO-ARCHIVING) */}
        {activeTab === 'tasks' && (
          <TaskManager
            tasks={data.tasks || []}
            completedTasks={data.completedTasks || []}
            onAddTask={handleAddTask}
            onCompleteTask={handleCompleteTask}
            onDeleteTask={handleDeleteTask}
            onRestoreTask={handleRestoreTask}
            onClearCompletedTasks={handleClearCompletedTasks}
          />
        )}

        {/* TAB 6: SLEEP & RECOVERY */}
        {activeTab === 'sleep' && (
          <SleepTracker
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            sleepLogs={data.sleepLogs || {}}
            onSaveSleepLog={handleSaveSleepLog}
            onDeleteSleepLog={handleDeleteSleepLog}
            targetSleepHours={data.settings?.sleepTargetHours || 8.0}
          />
        )}

        {/* TAB 7: AI COACH INTELLIGENCE */}
        {activeTab === 'chat' && (
          <AIChatView appData={data} selectedDate={selectedDate} />
        )}

        {/* TAB 8: SYSTEM SETTINGS & PREFERENCES */}
        {activeTab === 'settings' && (
          <SettingsView
            appData={data}
            onUpdateSettings={handleUpdateSettings}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
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

      {/* 30-Day Trash Can Modal */}
      {isTrashModalOpen && (
        <TrashCanModal
          trash={data.trash || []}
          onClose={() => setIsTrashModalOpen(false)}
          onRestore={handleRestoreFromTrash}
          onPurge={handlePurgeFromTrash}
          onEmptyAll={handleEmptyAllTrash}
        />
      )}

      {/* Action Audit Ledger Modal */}
      {isActionLogModalOpen && (
        <ActionLogModal
          logs={data.actionLogs || []}
          onClose={() => setIsActionLogModalOpen(false)}
        />
      )}

      {/* Data Management & JSON Backup Modal */}
      {isDataModalOpen && (
        <DataManagementModal
          onClose={() => setIsDataModalOpen(false)}
          onDataLoaded={(newData) => setData(newData)}
          currentData={data}
          syncStatus={syncStatus}
          lastSynced={lastSynced}
        />
      )}

      {/* Mobile Floating Bottom Dock (Strictly 6 Core Sections with Safe-Area insets) */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-[#090b10]/95 border-t border-[#1c2234] backdrop-blur-xl px-1.5 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] grid grid-cols-6 gap-1 shadow-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('habits')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-xs font-semibold transition active-press ${
            activeTab === 'habits' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-[9px] mt-1 font-mono">Habits</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fitness')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-xs font-semibold transition active-press ${
            activeTab === 'fitness' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span className="text-[9px] mt-1 font-mono">Fitness</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('breakers')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-xs font-semibold transition active-press ${
            activeTab === 'breakers' ? 'text-rose-400 bg-rose-500/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span className="text-[9px] mt-1 font-mono">Breakers</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('objectives')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-xs font-semibold transition active-press ${
            activeTab === 'objectives' ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-4 h-4" />
          <span className="text-[9px] mt-1 font-mono">Goals</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-xs font-semibold transition active-press ${
            activeTab === 'tasks' ? 'text-sky-400 bg-sky-500/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span className="text-[9px] mt-1 font-mono">Tasks</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sleep')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-xs font-semibold transition active-press ${
            activeTab === 'sleep' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Moon className="w-4 h-4" />
          <span className="text-[9px] mt-1 font-mono">Sleep</span>
        </button>
      </div>

      {/* Technical Footer */}
      <footer className="border-t border-[#141824] bg-[#07080c] py-5 text-center text-xs text-slate-500 mt-auto hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>VIBE 365 PERFORMANCE OS • AUDIT ENGINE ONLINE</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>HABIT ELIMINATION</span>
            <span>•</span>
            <span>30-DAY TRASH RETENTION</span>
            <span>•</span>
            <span>IMMUTABLE AUDIT TRAIL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
