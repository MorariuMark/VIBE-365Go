import { Habit, Objective, MuscleGroup, WorkoutDayLog, UserGymProfile, AppDataBackup } from '@/types';

export const INITIAL_MUSCLE_GROUPS: MuscleGroup[] = [
  // Push split muscle groups
  {
    id: 'chest',
    name: 'Chest',
    defaultSplit: 'push',
    isPermanent: true,
    exercises: [
      { id: 'chest_press', name: 'Chest Press (Flat Barbell)', muscleGroupId: 'chest' },
      { id: 'incline_db_press', name: 'Incline Dumbbell Press', muscleGroupId: 'chest' },
      { id: 'cable_fly', name: 'Cable Chest Fly', muscleGroupId: 'chest' },
      { id: 'dips', name: 'Weighted Chest Dips', muscleGroupId: 'chest' },
      { id: 'pushups', name: 'Push-ups', muscleGroupId: 'chest' },
    ],
  },
  {
    id: 'triceps',
    name: 'Triceps',
    defaultSplit: 'push',
    isPermanent: true,
    exercises: [
      { id: 'tricep_rope_pushdown', name: 'Tricep Rope Pushdown', muscleGroupId: 'triceps' },
      { id: 'skull_crushers', name: 'EZ-Bar Skull Crushers', muscleGroupId: 'triceps' },
      { id: 'overhead_db_ext', name: 'Overhead Dumbbell Extension', muscleGroupId: 'triceps' },
      { id: 'close_grip_bench', name: 'Close-Grip Bench Press', muscleGroupId: 'triceps' },
    ],
  },
  {
    id: 'shoulders',
    name: 'Shoulders',
    defaultSplit: 'push',
    isPermanent: true,
    exercises: [
      { id: 'ohp', name: 'Overhead Barbell Press', muscleGroupId: 'shoulders' },
      { id: 'lateral_raises', name: 'Dumbbell Lateral Raises', muscleGroupId: 'shoulders' },
      { id: 'face_pulls', name: 'Cable Face Pulls', muscleGroupId: 'shoulders' },
      { id: 'rear_delt_fly', name: 'Rear Delt Reverse Fly', muscleGroupId: 'shoulders' },
    ],
  },

  // Pull split muscle groups
  {
    id: 'back',
    name: 'Back',
    defaultSplit: 'pull',
    isPermanent: true,
    exercises: [
      { id: 'lat_pulldown', name: 'Lat Pulldown', muscleGroupId: 'back' },
      { id: 'barbell_row', name: 'Barbell Bent-Over Row', muscleGroupId: 'back' },
      { id: 'pullups', name: 'Pull-ups / Chin-ups', muscleGroupId: 'back' },
      { id: 'seated_cable_row', name: 'Seated Cable Row', muscleGroupId: 'back' },
      { id: 'deadlift', name: 'Conventional Deadlift', muscleGroupId: 'back' },
    ],
  },
  {
    id: 'biceps',
    name: 'Biceps',
    defaultSplit: 'pull',
    isPermanent: true,
    exercises: [
      { id: 'barbell_curl', name: 'Barbell Bicep Curl', muscleGroupId: 'biceps' },
      { id: 'incline_db_curl', name: 'Incline Dumbbell Curl', muscleGroupId: 'biceps' },
      { id: 'hammer_curl', name: 'Hammer Curls', muscleGroupId: 'biceps' },
      { id: 'preacher_curl', name: 'Preacher Curl', muscleGroupId: 'biceps' },
    ],
  },

  // Legs split muscle groups
  {
    id: 'legs',
    name: 'Legs',
    defaultSplit: 'legs',
    isPermanent: true,
    exercises: [
      { id: 'barbell_squat', name: 'Barbell Back Squat', muscleGroupId: 'legs' },
      { id: 'rdl', name: 'Romanian Deadlift (RDL)', muscleGroupId: 'legs' },
      { id: 'leg_press', name: 'Leg Press 45°', muscleGroupId: 'legs' },
      { id: 'leg_extension', name: 'Quad Leg Extension', muscleGroupId: 'legs' },
      { id: 'leg_curl', name: 'Seated Hamstring Curl', muscleGroupId: 'legs' },
      { id: 'standing_calf_raise', name: 'Standing Calf Raise', muscleGroupId: 'legs' },
    ],
  },
  {
    id: 'abs',
    name: 'Abs',
    defaultSplit: 'legs',
    isPermanent: true,
    exercises: [
      { id: 'hanging_leg_raise', name: 'Hanging Leg Raises', muscleGroupId: 'abs' },
      { id: 'cable_crunch', name: 'Kneeling Cable Crunch', muscleGroupId: 'abs' },
      { id: 'ab_wheel', name: 'Ab Wheel Rollout', muscleGroupId: 'abs' },
      { id: 'plank', name: 'Weighted Plank', muscleGroupId: 'abs' },
    ],
  },
];

