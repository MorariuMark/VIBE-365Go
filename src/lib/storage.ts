import {
  AppDataBackup,
  Habit,
  Objective,
  WorkoutDayLog,
  MuscleGroup,
  UserGymProfile,
  LoggedExercise,
  GymSet,
  SplitType,
  TrashItem,
  TrashItemType,
  HabitBreaker,
  ActionLog,
  ActionType,
  TaskItem,
  SleepLog,
  PhotoMetadata,
  UserSettings,
} from '@/types';
import { getFullDefaultBackup, INITIAL_MUSCLE_GROUPS, INITIAL_GYM_PROFILE } from './initialData';

const STORAGE_KEY = 'vibe_tracker_app_data_v1';

export function getStoredData(): AppDataBackup {
  if (typeof window === 'undefined') {
    return getFullDefaultBackup();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getFullDefaultBackup();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as AppDataBackup;
    // Basic structural check
    if (!parsed.habits || !parsed.workoutLogs || !parsed.muscleGroups) {
      const fallback = getFullDefaultBackup();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
      return fallback;
    }

    // Ensure migrations for new collections
    if (!parsed.trash) parsed.trash = [];
    if (!parsed.habitBreakers) parsed.habitBreakers = [];
    if (!parsed.actionLogs) parsed.actionLogs = [];
    if (!parsed.tasks) parsed.tasks = [];
    if (!parsed.completedTasks) parsed.completedTasks = [];
    if (!parsed.sleepLogs) parsed.sleepLogs = {};
    if (!parsed.fitnessPhotos) parsed.fitnessPhotos = {};
    if (!parsed.settings) {
      parsed.settings = {
        userName: 'Athlete',
        theme: 'cyber-dark',
        sleepTargetHours: 8.0,
        targetBedtime: '23:00',
        targetWakeTime: '07:00',
        autoArchiveTasksAfterDays: 30,
        defaultLLMProvider: 'groq',
        defaultModelId: 'openai/gpt-oss-20b',
        autoFallbackEnabled: true,
      };
    }

    // 30-day automatic purge for expired trash items
    const nowTime = Date.now();
    const activeTrash = parsed.trash.filter((item) => {
      const expiresAtMs = new Date(item.expiresAt).getTime();
      return expiresAtMs > nowTime;
    });
    parsed.trash = activeTrash;

    return parsed;
  } catch (err) {
    console.error('Failed to parse stored data, loading default', err);
    return getFullDefaultBackup();
  }
}

export function saveStoredData(data: AppDataBackup): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save data to localStorage', err);
  }
}

export function exportDataAsJSON(): void {
  const data = getStoredData();
  data.exportedAt = new Date().toISOString();
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vibe-habit-ironforge-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importDataFromJSON(jsonText: string): AppDataBackup {
  const parsed = JSON.parse(jsonText);
  if (!parsed.habits || !parsed.workoutLogs || !parsed.muscleGroups) {
    throw new Error('Invalid backup file format: missing core collections.');
  }
  if (!parsed.trash) parsed.trash = [];
  if (!parsed.habitBreakers) parsed.habitBreakers = [];
  if (!parsed.actionLogs) parsed.actionLogs = [];
  if (!parsed.tasks) parsed.tasks = [];
  if (!parsed.completedTasks) parsed.completedTasks = [];
  if (!parsed.sleepLogs) parsed.sleepLogs = {};
  if (!parsed.fitnessPhotos) parsed.fitnessPhotos = {};
  if (!parsed.settings) {
    parsed.settings = {
      userName: 'Athlete',
      theme: 'cyber-dark',
      sleepTargetHours: 8.0,
      targetBedtime: '23:00',
      targetWakeTime: '07:00',
      autoArchiveTasksAfterDays: 30,
      defaultLLMProvider: 'groq',
      defaultModelId: 'openai/gpt-oss-20b',
      autoFallbackEnabled: true,
    };
  }

  saveStoredData(parsed);
  return parsed;
}

// -------------------------------------------------------------
// Action Logging Engine
// -------------------------------------------------------------
export function createActionLog(
  actionType: ActionType,
  entityId: string,
  entityTitle: string,
  details: string,
  metadata?: Record<string, any>
): ActionLog {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    actionType,
    entityId,
    entityTitle,
    details,
    metadata,
  };
}

export function recordAction(
  prev: AppDataBackup,
  actionType: ActionType,
  entityId: string,
  entityTitle: string,
  details: string,
  metadata?: Record<string, any>
): AppDataBackup {
  const newLog = createActionLog(actionType, entityId, entityTitle, details, metadata);
  const updatedLogs = [newLog, ...(prev.actionLogs || [])].slice(0, 1000); // capped at 1000
  return {
    ...prev,
    actionLogs: updatedLogs,
  };
}

