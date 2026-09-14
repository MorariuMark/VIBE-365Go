'use client';

import React, { useState, useEffect } from 'react';
import {
  WorkoutDayLog,
  MuscleGroup,
  SplitType,
  LoggedExercise,
  GymSet,
  DropSet,
} from '@/types';
import { formatDatePretty } from '@/lib/utils';
import {
  X,
  Dumbbell,
  CheckCircle2,
  Plus,
  Trash2,
  Copy,
  Scale,
  Sparkles,
  ChevronDown,
  Layers,
  Save,
  Check,
  Bookmark,
  FileText,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DayWorkoutModalProps {
  dateISO: string;
  workout: WorkoutDayLog | undefined;
  muscleGroups: MuscleGroup[];
  onClose: () => void;
  onSaveWorkout: (workout: WorkoutDayLog) => void;
  onAddCustomMuscleGroup: (
    name: string,
    split: 'push' | 'pull' | 'legs' | 'custom',
    isPermanent: boolean
  ) => MuscleGroup;
  onAddCustomExercise: (muscleGroupId: string, exerciseName: string) => void;
  previousWeightKg?: number;
}

export const DayWorkoutModal: React.FC<DayWorkoutModalProps> = ({
  dateISO,
  workout,
  muscleGroups,
  onClose,
  onSaveWorkout,
  onAddCustomMuscleGroup,
  onAddCustomExercise,
  previousWeightKg,
}) => {
  // Determine default split & active muscle groups based on default templates
  const initialSplit: SplitType = workout?.splitType || 'push';

  const getDefaultGroupsForSplit = (split: SplitType): string[] => {
    if (split === 'push') return ['chest', 'triceps', 'shoulders'];
    if (split === 'pull') return ['back', 'biceps'];
    if (split === 'legs') return ['legs', 'abs'];
    return [];
  };

  const [title, setTitle] = useState(
    workout?.title || `${initialSplit.toUpperCase()} Session`
  );
  const [splitType, setSplitType] = useState<SplitType>(initialSplit);
  const [activeMuscleGroupIds, setActiveMuscleGroupIds] = useState<string[]>(
    workout?.muscleGroups && workout.muscleGroups.length > 0
      ? workout.muscleGroups
      : getDefaultGroupsForSplit(initialSplit)
  );
  const [exercises, setExercises] = useState<LoggedExercise[]>(
    workout?.exercises || []
  );
  const [notes, setNotes] = useState(workout?.notes || '');
  const [bodyWeightKg, setBodyWeightKg] = useState<string>(
    workout?.bodyWeightKg !== undefined ? String(workout.bodyWeightKg) : ''
  );
  const [completed, setCompleted] = useState<boolean>(workout?.completed || false);

  // Modal UI state for adding custom muscle group
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isGroupPermanent, setIsGroupPermanent] = useState(true);

  // New exercise creation under a muscle group
  const [addingExerciseToGroupId, setAddingExerciseToGroupId] = useState<string | null>(null);
  const [newExerciseName, setNewExerciseName] = useState('');

  // When splitType changes, update default active muscle groups if empty or user switches
  const handleSplitChange = (newSplit: SplitType) => {
    setSplitType(newSplit);
    const defaults = getDefaultGroupsForSplit(newSplit);
    setActiveMuscleGroupIds(defaults);
    if (!workout?.title || workout.title.endsWith('Session')) {
      setTitle(`${newSplit.charAt(0).toUpperCase() + newSplit.slice(1)} Session`);
    }
  };

  // Add muscle group to current day
  const handleAddExistingGroupToDay = (groupId: string) => {
    if (!activeMuscleGroupIds.includes(groupId)) {
      setActiveMuscleGroupIds([...activeMuscleGroupIds, groupId]);
    }
  };

  const handleCreateCustomMuscleGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const created = onAddCustomMuscleGroup(
      newGroupName.trim(),
      splitType === 'rest' ? 'custom' : splitType,
      isGroupPermanent
    );

    setActiveMuscleGroupIds((prev) => [...prev, created.id]);
    setNewGroupName('');
    setShowAddGroupModal(false);
  };

  const handleRemoveGroupFromDay = (groupId: string) => {
    setActiveMuscleGroupIds(activeMuscleGroupIds.filter((id) => id !== groupId));
  };

  // Sticky exercise creation: adds to permanent library of that muscle group
  const handleCreateStickyExercise = (muscleGroupId: string) => {
    if (!newExerciseName.trim()) return;
    onAddCustomExercise(muscleGroupId, newExerciseName.trim());

    // Also add to today's workout directly
    const targetGroup = muscleGroups.find((g) => g.id === muscleGroupId);
    handleAddExerciseToWorkout(
      muscleGroupId,
      `ex_${Date.now()}`,
      newExerciseName.trim(),
      targetGroup?.name || 'Muscle Group'
    );

    setNewExerciseName('');
    setAddingExerciseToGroupId(null);
  };

  // Add exercise into today's logged exercises
  const handleAddExerciseToWorkout = (
    muscleGroupId: string,
    exerciseId: string,
    exerciseName: string,
    muscleGroupName: string
  ) => {
    const newLogged: LoggedExercise = {
      id: `logged_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      exerciseId,
      exerciseName,
      muscleGroupId,
      muscleGroupName,
      sets: [
        {
          id: `set_${Date.now()}_1`,
          setNumber: 1,
          weightKg: 80,
          reps: 10,
          completed: false,
          isDropSet: false,
        },
      ],
      notes: '',
    };
    setExercises([...exercises, newLogged]);
  };

  const handleRemoveExerciseFromWorkout = (loggedId: string) => {
    setExercises(exercises.filter((e) => e.id !== loggedId));
  };

  // Set management
  const handleAddSet = (exerciseId: string) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSetNumber = ex.sets.length + 1;
        const newSet: GymSet = {
          id: `set_${Date.now()}_${newSetNumber}`,
          setNumber: newSetNumber,
          weightKg: lastSet ? lastSet.weightKg : 60,
          reps: lastSet ? lastSet.reps : 10,
          completed: false,
          isDropSet: false,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      })
    );
  };

  const handleDuplicateSet = (exerciseId: string, setIndex: number) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const target = ex.sets[setIndex];
        const duplicated: GymSet = {
          ...target,
          id: `set_${Date.now()}_dup`,
          setNumber: ex.sets.length + 1,
          completed: false,
        };
        return { ...ex, sets: [...ex.sets, duplicated] };
      })
    );
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const filtered = ex.sets
          .filter((s) => s.id !== setId)
          .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
        return { ...ex, sets: filtered };
      })
    );
  };

  const handleUpdateSet = (
    exerciseId: string,
    setId: string,
    patch: Partial<GymSet>
  ) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
        };
      })
    );
  };

  const handleToggleDropSet = (exerciseId: string, setId: string) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => {
            if (s.id !== setId) return s;
            const willEnable = !s.isDropSet;
            const dropSetData: DropSet | undefined = willEnable
              ? { weightKg: Math.round(s.weightKg * 0.7), reps: 5 }
              : undefined;
            return {
              ...s,
              isDropSet: willEnable,
              dropSet: dropSetData,
            };
          }),
        };
      })
    );
  };

  const handleSaveAll = () => {
    const numericWeight = bodyWeightKg ? parseFloat(bodyWeightKg) : undefined;
    const finalWorkout: WorkoutDayLog = {
      id: workout?.id || `workout_${dateISO}`,
      dateISO,
      title: title.trim() || `${splitType.toUpperCase()} Workout`,
      notes: notes.trim() || undefined,
      splitType,
      muscleGroups: activeMuscleGroupIds,
      exercises,
      bodyWeightKg: numericWeight,
      completed,
    };

    onSaveWorkout(finalWorkout);

    if (completed) {
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#10b981', '#f59e0b'],
        });
      } catch {
        // Fallback
      }
    }

    onClose();
  };

  // Weight difference
  const weightDiff =
    bodyWeightKg && previousWeightKg
      ? (parseFloat(bodyWeightKg) - previousWeightKg).toFixed(1)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Sticky Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 bg-slate-900/95 sticky top-0 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                {formatDatePretty(dateISO)}
              </span>
              <button
                type="button"
                onClick={() => setCompleted(!completed)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition ${
                  completed
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${completed ? 'text-emerald-400' : ''}`} />
                <span>{completed ? 'Completed' : 'Mark Complete'}</span>
              </button>
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Assign Workout Title (e.g. Heavy Push A - PR Day)..."
              className="mt-2 text-xl sm:text-2xl font-black text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-500 outline-none w-full placeholder:text-slate-600 transition"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleSaveAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20"
            >
              <Save className="w-4 h-4" />
              <span>Save Session</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Split Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Select Workout Split
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(['push', 'pull', 'legs', 'rest', 'custom'] as SplitType[]).map((split) => (
                <button
                  key={split}
                  type="button"
                  onClick={() => handleSplitChange(split)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                    splitType === split
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {split}
                </button>
              ))}
            </div>
          </div>

          {/* Muscle Groups Active for Today */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Muscle Groups for Today
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddGroupModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Muscle Group</span>
                </button>
              </div>
            </div>

            {/* Active Muscle Group Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {activeMuscleGroupIds.map((grpId) => {
                const grp = muscleGroups.find((g) => g.id === grpId);
                const displayName = grp ? grp.name : grpId;
                return (
                  <div
                    key={grpId}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-medium shadow-sm"
                  >
                    <span>{displayName}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveGroupFromDay(grpId)}
                      className="text-slate-400 hover:text-rose-400"
                      title="Remove from this session"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Quick Add Available Groups if not yet added */}
            {muscleGroups.filter((g) => !activeMuscleGroupIds.includes(g.id)).length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-slate-800/50 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                <span className="text-slate-500">Quick add:</span>
                {muscleGroups
                  .filter((g) => !activeMuscleGroupIds.includes(g.id))
                  .map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleAddExistingGroupToDay(g.id)}
                      className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-cyan-400 transition"
                    >
                      + {g.name}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Muscle Groups Exercises Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-cyan-400" />
                Exercise Log & Sets
              </h4>
              <span className="text-xs text-slate-500">
                Formula: Weight (kg) × Reps + Drop Set
              </span>
            </div>

            {activeMuscleGroupIds.map((grpId) => {
              const grp = muscleGroups.find((g) => g.id === grpId);
              const groupName = grp ? grp.name : grpId;
              const groupLoggedExercises = exercises.filter(
                (e) => e.muscleGroupId === grpId
              );

              return (
                <div
                  key={grpId}
                  className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4"
                >
                  {/* Muscle Group Title & Sticky Exercises Picker */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                      <h5 className="text-base font-bold text-white tracking-wide">
                        {groupName}
                      </h5>
                    </div>

                    {/* Exercise Selectors & Sticky Creator */}
                    <div className="flex flex-wrap items-center gap-2">
                      {grp && grp.exercises && grp.exercises.length > 0 && (
                        <select
                          onChange={(e) => {
                            if (!e.target.value) return;
                            const sel = grp.exercises.find((x) => x.id === e.target.value);
                            if (sel) {
                              handleAddExerciseToWorkout(grpId, sel.id, sel.name, groupName);
                            }
                            e.target.value = '';
                          }}
                          defaultValue=""
                          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                        >
                          <option value="" disabled>
                            + Choose {groupName} Exercise...
                          </option>
                          {grp.exercises.map((ex) => (
                            <option key={ex.id} value={ex.id}>
                              {ex.name}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setAddingExerciseToGroupId(
                            addingExerciseToGroupId === grpId ? null : grpId
                          )
                        }
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-semibold transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Sticky Exercise</span>
                      </button>
                    </div>
                  </div>

                  {/* Add sticky exercise input field */}
                  {addingExerciseToGroupId === grpId && (
                    <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/40 flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <input
                        type="text"
                        value={newExerciseName}
                        onChange={(e) => setNewExerciseName(e.target.value)}
                        placeholder={`New exercise name for ${groupName} (sticks forever)...`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateStickyExercise(grpId);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleCreateStickyExercise(grpId)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition"
                      >
                        Save & Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingExerciseToGroupId(null)}
                        className="p-1.5 text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Logged exercises list under this muscle group */}
                  <div className="space-y-4">
                    {groupLoggedExercises.map((loggedEx) => (
                      <div
                        key={loggedEx.id}
                        className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3"
                      >
                        {/* Exercise Title Bar */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              {loggedEx.exerciseName}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveExerciseFromWorkout(loggedEx.id)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Remove exercise"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Sets Table - Responsive */}
                        <div className="space-y-2">
                          {/* Desktop Column Header */}
                          <div className="hidden sm:grid grid-cols-12 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                            <span className="col-span-1">Set</span>
                            <span className="col-span-3">Weight (kg)</span>
                            <span className="col-span-2">Reps</span>
                            <span className="col-span-4">Drop Set (Optional)</span>
                            <span className="col-span-2 text-right">Done</span>
                          </div>

                          {loggedEx.sets.map((set, setIdx) => (
                            <div
                              key={set.id}
                              className={`p-3 sm:p-2 rounded-xl border transition ${
                                set.completed
                                  ? 'bg-emerald-950/25 border-emerald-800/40'
                                  : 'bg-slate-950/60 border-slate-800'
                              }`}
                            >
                              {/* Desktop Grid Layout */}
                              <div className="hidden sm:grid grid-cols-12 items-center gap-2">
                                <div className="col-span-1 font-bold text-xs text-slate-300">
                                  #{set.setNumber}
                                </div>
                                <div className="col-span-3 flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={set.weightKg}
                                    onChange={(e) =>
                                      handleUpdateSet(loggedEx.id, set.id, {
                                        weightKg: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                                  />
                                  <span className="text-[10px] text-slate-500 font-semibold">kg</span>
                                </div>
                                <div className="col-span-2 flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={set.reps}
                                    onChange={(e) =>
                                      handleUpdateSet(loggedEx.id, set.id, {
                                        reps: parseInt(e.target.value, 10) || 0,
                                      })
                                    }
                                    className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                                  />
                                  <span className="text-[10px] text-slate-500 font-semibold">reps</span>
                                </div>
                                <div className="col-span-4">
                                  {set.isDropSet && set.dropSet ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-amber-400 font-bold text-xs">+</span>
                                      <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        placeholder="kg"
                                        value={set.dropSet.weightKg}
                                        onChange={(e) =>
                                          handleUpdateSet(loggedEx.id, set.id, {
                                            dropSet: {
                                              ...set.dropSet!,
                                              weightKg: parseFloat(e.target.value) || 0,
                                            },
                                          })
                                        }
                                        className="w-14 px-1.5 py-1 rounded-lg bg-slate-900 border border-amber-500/50 text-xs font-bold text-amber-300 focus:outline-none"
                                      />
                                      <span className="text-[10px] text-slate-500">kg ×</span>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="reps"
                                        value={set.dropSet.reps}
                                        onChange={(e) =>
                                          handleUpdateSet(loggedEx.id, set.id, {
                                            dropSet: {
                                              ...set.dropSet!,
                                              reps: parseInt(e.target.value, 10) || 0,
                                            },
                                          })
                                        }
                                        className="w-12 px-1.5 py-1 rounded-lg bg-slate-900 border border-amber-500/50 text-xs font-bold text-amber-300 focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleToggleDropSet(loggedEx.id, set.id)}
                                        className="text-slate-500 hover:text-rose-400 p-0.5"
                                        title="Remove drop set"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleDropSet(loggedEx.id, set.id)}
                                      className="text-[11px] font-semibold text-slate-400 hover:text-amber-400 transition flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>Add Drop Set</span>
                                    </button>
                                  )}
                                </div>
                                <div className="col-span-2 flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleDuplicateSet(loggedEx.id, setIdx)}
                                    className="p-1 rounded text-slate-500 hover:text-white"
                                    title="Duplicate set"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSet(loggedEx.id, set.id)}
                                    className="p-1 rounded text-slate-500 hover:text-rose-400"
                                    title="Delete set"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateSet(loggedEx.id, set.id, {
                                        completed: !set.completed,
                                      })
                                    }
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center border transition ${
                                      set.completed
                                        ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                        : 'bg-slate-800 border-slate-700 text-transparent hover:border-emerald-500'
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </button>
                                </div>
                              </div>

                              {/* Mobile Stacked Layout */}
                              <div className="sm:hidden space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-white">Set #{set.setNumber}</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleDuplicateSet(loggedEx.id, setIdx)}
                                      className="p-1 text-slate-400 hover:text-white"
                                      title="Duplicate set"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSet(loggedEx.id, set.id)}
                                      className="p-1 text-slate-400 hover:text-rose-400"
                                      title="Delete set"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateSet(loggedEx.id, set.id, {
                                          completed: !set.completed,
                                        })
                                      }
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${
                                        set.completed
                                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                          : 'bg-slate-800 text-slate-400 border-slate-700'
                                      }`}
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>{set.completed ? 'Done' : 'Mark'}</span>
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[10px] text-slate-400 mb-0.5">Weight (kg)</label>
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      value={set.weightKg}
                                      onChange={(e) =>
                                        handleUpdateSet(loggedEx.id, set.id, {
                                          weightKg: parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-400 mb-0.5">Reps</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={set.reps}
                                      onChange={(e) =>
                                        handleUpdateSet(loggedEx.id, set.id, {
                                          reps: parseInt(e.target.value, 10) || 0,
                                        })
                                      }
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                                    />
                                  </div>
                                </div>

                                {/* Drop Set on Mobile */}
                                <div className="pt-1">
                                  {set.isDropSet && set.dropSet ? (
                                    <div className="bg-slate-900 p-2 rounded-lg border border-amber-500/40 flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5 text-xs">
                                        <span className="text-amber-400 font-bold">Drop:</span>
                                        <input
                                          type="number"
                                          step="any"
                                          placeholder="kg"
                                          value={set.dropSet.weightKg}
                                          onChange={(e) =>
                                            handleUpdateSet(loggedEx.id, set.id, {
                                              dropSet: {
                                                ...set.dropSet!,
                                                weightKg: parseFloat(e.target.value) || 0,
                                              },
                                            })
                                          }
                                          className="w-14 px-1.5 py-1 rounded bg-slate-950 border border-amber-500/50 text-xs font-bold text-amber-300"
                                        />
                                        <span className="text-slate-400">kg ×</span>
                                        <input
                                          type="number"
                                          placeholder="reps"
                                          value={set.dropSet.reps}
                                          onChange={(e) =>
                                            handleUpdateSet(loggedEx.id, set.id, {
                                              dropSet: {
                                                ...set.dropSet!,
                                                reps: parseInt(e.target.value, 10) || 0,
                                              },
                                            })
                                          }
                                          className="w-12 px-1.5 py-1 rounded bg-slate-950 border border-amber-500/50 text-xs font-bold text-amber-300"
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleDropSet(loggedEx.id, set.id)}
                                        className="text-slate-500 hover:text-rose-400"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleDropSet(loggedEx.id, set.id)}
                                      className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>Add Drop Set</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Formula Preview string */}
                          <div className="mt-1 px-2 text-[11px] text-slate-400 font-mono">
                            <span className="text-slate-500">Formula preview: </span>
                            {loggedEx.sets.map((s, i) => (
                              <span key={s.id}>
                                {i > 0 ? ' | ' : ''}
                                <strong className="text-slate-200">
                                  {s.weightKg}kg × {s.reps}
                                </strong>
                                {s.isDropSet && s.dropSet && (
                                  <span className="text-amber-400">
                                    {' '}
                                    + {s.dropSet.weightKg}kg × {s.dropSet.reps}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>

                          {/* Add Set button */}
                          <div className="pt-2 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handleAddSet(loggedEx.id)}
                              className="flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition px-2 py-1 rounded-lg hover:bg-slate-800"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Set</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {groupLoggedExercises.length === 0 && (
                      <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl">
                        <p className="text-xs text-slate-500">
                          No exercises added for {groupName} today.
                        </p>
                        <span className="text-[11px] text-cyan-400 mt-1 inline-block">
                          Select from the dropdown above or add a new sticky exercise.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Day Notes & Reflections */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Session Notes & Intensity Reflections
              </label>
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. High energy, good pump on incline press, warm-up took 8 min..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Daily Body Weight Tracker Section (at end of each day) */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-white">Daily Body Weight Entry</h5>
                <p className="text-xs text-slate-400">
                  Track morning or post-workout body weight for body composition insights
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="300"
                  placeholder="e.g. 79.4"
                  value={bodyWeightKg}
                  onChange={(e) => setBodyWeightKg(e.target.value)}
                  className="w-28 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-base font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs font-bold text-slate-400">kg</span>
              </div>

              {weightDiff !== null && (
                <div
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                    parseFloat(weightDiff) >= 0
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {parseFloat(weightDiff) >= 0 ? `+${weightDiff}` : weightDiff} kg vs prev
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black uppercase tracking-wider transition shadow-lg shadow-cyan-500/20"
          >
            <Save className="w-4 h-4" />
            <span>Save & Complete Session</span>
          </button>
        </div>

        {/* Add Muscle Group Modal */}
        {showAddGroupModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-md shadow-2xl relative">
              <button
                type="button"
                onClick={() => setShowAddGroupModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h4 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Add Muscle Group
              </h4>

              <form onSubmit={handleCreateCustomMuscleGroup} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Muscle Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Forearms, Traps, Glutes, Calves..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Persistence Option
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        checked={isGroupPermanent}
                        onChange={() => setIsGroupPermanent(true)}
                        className="accent-cyan-500"
                      />
                      <span>Permanent (saved in muscle group library)</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        checked={!isGroupPermanent}
                        onChange={() => setIsGroupPermanent(false)}
                        className="accent-cyan-500"
                      />
                      <span>For today only</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddGroupModal(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold"
                  >
                    Add Group
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