export const INITIAL_GYM_PROFILE: UserGymProfile = {
  workoutsPerWeekGoal: 4,
  preferredSplit: 'push',
  preferredWeightUnit: 'kg',
};

// Generate realistic date strings for past 90 days
function getDateString(offsetDays: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split('T')[0];
}

export const INITIAL_HABITS: Habit[] = [
  {
    id: 'habit_1',
    title: 'Morning Power Routine',
    description: 'Start day with hydration, sunlight, and mobility flow.',
    category: 'mindset',
    color: '#10b981', // emerald
    streak: 18,
    bestStreak: 32,
    createdAt: getDateString(60),
    targetCompletions: { count: 7, period: 'week' },
    metrics: [
      { id: 'm_water', label: 'Water Drank', type: 'number', unit: 'ml', defaultValue: 500 },
      { id: 'm_stretch', label: 'Mobility Time', type: 'number', unit: 'min', defaultValue: 10 },
      { id: 'm_sunlight', label: 'Sunlight Exposure', type: 'boolean', defaultValue: true },
    ],
    dailyMetricValues: {
      [getDateString(0)]: { m_water: 600, m_stretch: 12, m_sunlight: true },
    },
    dailyNotes: {
      [getDateString(0)]: 'Felt energized after early morning walk.',
    },
    subtasks: [
      { id: 'sub_1_1', title: 'Drink 500ml water + electrolytes', completed: true },
      { id: 'sub_1_2', title: '10 min mobility & dynamic stretch', completed: true },
      { id: 'sub_1_3', title: 'Review daily top 3 priorities', completed: false },
    ],
    history: generateHabitHistory(45, 0.85),
  },
  {
    id: 'habit_write',
    title: 'Writing & Creative Focus',
    description: 'Daily writing sprint: track active minutes and total words composed.',
    category: 'productivity',
    color: '#8b5cf6', // violet
    streak: 8,
    bestStreak: 16,
    createdAt: getDateString(30),
    targetCompletions: { count: 5, period: 'week' },
    metrics: [
      { id: 'm_write_min', label: 'Minutes', type: 'number', unit: 'min', defaultValue: 45 },
      { id: 'm_write_words', label: 'Words Written', type: 'number', unit: 'words', defaultValue: 750 },
      { id: 'm_published', label: 'Draft Exported', type: 'boolean', defaultValue: false },
      { id: 'm_topic', label: 'Theme / Topic', type: 'text', defaultValue: 'Engineering & Deep Work' },
    ],
    dailyMetricValues: {
      [getDateString(0)]: { m_write_min: 45, m_write_words: 820, m_published: true, m_topic: 'Architecture & System Design' },
    },
    dailyNotes: {
      [getDateString(0)]: 'Finished draft for the new system proposal.',
    },
    subtasks: [
      { id: 'sub_w_1', title: 'Set 45-min timer & distraction blocker', completed: true },
      { id: 'sub_w_2', title: 'Draft without self-editing for first 30 min', completed: true },
      { id: 'sub_w_3', title: 'Log total words and minutes in VIBE 365', completed: true },
    ],
    history: generateHabitHistory(45, 0.8),
  },
  {
    id: 'habit_2',
    title: 'Fitness & Strength Session',
    description: 'Hit scheduled split (Push/Pull/Legs), push to RPE 8-9 with drop sets.',
    category: 'fitness',
    color: '#06b6d4', // cyan
    streak: 12,
    bestStreak: 24,
    createdAt: getDateString(90),
    targetCompletions: { count: 4, period: 'week' },
    metrics: [
      { id: 'm_gym_min', label: 'Duration', type: 'number', unit: 'min', defaultValue: 65 },
      { id: 'm_rpe', label: 'Session RPE (1-10)', type: 'number', defaultValue: 8.5 },
    ],
    dailyMetricValues: {
      [getDateString(0)]: { m_gym_min: 65, m_rpe: 8.5 },
    },
    dailyNotes: {
      [getDateString(0)]: 'Heavy push day, broke PR on chest press.',
    },
    subtasks: [
      { id: 'sub_2_1', title: 'Dynamic warm-up & shoulder mobility', completed: true },
      { id: 'sub_2_2', title: 'Execute primary compound lifts with drop sets', completed: true },
      { id: 'sub_2_3', title: 'Log all sets, reps & kg in Fitness section', completed: true },
      { id: 'sub_2_4', title: 'Post-workout protein shake (40g)', completed: false },
    ],
    history: generateHabitHistory(45, 0.75),
  },
  {
    id: 'habit_3',
    title: 'Deep Focus Work Block (4h)',
    description: 'Distraction-free high leverage coding and engineering.',
    category: 'productivity',
    color: '#3b82f6', // blue
    streak: 9,
    bestStreak: 15,
    createdAt: getDateString(60),
    targetCompletions: { count: 20, period: 'month' },
    metrics: [
      { id: 'm_sprints', label: 'Pomodoros / Sprints', type: 'number', defaultValue: 4 },
      { id: 'm_focus_score', label: 'Focus Score (1-10)', type: 'number', defaultValue: 9 },
    ],
    subtasks: [
      { id: 'sub_3_1', title: 'Phone in Do-Not-Disturb drawer', completed: true },
      { id: 'sub_3_2', title: 'Sprint 1: 90 min uninterrupted deep work', completed: true },
      { id: 'sub_3_3', title: 'Sprint 2: 90 min technical implementation', completed: false },
    ],
    history: generateHabitHistory(45, 0.8),
  },
  {
    id: 'habit_4',
    title: 'Nutrition & 3.5L Hydration',
    description: 'Track macros, 160g+ protein, micronutrients & creatine.',
    category: 'health',
    color: '#f59e0b', // amber
    streak: 21,
    bestStreak: 21,
    createdAt: getDateString(60),
    targetCompletions: { count: 7, period: 'week' },
    metrics: [
      { id: 'm_water_liters', label: 'Water (Liters)', type: 'number', unit: 'L', defaultValue: 3.5 },
      { id: 'm_protein_g', label: 'Protein (grams)', type: 'number', unit: 'g', defaultValue: 165 },
    ],
    subtasks: [
      { id: 'sub_4_1', title: 'Drink minimum 3.5 Liters water', completed: true },
      { id: 'sub_4_2', title: 'Hit 160g protein target', completed: false },
      { id: 'sub_4_3', title: '5g Creatine monohydrate', completed: true },
    ],
    history: generateHabitHistory(45, 0.9),
  },
  {
    id: 'habit_5',
    title: 'Evening Bodyweight & Recovery',
    description: 'Weigh in, stretch, shut down screens 45 min before sleep.',
    category: 'health',
    color: '#f43f5e', // rose
    streak: 14,
    bestStreak: 28,
    createdAt: getDateString(60),
    targetCompletions: { count: 28, period: 'month' },
    subtasks: [
      { id: 'sub_5_1', title: 'Step on scale & log weight in Fitness', completed: false },
      { id: 'sub_5_2', title: 'No blue light / screen off 45m before bed', completed: false },
      { id: 'sub_5_3', title: 'Target 8 hours quality sleep', completed: false },
    ],
    history: generateHabitHistory(45, 0.78),
  },
];

