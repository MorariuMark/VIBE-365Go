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
  saveStoredData(parsed);
  return parsed;
}

// Progress curve analytics engine
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

    // Find top working set
    let topWeight = 0;
    let topReps = 0;
    let totalVolume = 0;
    let dropSetNotes = '';

    foundEx.sets.forEach((s) => {
      const setVol = s.weightKg * s.reps;
      totalVolume += setVol;
      if (s.weightKg > topWeight || (s.weightKg === topWeight && s.reps > topReps)) {
        topWeight = s.weightKg;
        topReps = s.reps;
      }
      if (s.isDropSet && s.dropSet) {
        totalVolume += s.dropSet.weightKg * s.dropSet.reps;
        dropSetNotes = `+ ${s.dropSet.weightKg}kg x ${s.dropSet.reps}`;
      }
    });

    if (topWeight > 0) {
      // Brzycki Formula for 1RM: Weight / (1.0278 - 0.0278 * Reps)
      const e1RM = topReps > 1 ? Math.round(topWeight / (1.0278 - 0.0278 * Math.min(topReps, 12))) : topWeight;

      points.push({
        date: log.dateISO,
        weight: topWeight,
        reps: topReps,
        estimated1RM: e1RM,
        totalVolume: Math.round(totalVolume),
        dropSetSummary: dropSetNotes,
        workoutTitle: log.title || 'Workout Session',
      });
    }
  });

  if (points.length === 0) {
    return { dataPoints: [], insight: null };
  }

  const baseline = points[0];
  const current = points[points.length - 1];

  // Past 30 days calculation
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const monthBaseline =
    points.find((p) => new Date(p.date) >= thirtyDaysAgo) || baseline;

  const weightDeltaPercent =
    monthBaseline.weight > 0
      ? Math.round(((current.weight - monthBaseline.weight) / monthBaseline.weight) * 100)
      : 0;

  const volumeDeltaPercent =
    monthBaseline.totalVolume > 0
      ? Math.round(((current.totalVolume - monthBaseline.totalVolume) / monthBaseline.totalVolume) * 100)
      : 0;

  const bestWeight = Math.max(...points.map((p) => p.weight));

  let summary = '';
  if (weightDeltaPercent > 0) {
    summary = `+${weightDeltaPercent}% weight increase over the past month. Peak working set: ${current.weight}kg x ${current.reps} reps.`;
  } else if (weightDeltaPercent === 0) {
    summary = `Consistent strength maintained at ${current.weight}kg with steady volume progression.`;
  } else {
    summary = `Deload / recovery cycle reflected. Top load: ${current.weight}kg.`;
  }

  const insight: ProgressInsight = {
    exerciseName,
    percentWeightIncreaseMonth: weightDeltaPercent,
    percentVolumeIncreaseMonth: volumeDeltaPercent,
    current1RM: current.estimated1RM,
    baseline1RM: monthBaseline.estimated1RM,
    bestWeightKg: bestWeight,
    totalSessionsLogged: points.length,
    summaryText: summary,
  };

  return { dataPoints: points, insight };
}