// -------------------------------------------------------------
// 30-Day Trash Can Engine
// -------------------------------------------------------------
export function moveToTrash(
  prev: AppDataBackup,
  itemType: TrashItemType,
  originalId: string,
  title: string,
  subtitle: string | undefined,
  payload: any
): AppDataBackup {
  const deletedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const trashItem: TrashItem = {
    id: `trash_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    itemType,
    originalId,
    title,
    subtitle,
    deletedAt,
    expiresAt,
    payload,
  };

  let next = { ...prev };

  if (itemType === 'habit') {
    next.habits = next.habits.filter((h) => h.id !== originalId);
  } else if (itemType === 'workout') {
    const updatedWorkouts = { ...next.workoutLogs };
    delete updatedWorkouts[originalId];
    next.workoutLogs = updatedWorkouts;
  } else if (itemType === 'objective') {
    next.objectives = next.objectives.filter((o) => o.id !== originalId);
  } else if (itemType === 'habitBreaker') {
    next.habitBreakers = (next.habitBreakers || []).filter((b) => b.id !== originalId);
  }

  next.trash = [trashItem, ...(next.trash || [])];

  const logActionType: ActionType =
    itemType === 'habit'
      ? 'habit_delete'
      : itemType === 'workout'
      ? 'workout_delete'
      : itemType === 'objective'
      ? 'objective_delete'
      : 'breaker_delete';

  return recordAction(
    next,
    logActionType,
    originalId,
    title,
    `Moved ${itemType} "${title}" to Trash Can (30-day retention)`
  );
}

export function restoreFromTrash(prev: AppDataBackup, trashId: string): AppDataBackup {
  const item = (prev.trash || []).find((t) => t.id === trashId);
  if (!item) return prev;

  const nextTrash = (prev.trash || []).filter((t) => t.id !== trashId);
  let next = { ...prev, trash: nextTrash };

  if (item.itemType === 'habit') {
    next.habits = [item.payload as Habit, ...next.habits];
  } else if (item.itemType === 'workout') {
    const workout = item.payload as WorkoutDayLog;
    next.workoutLogs = {
      ...next.workoutLogs,
      [workout.dateISO]: workout,
    };
  } else if (item.itemType === 'objective') {
    next.objectives = [item.payload as Objective, ...next.objectives];
  } else if (item.itemType === 'habitBreaker') {
    next.habitBreakers = [item.payload as HabitBreaker, ...(next.habitBreakers || [])];
  }

  const logActionType: ActionType =
    item.itemType === 'habit'
      ? 'habit_restore'
      : item.itemType === 'workout'
      ? 'workout_restore'
      : item.itemType === 'objective'
      ? 'objective_restore'
      : 'breaker_restore';

  return recordAction(
    next,
    logActionType,
    item.originalId,
    item.title,
    `Restored ${item.itemType} "${item.title}" from Trash Can`
  );
}

export function purgeFromTrash(prev: AppDataBackup, trashId: string): AppDataBackup {
  const item = (prev.trash || []).find((t) => t.id === trashId);
  const nextTrash = (prev.trash || []).filter((t) => t.id !== trashId);
  const next = { ...prev, trash: nextTrash };
  return recordAction(
    next,
    'trash_purge',
    trashId,
    item ? item.title : 'Trash Item',
    `Permanently purged ${item ? `"${item.title}"` : 'item'} from Trash`
  );
}

export function emptyTrash(prev: AppDataBackup): AppDataBackup {
  const count = (prev.trash || []).length;
  const next = { ...prev, trash: [] };
  return recordAction(
    next,
    'trash_purge',
    'trash_all',
    'Empty Trash',
    `Emptied Trash Can (${count} items permanently deleted)`
  );
}

// -------------------------------------------------------------
// Progress Curve Analytics Engine
// -------------------------------------------------------------
export interface ProgressDataPoint {
  date: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  totalVolume: number;
  dropSetSummary?: string;
  workoutTitle: string;
}

export interface ProgressInsight {
  exerciseName: string;
  percentWeightIncreaseMonth: number;
  percentVolumeIncreaseMonth: number;
  current1RM: number;
  baseline1RM: number;
  bestWeightKg: number;
  totalSessionsLogged: number;
  summaryText: string;
}

export function calculateProgressCurve(
  exerciseId: string,
  workoutLogs: Record<string, WorkoutDayLog>
): { dataPoints: ProgressDataPoint[]; insight: ProgressInsight | null } {
  const logs = Object.values(workoutLogs).sort(
    (a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime()
  );

  const points: ProgressDataPoint[] = [];
  let exerciseName = '';

  logs.forEach((log) => {
    const foundEx = log.exercises.find(
      (e) => e.exerciseId === exerciseId || e.exerciseName.toLowerCase() === exerciseId.toLowerCase()
    );
    if (!foundEx || !foundEx.sets || foundEx.sets.length === 0) return;

    exerciseName = foundEx.exerciseName;

    let topWeight = 0;
    let topReps = 0;
    let totalVol = 0;
    const dropParts: string[] = [];

    foundEx.sets.forEach((s) => {
      if (!s.completed && s.completed !== undefined) return;
      const setVol = s.weightKg * s.reps;
      totalVol += setVol;

      if (s.weightKg > topWeight) {
        topWeight = s.weightKg;
        topReps = s.reps;
      }

      if (s.isDropSet && s.dropSet) {
        const dropVol = s.dropSet.weightKg * s.dropSet.reps;
        totalVol += dropVol;
        dropParts.push(`Drop: ${s.dropSet.weightKg}kg×${s.dropSet.reps}`);
      }
    });

    if (topWeight === 0) return;

    // Brzycki 1RM formula: weight / (1.0278 - 0.0278 * reps)
    const est1RM =
      topReps > 1 ? Math.round(topWeight / (1.0278 - 0.0278 * Math.min(topReps, 12))) : topWeight;

    points.push({
      date: log.dateISO,
      weight: topWeight,
      reps: topReps,
      estimated1RM: est1RM,
      totalVolume: Math.round(totalVol),
      dropSetSummary: dropParts.length > 0 ? dropParts.join(', ') : undefined,
      workoutTitle: log.title,
    });
  });

  if (points.length === 0) {
    return { dataPoints: [], insight: null };
  }

  // Month-over-month insight
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const bestWeight = Math.max(...points.map((p) => p.weight));

  const weightDeltaPercent =
    firstPoint.weight > 0
      ? Math.round(((lastPoint.weight - firstPoint.weight) / firstPoint.weight) * 100)
      : 0;

  const volumeDeltaPercent =
    firstPoint.totalVolume > 0
      ? Math.round(((lastPoint.totalVolume - firstPoint.totalVolume) / firstPoint.totalVolume) * 100)
      : 0;

  const summary =
    weightDeltaPercent > 0
      ? `+${weightDeltaPercent}% weight increase over the past ${points.length} recorded sessions!`
      : weightDeltaPercent === 0
      ? `Consistent top working weight maintained at ${lastPoint.weight} kg.`
      : `${weightDeltaPercent}% deload detected compared to initial baseline.`;

  return {
    dataPoints: points,
    insight: {
      exerciseName,
      percentWeightIncreaseMonth: weightDeltaPercent,
      percentVolumeIncreaseMonth: volumeDeltaPercent,
      current1RM: lastPoint.estimated1RM,
      baseline1RM: firstPoint.estimated1RM,
      bestWeightKg: bestWeight,
      totalSessionsLogged: points.length,
      summaryText: summary,
    },
  };
}

// -------------------------------------------------------------
// Tasks State Handlers (Auto-Archiving History)
// -------------------------------------------------------------
export function addTask(data: AppDataBackup, newTask: TaskItem): AppDataBackup {
  const next: AppDataBackup = {
    ...data,
    tasks: [newTask, ...(data.tasks || [])],
  };
  return recordAction(
    next,
    'task_create',
    newTask.id,
    newTask.title,
    `Added task "${newTask.title}" (Due: ${newTask.deadline})`
  );
}

export function completeTask(data: AppDataBackup, taskId: string): AppDataBackup {
  const target = (data.tasks || []).find((t) => t.id === taskId);
  if (!target) return data;

  const completedRecord: TaskItem = {
    ...target,
    completed: true,
    completedAt: new Date().toISOString(),
  };

  const remainingTasks = (data.tasks || []).filter((t) => t.id !== taskId);
  const updatedHistory = [completedRecord, ...(data.completedTasks || [])];

  const next: AppDataBackup = {
    ...data,
    tasks: remainingTasks,
    completedTasks: updatedHistory,
  };

  return recordAction(
    next,
    'task_complete',
    target.id,
    target.title,
    `Completed task "${target.title}" (Moved to history)`
  );
}

export function deleteTask(data: AppDataBackup, taskId: string, fromHistory = false): AppDataBackup {
  if (fromHistory) {
    return {
      ...data,
      completedTasks: (data.completedTasks || []).filter((t) => t.id !== taskId),
    };
  }

  const target = (data.tasks || []).find((t) => t.id === taskId);
  const next: AppDataBackup = {
    ...data,
    tasks: (data.tasks || []).filter((t) => t.id !== taskId),
  };

  if (!target) return next;
  return recordAction(next, 'task_delete', target.id, target.title, `Deleted task "${target.title}"`);
}

export function restoreTask(data: AppDataBackup, taskId: string): AppDataBackup {
  const target = (data.completedTasks || []).find((t) => t.id === taskId);
  if (!target) return data;

  const restored: TaskItem = {
    ...target,
    completed: false,
    completedAt: undefined,
  };

  const next: AppDataBackup = {
    ...data,
    tasks: [restored, ...(data.tasks || [])],
    completedTasks: (data.completedTasks || []).filter((t) => t.id !== taskId),
  };

  return recordAction(
    next,
    'task_restore',
    target.id,
    target.title,
    `Restored task "${target.title}" to active queue`
  );
}

export function clearCompletedTasks(data: AppDataBackup): AppDataBackup {
  return {
    ...data,
    completedTasks: [],
  };
}

// -------------------------------------------------------------
// Sleep Logging State Handlers
// -------------------------------------------------------------
export function saveSleepLog(data: AppDataBackup, sleepLog: SleepLog): AppDataBackup {
  const next: AppDataBackup = {
    ...data,
    sleepLogs: {
      ...(data.sleepLogs || {}),
      [sleepLog.dateISO]: sleepLog,
    },
  };

  return recordAction(
    next,
    'sleep_log',
    sleepLog.dateISO,
    `Sleep on ${sleepLog.dateISO}`,
    `Logged ${sleepLog.durationHours} hrs sleep (${sleepLog.bedtime} - ${sleepLog.wakeTime})`
  );
}

export function deleteSleepLog(data: AppDataBackup, dateISO: string): AppDataBackup {
  const logs = { ...(data.sleepLogs || {}) };
  delete logs[dateISO];
  return { ...data, sleepLogs: logs };
}

// -------------------------------------------------------------
// Fitness Photo Metadata State Handlers
// -------------------------------------------------------------
export function saveFitnessPhotoMetadata(
  data: AppDataBackup,
  photoMeta: PhotoMetadata
): AppDataBackup {
  const currentList = data.fitnessPhotos?.[photoMeta.dateISO] || [];
  const next: AppDataBackup = {
    ...data,
    fitnessPhotos: {
      ...(data.fitnessPhotos || {}),
      [photoMeta.dateISO]: [photoMeta, ...currentList],
    },
  };

  return recordAction(
    next,
    'photo_upload',
    photoMeta.id,
    `Photo on ${photoMeta.dateISO}`,
    `Uploaded ${photoMeta.category} photo (${photoMeta.compressedSizeKB} KB, downscaled from ${photoMeta.originalSizeKB} KB)`
  );
}

export function deleteFitnessPhotoMetadata(
  data: AppDataBackup,
  photoId: string,
  dateISO: string
): AppDataBackup {
  const currentList = data.fitnessPhotos?.[dateISO] || [];
  const updatedList = currentList.filter((p) => p.id !== photoId);

  const nextPhotos = { ...(data.fitnessPhotos || {}) };
  if (updatedList.length > 0) {
    nextPhotos[dateISO] = updatedList;
  } else {
    delete nextPhotos[dateISO];
  }

  return {
    ...data,
    fitnessPhotos: nextPhotos,
  };
}

// -------------------------------------------------------------
// User Settings State Handlers
// -------------------------------------------------------------
export function updateUserSettings(
  data: AppDataBackup,
  patch: Partial<UserSettings>
): AppDataBackup {
  const updatedSettings: UserSettings = {
    ...(data.settings || {
      userName: 'Athlete',
      theme: 'cyber-dark',
      sleepTargetHours: 8.0,
      targetBedtime: '23:00',
      targetWakeTime: '07:00',
      autoArchiveTasksAfterDays: 30,
      defaultLLMProvider: 'groq',
      defaultModelId: 'openai/gpt-oss-20b',
      autoFallbackEnabled: true,
    }),
    ...patch,
  };

  const next: AppDataBackup = {
    ...data,
    settings: updatedSettings,
  };

  return recordAction(
    next,
    'settings_update',
    'user_settings',
    'User Settings',
    'Updated user configuration & preferences'
  );
}