export const INITIAL_OBJECTIVES: Objective[] = [
  // Daily objectives
  {
    id: 'obj_d1',
    title: 'Crush Heavy Chest Press (100kg x 12 + 70kg x 5 drop set)',
    timeframe: 'daily',
    category: 'Gym',
    dueDate: getDateString(0),
    completed: true,
    progress: 100,
    targetValue: 100,
    currentValue: 100,
    unit: 'kg',
    notes: 'Achieved complete drop set with full range of motion.',
    createdAt: getDateString(1),
  },
  {
    id: 'obj_d2',
    title: 'Complete 3.5L water hydration goal',
    timeframe: 'daily',
    category: 'Health',
    dueDate: getDateString(0),
    completed: false,
    progress: 75,
    targetValue: 3.5,
    currentValue: 2.7,
    unit: 'L',
    notes: '0.8L left before sleep.',
    createdAt: getDateString(1),
  },
  // Weekly objectives
  {
    id: 'obj_w1',
    title: 'Complete 4 Workouts this week (PPL Split)',
    timeframe: 'weekly',
    category: 'Fitness',
    dueDate: getDateString(-3),
    completed: false,
    progress: 75,
    targetValue: 4,
    currentValue: 3,
    unit: 'workouts',
    notes: 'Push and Pull completed. Legs scheduled for tomorrow.',
    createdAt: getDateString(4),
  },
  {
    id: 'obj_w2',
    title: 'Maintain 90%+ habit completion rate',
    timeframe: 'weekly',
    category: 'Habits',
    dueDate: getDateString(-2),
    completed: false,
    progress: 88,
    targetValue: 90,
    currentValue: 88,
    unit: '%',
    notes: 'Going strong on all morning subtasks.',
    createdAt: getDateString(5),
  },
  // Monthly objectives
  {
    id: 'obj_m1',
    title: 'Increase Chest Press working weight from 90kg to 105kg',
    timeframe: 'monthly',
    category: 'Gym',
    dueDate: getDateString(-20),
    completed: false,
    progress: 80,
    targetValue: 105,
    currentValue: 100,
    unit: 'kg',
    notes: 'Up from 90kg last month! +10kg increase achieved, 5kg remaining.',
    createdAt: getDateString(25),
  },
  {
    id: 'obj_m2',
    title: 'Log bodyweight for 28 out of 30 days',
    timeframe: 'monthly',
    category: 'Health',
    dueDate: getDateString(-15),
    completed: false,
    progress: 86,
    targetValue: 28,
    currentValue: 24,
    unit: 'days',
    notes: 'Consistent morning weighing trend.',
    createdAt: getDateString(25),
  },
  // Quarterly objectives
  {
    id: 'obj_q1',
    title: 'Gain 2.5kg lean muscle with progressive overload',
    timeframe: 'quarterly',
    category: 'Fitness',
    dueDate: getDateString(-60),
    completed: false,
    progress: 68,
    targetValue: 2.5,
    currentValue: 1.7,
    unit: 'kg',
    notes: 'Bodyweight steadily transitioning from 77.5kg to 79.2kg.',
    createdAt: getDateString(70),
  },
  {
    id: 'obj_q2',
    title: 'Achieve 50-day consistency streak on core habits',
    timeframe: 'quarterly',
    category: 'Mastery',
    dueDate: getDateString(-45),
    completed: false,
    progress: 72,
    targetValue: 50,
    currentValue: 36,
    unit: 'days',
    notes: 'Longest streak is 32 days so far.',
    createdAt: getDateString(60),
  },
];

