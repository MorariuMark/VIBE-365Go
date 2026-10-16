import { LoggedExercise, GymSet, WorkoutDayLog } from '@/types';
import { formatDatePretty } from '@/lib/utils';

export interface PastExerciseSession {
  dateISO: string;
  workoutTitle: string;
  exercise: LoggedExercise;
}

export interface ProgressiveOverloadComparison {
  hasPreviousSession: boolean;
  previousDateISO?: string;
  previousDateFormatted?: string;
  previousWorkoutTitle?: string;
  percentChange: number; // e.g. +5.3 or -2.4 or 0
  currentAvgLoad: number; // Avg load of first up to 3 sets
  previousAvgLoad: number; // Avg load of first up to 3 sets
  currentTopSet?: { weightKg: number; reps: number };
  previousTopSet?: { weightKg: number; reps: number };
  currentSetsCount: number;
  previousSetsCount: number;
  status: 'increase' | 'decrease' | 'equal' | 'first_session' | 'no_data';
  summaryText: string;
  detailText: string;
}

/**
 * Calculates mechanical load for a single set using the scientific Epley formula:
 * Load = Weight * (1 + min(Reps, 30) / 30)
 *
 * This heavily favors higher weight over more reps with lower weight:
 * - Linear with respect to weight (e.g. +10% weight = +10% load).
 * - Sub-linear with respect to reps (+1 rep = ~3.33% load).
 * - A drop in weight cannot be easily compensated by junk volume reps.
 * - For unweighted bodyweight sets (weight = 0, reps > 0), load is proportional to reps.
 */
export function calculateSetLoad(weightKg: number | string, reps: number | string): number {
  const w = Math.max(0, Number(weightKg) || 0);
  const r = Math.max(0, parseInt(String(reps), 10) || 0);

  if (w === 0 && r === 0) return 0;
  if (w === 0) return r; // Bodyweight baseline

  // Epley 1RM formula
  const cappedReps = Math.min(r, 30);
  return w * (1 + cappedReps / 30);
}

/**
 * Finds all previous workouts before currentDateISO that contain the specified exercise with at least one set.
 * Returns sorted chronologically descending (most recent past session first).
 */
export function getPastExerciseSessions(
  exerciseId: string,
  exerciseName: string,
  currentDateISO: string,
  workoutLogs: Record<string, WorkoutDayLog>
): PastExerciseSession[] {
  if (!workoutLogs) return [];

  const cleanName = (exerciseName || '').trim().toLowerCase();
  const cleanId = (exerciseId || '').trim();

  const matching: PastExerciseSession[] = [];

  Object.values(workoutLogs).forEach((log) => {
    // Only look strictly in the past
    if (!log || !log.dateISO || log.dateISO >= currentDateISO) return;
    if (!Array.isArray(log.exercises)) return;

    const foundEx = log.exercises.find((ex) => {
      if (!ex) return false;
      const exIdMatches = cleanId && ex.exerciseId === cleanId;
      const exNameMatches =
        cleanName && ex.exerciseName && ex.exerciseName.trim().toLowerCase() === cleanName;
      return exIdMatches || exNameMatches;
    });

    if (foundEx && Array.isArray(foundEx.sets) && foundEx.sets.length > 0) {
      // Must have at least one set with non-zero weight or reps
      const hasValidSet = foundEx.sets.some(
        (s) => (Number(s.weightKg) || 0) > 0 || (Number(s.reps) || 0) > 0
      );
      if (hasValidSet) {
        matching.push({
          dateISO: log.dateISO,
          workoutTitle: log.title || 'Workout Session',
          exercise: foundEx,
        });
      }
    }
  });

  // Sort descending by date (most recent first)
  matching.sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());

  return matching;
}

/**
 * Computes progressive overload for an exercise compared against its most recent past session.
 *
 * Rules applied:
 * 1. Only considers the first 3 sets per exercise (4th set and beyond are discarded as fatiguing junk volume).
 * 2. Higher weight is prioritized over more reps using the Epley formula: Load = Weight * (1 + Reps / 30).
 * 3. Compares the average load capacity of valid working sets (up to first 3 sets).
 */
