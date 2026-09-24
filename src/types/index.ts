export type ObjectiveTimeframe = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface HabitSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export type HabitMetricType = 'number' | 'text' | 'boolean';

export interface HabitMetric {
  id: string;
  label: string; // e.g. "Minutes", "Words written", "Pages read"
  type: HabitMetricType;
  unit?: string; // e.g. "min", "words", "pg"
  defaultValue?: string | number | boolean;
}

export interface HabitTargetCompletions {
  count: number; // e.g. 4
  period: 'week' | 'month'; // 'week' or 'month'
}

export interface Habit {
  id: string;
  title: string;
  description?: string;
  category: 'fitness' | 'mindset' | 'productivity' | 'health' | 'learning' | 'custom';
  color: string;
  subtasks: HabitSubtask[];
  streak: number;
  bestStreak: number;
  createdAt: string; // ISO date
  history: Record<string, boolean>; // date string "YYYY-MM-DD" -> completed status
  targetCompletions?: HabitTargetCompletions; // minimum completions per week/month
  metrics?: HabitMetric[]; // custom sub set variables (e.g. minutes, words, amount)
  dailyMetricValues?: Record<string, Record<string, string | number | boolean>>; // dateISO -> metricId -> val
  dailyNotes?: Record<string, string>; // dateISO -> notes for the day
  generalNotes?: string;
}

export interface Objective {
  id: string;
  title: string;
  timeframe: ObjectiveTimeframe;
  category: string;
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
  progress: number; // 0 - 100
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  notes?: string;
  createdAt: string;
}

export type SplitType = 'push' | 'pull' | 'legs' | 'rest' | 'custom';

export interface ExerciseDefinition {
  id: string;
  name: string;
  muscleGroupId: string;
  isCustom?: boolean;
}

export interface MuscleGroup {
  id: string;
  name: string;
  defaultSplit: 'push' | 'pull' | 'legs' | 'custom';
  isPermanent: boolean;
  exercises: ExerciseDefinition[];
}

export interface DropSet {
  weightKg: number;
  reps: number;
}

export interface GymSet {
  id: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  isDropSet?: boolean;
  dropSet?: DropSet;
  completed: boolean;
  rpe?: number;
}

export interface LoggedExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroupId: string;
  muscleGroupName: string;
  sets: GymSet[];
  notes?: string;
}

export interface WorkoutDayLog {
  id: string;
  dateISO: string; // "YYYY-MM-DD"
  title: string;
  notes?: string;
  splitType: SplitType;
  muscleGroups: string[]; // IDs or names active for this specific day
  exercises: LoggedExercise[];
  bodyWeightKg?: number;
  completed: boolean;
  durationMinutes?: number;
}

export interface UserGymProfile {
  workoutsPerWeekGoal: number; // e.g. 4
  preferredSplit: SplitType;
  preferredWeightUnit: 'kg' | 'lbs';
  splitSchedule?: Record<string, string>;
}

// -------------------------------------------------------------
// Trash Can & 30-Day Soft-Delete System
// -------------------------------------------------------------
export type TrashItemType = 'habit' | 'workout' | 'objective' | 'habitBreaker';

export interface TrashItem {
  id: string; // unique trash ID: trash_12345
  itemType: TrashItemType;
  originalId: string;
  title: string;
  subtitle?: string;
  deletedAt: string; // ISO datetime e.g. "2026-09-15T03:00:00.000Z"
  expiresAt: string; // ISO datetime (deletedAt + 30 days)
  payload: any; // Full entity data serialized for 100% fidelity restoration
}

// -------------------------------------------------------------
// Habit Breaker Progressive Elimination System
// -------------------------------------------------------------
export type BreakerTrackingType = 'frequency' | 'metric';
export type BreakerAggressiveness = 'gentle' | 'linear' | 'aggressive' | 'custom';

export interface MonthlyAllowancePlan {
  monthIndex: number; // 1, 2, 3, etc.
  targetAllowance: number; // Max allowed execution days OR daily quantitative ceiling
}

export interface HabitBreakerLogEntry {
  dateISO: string; // "YYYY-MM-DD"
  executed: boolean; // Did perform the bad habit on this day
  metricValue?: number; // Quantitative float value (e.g. 2.33 hrs screen time, 10 cigarettes)
  metricHours?: number; // Exact hours (e.g. 2)
  metricMinutes?: number; // Exact minutes (e.g. 20)
  notes?: string;
  loggedAt: string; // Exact ISO timestamp when log was recorded
}

export interface HabitBreaker {
  id: string;
  title: string; // e.g. "Late-Night Doomscrolling", "Vaping / Nicotine", "Fast Food / Sugar"
  description?: string;
  category: string;
  color: string;
  createdAt: string; // ISO date
  startDate: string; // "YYYY-MM-DD"
  durationMonths: number; // 1 to 6 months
  aggressiveness: BreakerAggressiveness;
  trackingType: BreakerTrackingType;
  metricUnit?: string; // "hours", "min", "cigs", "$", "times"
  startingAllowance: number; // e.g. 21 days or 4.0 hrs/day
  monthlyPlan: MonthlyAllowancePlan[]; // Progressive monthly quota schedule
  logs: Record<string, HabitBreakerLogEntry>; // dateISO -> log
}