function generateHabitHistory(days: number, probability: number): Record<string, boolean> {
  const history: Record<string, boolean> = {};
  for (let i = 0; i <= days; i++) {
    const dateStr = getDateString(i);
    // Pseudo-random but deterministic based on day
    const val = ((i * 37 + 13) % 100) / 100;
    history[dateStr] = val < probability;
  }
  return history;
}

export function generateInitialWorkoutLogs(): Record<string, WorkoutDayLog> {
  const logs: Record<string, WorkoutDayLog> = {};

  // Generate logs over the past 30 days with progressive overload on Chest Press, Squats, Rows
  const sessions = [
    {
      offset: 0, // Today
      title: 'Heavy Push A - Peak Chest & Delts',
      split: 'push' as const,
      groups: ['chest', 'triceps', 'shoulders'],
      weight: 79.4,
      completed: true,
      exercises: [
        {
          id: 'ex_log_1',
          exerciseId: 'chest_press',
          exerciseName: 'Chest Press (Flat Barbell)',
          muscleGroupId: 'chest',
          muscleGroupName: 'Chest',
          sets: [
            { id: 's1', setNumber: 1, weightKg: 90, reps: 12, completed: true },
            { id: 's2', setNumber: 2, weightKg: 95, reps: 10, completed: true },
            {
              id: 's3',
              setNumber: 3,
              weightKg: 100,
              reps: 12,
              isDropSet: true,
              dropSet: { weightKg: 70, reps: 5 },
              completed: true,
            },
          ],
          notes: 'PR set! Formula: 100kg x 12 + 70kg x 5 drop set.',
        },
        {
          id: 'ex_log_2',
          exerciseId: 'incline_db_press',
          exerciseName: 'Incline Dumbbell Press',
          muscleGroupId: 'chest',
          muscleGroupName: 'Chest',
          sets: [
            { id: 's4', setNumber: 1, weightKg: 32, reps: 10, completed: true },
            {
              id: 's5',
              setNumber: 2,
              weightKg: 34,
              reps: 8,
              isDropSet: true,
              dropSet: { weightKg: 24, reps: 6 },
              completed: true,
            },
          ],
        },
        {
          id: 'ex_log_3',
          exerciseId: 'lateral_raises',
          exerciseName: 'Dumbbell Lateral Raises',
          muscleGroupId: 'shoulders',
          muscleGroupName: 'Shoulders',
          sets: [
            { id: 's6', setNumber: 1, weightKg: 14, reps: 15, completed: true },
            {
              id: 's7',
              setNumber: 2,
              weightKg: 16,
              reps: 12,
              isDropSet: true,
              dropSet: { weightKg: 10, reps: 8 },
              completed: true,
            },
          ],
        },
        {
          id: 'ex_log_4',
          exerciseId: 'tricep_rope_pushdown',
          exerciseName: 'Tricep Rope Pushdown',
          muscleGroupId: 'triceps',
          muscleGroupName: 'Triceps',
          sets: [
            { id: 's8', setNumber: 1, weightKg: 35, reps: 15, completed: true },
            {
              id: 's9',
              setNumber: 2,
              weightKg: 40,
              reps: 12,
              isDropSet: true,
              dropSet: { weightKg: 25, reps: 8 },
              completed: true,
            },
          ],
        },
      ],
    },
    {
      offset: 2, // 2 days ago: Pull
      title: 'Hypertrophy Pull - Lats & Arms',
      split: 'pull' as const,
      groups: ['back', 'biceps'],
      weight: 79.2,
      completed: true,
      exercises: [
        {
          id: 'ex_log_p1',
          exerciseId: 'lat_pulldown',
          exerciseName: 'Lat Pulldown',
          muscleGroupId: 'back',
          muscleGroupName: 'Back',
          sets: [
            { id: 'sp1', setNumber: 1, weightKg: 75, reps: 12, completed: true },
            {
              id: 'sp2',
              setNumber: 2,
              weightKg: 85,
              reps: 10,
              isDropSet: true,
              dropSet: { weightKg: 60, reps: 6 },
              completed: true,
            },
          ],
        },
        {
          id: 'ex_log_p2',
          exerciseId: 'barbell_row',
          exerciseName: 'Barbell Bent-Over Row',
          muscleGroupId: 'back',
          muscleGroupName: 'Back',
          sets: [
            { id: 'sp3', setNumber: 1, weightKg: 80, reps: 10, completed: true },
            { id: 'sp4', setNumber: 2, weightKg: 85, reps: 8, completed: true },
          ],
        },
        {
          id: 'ex_log_p3',
          exerciseId: 'barbell_curl',
          exerciseName: 'Barbell Bicep Curl',
          muscleGroupId: 'biceps',
          muscleGroupName: 'Biceps',
          sets: [
            { id: 'sp5', setNumber: 1, weightKg: 35, reps: 12, completed: true },
            {
              id: 'sp6',
              setNumber: 2,
              weightKg: 40,
              reps: 8,
              isDropSet: true,
              dropSet: { weightKg: 25, reps: 6 },
              completed: true,
            },
          ],
        },
      ],
    },
    {
      offset: 4, // 4 days ago: Legs
      title: 'Heavy Legs & Core Foundation',
      split: 'legs' as const,
      groups: ['legs', 'abs'],
      weight: 79.0,
      completed: true,
      exercises: [
        {
          id: 'ex_log_l1',
          exerciseId: 'barbell_squat',
          exerciseName: 'Barbell Back Squat',
          muscleGroupId: 'legs',
          muscleGroupName: 'Legs',
          sets: [
            { id: 'sl1', setNumber: 1, weightKg: 110, reps: 8, completed: true },
            { id: 'sl2', setNumber: 2, weightKg: 120, reps: 6, completed: true },
            {
              id: 'sl3',
              setNumber: 3,
              weightKg: 125,
              reps: 5,
              isDropSet: true,
              dropSet: { weightKg: 90, reps: 6 },
              completed: true,
            },
          ],
        },
        {
          id: 'ex_log_l2',
          exerciseId: 'hanging_leg_raise',
          exerciseName: 'Hanging Leg Raises',
          muscleGroupId: 'abs',
          muscleGroupName: 'Abs',
          sets: [
            { id: 'sl4', setNumber: 1, weightKg: 0, reps: 15, completed: true },
            { id: 'sl5', setNumber: 2, weightKg: 0, reps: 15, completed: true },
          ],
        },
      ],
    },
    {
      offset: 7, // 1 week ago: Push
      title: 'Push Power Split',
      split: 'push' as const,
      groups: ['chest', 'triceps', 'shoulders'],
      weight: 78.8,
      completed: true,
      exercises: [
        {
          id: 'ex_log_w1',
          exerciseId: 'chest_press',
          exerciseName: 'Chest Press (Flat Barbell)',
          muscleGroupId: 'chest',
          muscleGroupName: 'Chest',
          sets: [
            { id: 'sw1', setNumber: 1, weightKg: 85, reps: 12, completed: true },
            { id: 'sw2', setNumber: 2, weightKg: 92.5, reps: 10, completed: true },
            {
              id: 'sw3',
              setNumber: 3,
              weightKg: 95,
              reps: 10,
              isDropSet: true,
              dropSet: { weightKg: 65, reps: 5 },
              completed: true,
            },
          ],
        },
      ],
    },
    {
      offset: 14, // 2 weeks ago: Push
      title: 'Push Progression Week 2',
      split: 'push' as const,
      groups: ['chest', 'triceps', 'shoulders'],
      weight: 78.5,
      completed: true,
      exercises: [
        {
          id: 'ex_log_w2',
          exerciseId: 'chest_press',
          exerciseName: 'Chest Press (Flat Barbell)',
          muscleGroupId: 'chest',
          muscleGroupName: 'Chest',
          sets: [
            { id: 'sw4', setNumber: 1, weightKg: 82.5, reps: 12, completed: true },
            { id: 'sw5', setNumber: 2, weightKg: 87.5, reps: 10, completed: true },
            {
              id: 'sw6',
              setNumber: 3,
              weightKg: 92.5,
              reps: 8,
              isDropSet: true,
              dropSet: { weightKg: 60, reps: 6 },
              completed: true,
            },
          ],
        },
      ],
    },
    {
      offset: 21, // 3 weeks ago: Push
      title: 'Push Progression Week 1',
      split: 'push' as const,
      groups: ['chest', 'triceps', 'shoulders'],
      weight: 78.1,
      completed: true,
      exercises: [
        {
          id: 'ex_log_w3',
          exerciseId: 'chest_press',
          exerciseName: 'Chest Press (Flat Barbell)',
          muscleGroupId: 'chest',
          muscleGroupName: 'Chest',
          sets: [
            { id: 'sw7', setNumber: 1, weightKg: 80, reps: 12, completed: true },
            { id: 'sw8', setNumber: 2, weightKg: 85, reps: 10, completed: true },
            {
              id: 'sw9',
              setNumber: 3,
              weightKg: 87.5,
              reps: 8,
              isDropSet: true,
              dropSet: { weightKg: 60, reps: 5 },
              completed: true,
            },
          ],
        },
      ],
    },
    {
      offset: 28, // 4 weeks ago: Push baseline
      title: 'Push Baseline Assessment',
      split: 'push' as const,
      groups: ['chest', 'triceps', 'shoulders'],
      weight: 77.8,
      completed: true,
      exercises: [
        {
          id: 'ex_log_w4',
          exerciseId: 'chest_press',
          exerciseName: 'Chest Press (Flat Barbell)',
          muscleGroupId: 'chest',
          muscleGroupName: 'Chest',
          sets: [
            { id: 'sw10', setNumber: 1, weightKg: 75, reps: 12, completed: true },
            { id: 'sw11', setNumber: 2, weightKg: 80, reps: 10, completed: true },
            {
              id: 'sw12',
              setNumber: 3,
              weightKg: 82.5,
              reps: 8,
              isDropSet: true,
              dropSet: { weightKg: 55, reps: 5 },
              completed: true,
            },
          ],
        },
      ],
    },
  ];

  sessions.forEach((s) => {
    const dateStr = getDateString(s.offset);
    logs[dateStr] = {
      id: `workout_${dateStr}`,
      dateISO: dateStr,
      title: s.title,
      splitType: s.split,
      muscleGroups: s.groups,
      exercises: s.exercises,
      bodyWeightKg: s.weight,
      completed: s.completed,
      notes: `Session logged on ${dateStr}. Focus on strict mechanical tension.`,
    };
  });

  return logs;
}

export function getFullDefaultBackup(): AppDataBackup {
  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    habits: INITIAL_HABITS,
    objectives: INITIAL_OBJECTIVES,
    workoutLogs: generateInitialWorkoutLogs(),
    muscleGroups: INITIAL_MUSCLE_GROUPS,
    gymProfile: INITIAL_GYM_PROFILE,
  };
}
