export type ObjectiveTimeframe = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface HabitSubtask {
  id: string;
  title: string;
  completed: boolean;
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
}

export interface AppDataBackup {
  version: string;
  exportedAt: string;
  habits: Habit[];
  objectives: Objective[];
  workoutLogs: Record<string, WorkoutDayLog>; // dateISO -> log
  muscleGroups: MuscleGroup[];
  gymProfile: UserGymProfile;
}