export function calculateExerciseProgressiveOverload(
  currentExercise: LoggedExercise,
  pastSessions: PastExerciseSession[]
): ProgressiveOverloadComparison {
  // Extract up to first 3 valid sets for current exercise
  const currentSets = (currentExercise.sets || [])
    .slice(0, 3)
    .filter((s) => (Number(s.weightKg) || 0) > 0 || (Number(s.reps) || 0) > 0);

  if (currentSets.length === 0) {
    return {
      hasPreviousSession: false,
      percentChange: 0,
      currentAvgLoad: 0,
      previousAvgLoad: 0,
      currentSetsCount: 0,
      previousSetsCount: 0,
      status: 'no_data',
      summaryText: 'No sets logged yet',
      detailText: 'Add weight and reps to the first 3 sets to track overload.',
    };
  }

  // Calculate current loads
  const currentLoads = currentSets.map((s) => calculateSetLoad(s.weightKg, s.reps));
  const currentTotalLoad = currentLoads.reduce((a, b) => a + b, 0);
  const currentAvgLoad = Math.round((currentTotalLoad / currentSets.length) * 10) / 10;

  // Find top set in current (highest weight, then highest reps)
  let currentTopSet: { weightKg: number; reps: number } | undefined;
  currentSets.forEach((s) => {
    const w = Number(s.weightKg) || 0;
    const r = Number(s.reps) || 0;
    if (
      !currentTopSet ||
      w > currentTopSet.weightKg ||
      (w === currentTopSet.weightKg && r > currentTopSet.reps)
    ) {
      currentTopSet = { weightKg: w, reps: r };
    }
  });

  // Check if there is any past session
  if (!pastSessions || pastSessions.length === 0) {
    return {
      hasPreviousSession: false,
      percentChange: 0,
      currentAvgLoad,
      previousAvgLoad: 0,
      currentTopSet,
      currentSetsCount: currentSets.length,
      previousSetsCount: 0,
      status: 'first_session',
      summaryText: `Baseline Load: ${currentAvgLoad} kg avg`,
      detailText: `First recorded session for this exercise (first ${currentSets.length} sets analyzed). Future sessions will measure overload progress against this baseline!`,
    };
  }

  // Most recent past session
  const lastSession = pastSessions[0];
  const previousSets = (lastSession.exercise.sets || [])
    .slice(0, 3)
    .filter((s) => (Number(s.weightKg) || 0) > 0 || (Number(s.reps) || 0) > 0);

  if (previousSets.length === 0) {
    return {
      hasPreviousSession: false,
      percentChange: 0,
      currentAvgLoad,
      previousAvgLoad: 0,
      currentTopSet,
      currentSetsCount: currentSets.length,
      previousSetsCount: 0,
      status: 'first_session',
      summaryText: `Baseline Load: ${currentAvgLoad} kg avg`,
      detailText: `Previous session had no valid sets. Baseline set at ${currentAvgLoad} kg avg.`,
    };
  }

  const previousLoads = previousSets.map((s) => calculateSetLoad(s.weightKg, s.reps));
  const previousTotalLoad = previousLoads.reduce((a, b) => a + b, 0);
  const previousAvgLoad = Math.round((previousTotalLoad / previousSets.length) * 10) / 10;

  let previousTopSet: { weightKg: number; reps: number } | undefined;
  previousSets.forEach((s) => {
    const w = Number(s.weightKg) || 0;
    const r = Number(s.reps) || 0;
    if (
      !previousTopSet ||
      w > previousTopSet.weightKg ||
      (w === previousTopSet.weightKg && r > previousTopSet.reps)
    ) {
      previousTopSet = { weightKg: w, reps: r };
    }
  });

  // Compute percentage delta based on average load capacity
  let rawPercentChange = 0;
  if (previousAvgLoad > 0) {
    rawPercentChange = ((currentAvgLoad - previousAvgLoad) / previousAvgLoad) * 100;
  }
  const percentChange = Math.round(rawPercentChange * 10) / 10;

  const prevDatePretty = formatDatePretty(lastSession.dateISO);

  let status: 'increase' | 'decrease' | 'equal' = 'equal';
  if (percentChange > 0) {
    status = 'increase';
  } else if (percentChange < 0) {
    status = 'decrease';
  }

  const sign = percentChange > 0 ? '+' : '';
  const summaryText =
    status === 'increase'
      ? `▲ ${sign}${percentChange}% Progressive Overload`
      : status === 'decrease'
      ? `▼ ${percentChange}% Exercise Load`
      : `= 0.0% Consistent Load`;

  const topSetComp =
    currentTopSet && previousTopSet
      ? ` • Top: ${currentTopSet.weightKg}kg × ${currentTopSet.reps} (was ${previousTopSet.weightKg}kg × ${previousTopSet.reps})`
      : '';

  const detailText = `vs ${prevDatePretty} (${lastSession.workoutTitle}) • Load: ${currentAvgLoad}kg avg vs ${previousAvgLoad}kg avg (first 3 sets)${topSetComp}`;

  return {
    hasPreviousSession: true,
    previousDateISO: lastSession.dateISO,
    previousDateFormatted: prevDatePretty,
    previousWorkoutTitle: lastSession.workoutTitle,
    percentChange,
    currentAvgLoad,
    previousAvgLoad,
    currentTopSet,
    previousTopSet,
    currentSetsCount: currentSets.length,
    previousSetsCount: previousSets.length,
    status,
    summaryText,
    detailText,
  };
}