// -------------------------------------------------------------
// Immutable Action Audit Ledger
// -------------------------------------------------------------
export type ActionType =
  | 'habit_toggle'
  | 'subtask_toggle'
  | 'metric_update'
  | 'habit_create'
  | 'habit_delete'
  | 'habit_restore'
  | 'workout_save'
  | 'workout_delete'
  | 'workout_restore'
  | 'objective_update'
  | 'objective_create'
  | 'objective_delete'
  | 'objective_restore'
  | 'breaker_create'
  | 'breaker_log'
  | 'breaker_delete'
  | 'breaker_restore'
  | 'trash_purge'
  | 'task_create'
  | 'task_complete'
  | 'task_delete'
  | 'task_restore'
  | 'sleep_log'
  | 'photo_upload'
  | 'photo_delete'
  | 'settings_update';

export interface ActionLog {
  id: string;
  timestamp: string; // Full ISO datetime string: "2026-09-15T03:00:12.456Z"
  actionType: ActionType;
  entityId: string;
  entityTitle: string;
  details: string; // Human-readable description of the exact mutation
  metadata?: Record<string, any>;
}

// -------------------------------------------------------------
// Tasks & Deadlines (Manual Task System with Auto-Archiving)
// -------------------------------------------------------------
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskItem {
  id: string;
  title: string;
  deadline: string; // "YYYY-MM-DD"
  completed: boolean;
  createdAt: string; // ISO date
  completedAt?: string; // ISO date when completed
  priority?: TaskPriority;
  notes?: string;
}

// -------------------------------------------------------------
// Sleep Tracking System
// -------------------------------------------------------------
export interface SleepLog {
  dateISO: string; // "YYYY-MM-DD"
  durationHours: number; // e.g. 7.5 or 5.75
  durationMinutesTotal: number; // e.g. 450 or 345
  durationTime?: string; // "07:30", "05:45", "06:59" (HH:mm format)
  bedtime: string; // "23:15" (24h format)
  wakeTime: string; // "07:15" (24h format)
  qualityScore?: number; // 1 to 100 or 1 to 5
  notes?: string;
  photoIds?: string[]; // IDs pointing to photo vault
  updatedAt: string;
}

// -------------------------------------------------------------
// Visual Progress & Photo Metadata (<1MB Optimized)
// -------------------------------------------------------------
export type PhotoCategory = 'fitness' | 'sleep' | 'workout';

export interface PhotoMetadata {
  id: string;
  dateISO: string; // "YYYY-MM-DD"
  uploadedAt: string; // ISO string with exact hour:min:sec
  originalSizeKB: number;
  compressedSizeKB: number; // strictly < 1024 KB
  width: number;
  height: number;
  mimeType: string;
  category: PhotoCategory;
  caption?: string;
  publicUrl?: string; // Direct cloud image URL from Supabase Storage
  storagePath?: string; // Bucket object path
}


// -------------------------------------------------------------
// User Settings & App Preferences
// -------------------------------------------------------------
export interface UserSettings {
  userName: string;
  theme: 'cyber-dark' | 'midnight' | 'stealth';
  sleepTargetHours: number; // e.g. 8.0
  targetBedtime: string; // "23:00"
  targetWakeTime: string; // "07:00"
  autoArchiveTasksAfterDays: number;
  defaultLLMProvider: 'groq' | 'gemini' | 'openrouter' | 'nvidia' | 'ollama';
  defaultModelId: string;
  autoFallbackEnabled: boolean;
  customApiKeys?: {
    groq?: string;
    openrouter?: string;
    gemini?: string;
    nvidia?: string;
    ollamaUrl?: string;
  };
}

// -------------------------------------------------------------
// Unified Application Data Backup
// -------------------------------------------------------------
export interface AppDataBackup {
  version: string;
  exportedAt: string;
  habits: Habit[];
  objectives: Objective[];
  workoutLogs: Record<string, WorkoutDayLog>; // dateISO -> log
  muscleGroups: MuscleGroup[];
  gymProfile: UserGymProfile;
  trash: TrashItem[]; // 30-day soft-delete retention
  habitBreakers: HabitBreaker[]; // Habit elimination engine
  actionLogs: ActionLog[]; // Immutable datetime audit trail
  tasks: TaskItem[]; // Active pending tasks
  completedTasks: TaskItem[]; // Lightweight archived task history
  sleepLogs: Record<string, SleepLog>; // dateISO -> sleep log
  fitnessPhotos: Record<string, PhotoMetadata[]>; // dateISO -> photo metadata list
  settings?: UserSettings;
}
