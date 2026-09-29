'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  WorkoutDayLog,
  MuscleGroup,
  SplitType,
  LoggedExercise,
  GymSet,
  DropSet,
  PhotoMetadata,
} from '@/types';
import { formatDatePretty } from '@/lib/utils';
import { compressAndDownscaleImage } from '@/lib/imageCompressor';
import { savePhotoToVault, getPhotoFromVault, deletePhotoFromVault } from '@/lib/photoStorage';
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
  Edit2,
  Tag,
  Camera,
  Upload,
  Image as ImageIcon,
  Loader2,
  Download,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { saveImageToCameraRoll } from '@/lib/saveToCameraRoll';

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
  onEditCustomExercise?: (muscleGroupId: string, exerciseId: string, newName: string) => void;
  previousWeightKg?: number;
  fitnessPhotos?: Record<string, PhotoMetadata[]>;
  onSavePhotoMetadata?: (metadata: PhotoMetadata) => void;
  onDeletePhotoMetadata?: (photoId: string, dateISO: string) => void;
}

export const DayWorkoutModal: React.FC<DayWorkoutModalProps> = ({
  dateISO,
  workout,
  muscleGroups,
  onClose,
  onSaveWorkout,
  onAddCustomMuscleGroup,
  onAddCustomExercise,
  onEditCustomExercise,
  previousWeightKg,
  fitnessPhotos,
  onSavePhotoMetadata,
  onDeletePhotoMetadata,
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
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(null);

  // Photos loading and vault state
  interface ModalPhotoItem {
    metadata: PhotoMetadata;
    dataUrl: string;
  }
  const [modalPhotos, setModalPhotos] = useState<ModalPhotoItem[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadStatus, setPhotoUploadStatus] = useState<string>('');
  const [activePhotoPreview, setActivePhotoPreview] = useState<ModalPhotoItem | null>(null);
  const [isActualSize, setIsActualSize] = useState<boolean>(false);
  const [isSavingToCameraRoll, setIsSavingToCameraRoll] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const dayPhotosMeta = fitnessPhotos?.[dateISO] || [];

  useEffect(() => {
    let cancelled = false;
    async function loadDayPhotos() {
      const items: ModalPhotoItem[] = [];
      for (const meta of dayPhotosMeta) {
        try {
          const url = await getPhotoFromVault(meta.id, meta);
          if (url && !cancelled) {
            items.push({ metadata: meta, dataUrl: url });
          }
        } catch (e) {
          console.warn('Could not load photo', meta.id, e);
        }
      }
      if (!cancelled) {
        setModalPhotos(items);
      }
    }
    loadDayPhotos();
    return () => {
      cancelled = true;
    };
  }, [dayPhotosMeta]);

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !onSavePhotoMetadata) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setIsUploadingPhoto(true);
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      try {
        setPhotoUploadStatus(
          `Processing photo ${i + 1} of ${imageFiles.length} (${file.name})...`
        );
        const result = await compressAndDownscaleImage(file, {
          maxDimension: 1600,
          targetMaxKB: 950,
          initialQuality: 0.82,
          category: 'fitness',
          dateISO,
        });
        await savePhotoToVault(result.metadata.id, result.dataUrl, result.metadata);
        onSavePhotoMetadata(result.metadata);
        // Instant visual feedback: add photo immediately
        setModalPhotos((prev) => [
          { metadata: result.metadata, dataUrl: result.dataUrl },
          ...prev.filter((p) => p.metadata.id !== result.metadata.id),
        ]);
      } catch (err) {
        console.error('Photo processing failed:', err);
      }
    }
    setIsUploadingPhoto(false);
    setPhotoUploadStatus(
      imageFiles.length > 1 ? `Successfully uploaded ${imageFiles.length} photos!` : ''
    );
    if (imageFiles.length > 1) {
      setTimeout(() => setPhotoUploadStatus(''), 3000);
    }
  };

  const handleSaveActivePhotoToCameraRoll = async (item: ModalPhotoItem) => {
    setIsSavingToCameraRoll(true);
    const dateStr = item.metadata.dateISO || dateISO;
    const filename = `VIBE365-${dateStr}-${item.metadata.id}.jpg`;
    const res = await saveImageToCameraRoll(item.dataUrl, filename);
    setIsSavingToCameraRoll(false);
    setSaveToast(res.message || 'Saved to Camera Roll!');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleNextPhoto = () => {
    if (!activePhotoPreview || modalPhotos.length <= 1) return;
    const currentIndex = modalPhotos.findIndex((p) => p.metadata.id === activePhotoPreview.metadata.id);
    const nextIndex = (currentIndex + 1) % modalPhotos.length;
    setActivePhotoPreview(modalPhotos[nextIndex]);
    setIsActualSize(false);
  };

  const handlePrevPhoto = () => {
    if (!activePhotoPreview || modalPhotos.length <= 1) return;
    const currentIndex = modalPhotos.findIndex((p) => p.metadata.id === activePhotoPreview.metadata.id);
    const prevIndex = (currentIndex - 1 + modalPhotos.length) % modalPhotos.length;
    setActivePhotoPreview(modalPhotos[prevIndex]);
    setIsActualSize(false);
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!onDeletePhotoMetadata) return;
    try {
      await deletePhotoFromVault(photoId);
      onDeletePhotoMetadata(photoId, dateISO);
    } catch (err) {
      console.error('Delete photo failed:', err);
    }
  };

  // Sticky exercise editing & library management
  const [managingStickyGroupId, setManagingStickyGroupId] = useState<string | null>(null);
  const [editingStickyExId, setEditingStickyExId] = useState<string | null>(null);
  const [editingStickyExName, setEditingStickyExName] = useState('');

  const [renamingExerciseId, setRenamingExerciseId] = useState<string | null>(null);
  const [renameExerciseInput, setRenameExerciseInput] = useState('');

  const handleStartRenameExercise = (loggedId: string, currentName: string) => {
    setRenamingExerciseId(loggedId);
    setRenameExerciseInput(currentName);
  };

  const handleSaveRenameExercise = (loggedId: string) => {
    if (!renameExerciseInput.trim()) return;
    const trimmed = renameExerciseInput.trim();
    const target = exercises.find((e) => e.id === loggedId);
    if (target && onEditCustomExercise) {
      const grp = muscleGroups.find((g) => g.id === target.muscleGroupId);
      const customEx = grp?.exercises.find((e) => e.id === target.exerciseId || e.name === target.exerciseName);
      if (customEx) {
        onEditCustomExercise(target.muscleGroupId, customEx.id, trimmed);
      }
    }
    const nextExercises = exercises.map((ex) =>
      ex.id === loggedId ? { ...ex, exerciseName: trimmed } : ex
    );
    setExercises(nextExercises);
    debouncedPersist({ exercises: nextExercises });
    setRenamingExerciseId(null);
    setRenameExerciseInput('');
  };

  const handleSaveStickyRename = (muscleGroupId: string, exerciseId: string) => {
    if (!editingStickyExName.trim()) return;
    const trimmed = editingStickyExName.trim();
    if (onEditCustomExercise) {
      onEditCustomExercise(muscleGroupId, exerciseId, trimmed);
    }
    const nextExercises = exercises.map((ex) =>
      ex.exerciseId === exerciseId ? { ...ex, exerciseName: trimmed } : ex
    );
    setExercises(nextExercises);
    debouncedPersist({ exercises: nextExercises });
    setEditingStickyExId(null);
    setEditingStickyExName('');
  };

  // Tagging system
  type TagTarget =
    | { type: 'exercise'; exerciseId: string; exerciseName: string }
    | { type: 'set'; exerciseId: string; setId: string; setNumber: number };
  const [activeTagTarget, setActiveTagTarget] = useState<TagTarget | null>(null);
  const [customTagInput, setCustomTagInput] = useState('');

  const handleAddTagToTarget = (tagText: string) => {
    const cleanTag = tagText.trim();
    if (!cleanTag || !activeTagTarget) return;

    if (activeTagTarget.type === 'exercise') {
      const nextExercises = exercises.map((ex) => {
        if (ex.id !== activeTagTarget.exerciseId) return ex;
        const currentTags = ex.tags || [];
        if (currentTags.includes(cleanTag)) return ex;
        return { ...ex, tags: [...currentTags, cleanTag] };
      });
      setExercises(nextExercises);
      debouncedPersist({ exercises: nextExercises });
    } else {
      const nextExercises = exercises.map((ex) => {
        if (ex.id !== activeTagTarget.exerciseId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => {
            if (s.id !== activeTagTarget.setId) return s;
            const currentTags = s.tags || [];
            if (currentTags.includes(cleanTag)) return s;
            return { ...s, tags: [...currentTags, cleanTag] };
          }),
        };
      });
      setExercises(nextExercises);
      debouncedPersist({ exercises: nextExercises });
    }
    setCustomTagInput('');
    setActiveTagTarget(null);
  };

  const handleRemoveExerciseTag = (exerciseId: string, tagToRemove: string) => {
    const nextExercises = exercises.map((ex) => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        tags: (ex.tags || []).filter((t) => t !== tagToRemove),
      };
    });
    setExercises(nextExercises);
    debouncedPersist({ exercises: nextExercises });
  };

  const handleRemoveSetTag = (exerciseId: string, setId: string, tagToRemove: string) => {
    const nextExercises = exercises.map((ex) => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s) => {
          if (s.id !== setId) return s;
          return {
            ...s,
            tags: (s.tags || []).filter((t) => t !== tagToRemove),
          };
        }),
      };
    });
    setExercises(nextExercises);
    debouncedPersist({ exercises: nextExercises });
  };

  // Auto-save refs and state tracking
  const onSaveRef = useRef(onSaveWorkout);
  onSaveRef.current = onSaveWorkout;

  const stateRef = useRef({
    title,
    splitType,
    activeMuscleGroupIds,
    exercises,
    notes,
    bodyWeightKg,
    completed,
  });
  stateRef.current = {
    title,
    splitType,
    activeMuscleGroupIds,
    exercises,
    notes,
    bodyWeightKg,
    completed,
  };

  const persistWorkout = (
    currentTitle = stateRef.current.title,
    currentSplit = stateRef.current.splitType,
    currentGroups = stateRef.current.activeMuscleGroupIds,
    currentExercises = stateRef.current.exercises,
    currentNotes = stateRef.current.notes,
    currentWeight = stateRef.current.bodyWeightKg,
    currentCompleted = stateRef.current.completed
  ) => {
    const numericWeight = currentWeight ? parseFloat(currentWeight) : undefined;
    const hasSets = currentExercises.some((ex) => ex.sets && ex.sets.length > 0);
    const effectiveCompleted = hasSets ? true : currentCompleted;
    if (effectiveCompleted !== stateRef.current.completed) {
      setCompleted(effectiveCompleted);
    }

    const sanitizedExercises = currentExercises.map((ex) => ({
      ...ex,
      sets: ex.sets.map((s) => ({
        ...s,
        weightKg: s.weightKg === '' ? 0 : Number(s.weightKg) || 0,
        reps: s.reps === '' ? 0 : parseInt(String(s.reps), 10) || 0,
        dropSet: s.dropSet
          ? {
              ...s.dropSet,
              weightKg: s.dropSet.weightKg === '' ? 0 : Number(s.dropSet.weightKg) || 0,
              reps: s.dropSet.reps === '' ? 0 : parseInt(String(s.dropSet.reps), 10) || 0,
            }
          : undefined,
      })),
    }));

    const updated: WorkoutDayLog = {
      id: workout?.id || `workout_${dateISO}`,
      dateISO,
      title: currentTitle.trim() || `${currentSplit.toUpperCase()} Workout`,
      notes: currentNotes.trim() || undefined,
      splitType: currentSplit,
      muscleGroups: currentGroups,
      exercises: sanitizedExercises,
      bodyWeightKg: numericWeight,
      completed: effectiveCompleted,
    };
    onSaveRef.current(updated);
    setLastAutoSavedAt(
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  };

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedPersist = (overrides?: Partial<typeof stateRef.current>) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      const cur = { ...stateRef.current, ...overrides };
      persistWorkout(cur.title, cur.splitType, cur.activeMuscleGroupIds, cur.exercises, cur.notes, cur.bodyWeightKg, cur.completed);
    }, 350);
  };

  // Flush on unmount to make sure no intermediate inputs or sets are lost
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      const s = stateRef.current;
      persistWorkout(s.title, s.splitType, s.activeMuscleGroupIds, s.exercises, s.notes, s.bodyWeightKg, s.completed);
    };
  }, []);

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
    let nextTitle = title;
    if (!workout?.title || workout.title.endsWith('Session') || workout.title.endsWith('Workout')) {
      nextTitle = `${newSplit.charAt(0).toUpperCase() + newSplit.slice(1)} Session`;
      setTitle(nextTitle);
    }
    persistWorkout(nextTitle, newSplit, defaults, exercises, notes, bodyWeightKg, completed);
  };

  // Adding existing muscle group to today's session
  const handleAddExistingGroupToDay = (groupId: string) => {
    if (!activeMuscleGroupIds.includes(groupId)) {
      const nextGroups = [...activeMuscleGroupIds, groupId];
      setActiveMuscleGroupIds(nextGroups);
      persistWorkout(title, splitType, nextGroups, exercises, notes, bodyWeightKg, completed);
    }
  };

  // Custom muscle group created by user
  const handleCreateCustomMuscleGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const created = onAddCustomMuscleGroup(
      newGroupName.trim(),
      splitType === 'rest' ? 'custom' : splitType,
      isGroupPermanent
    );

    const nextGroups = [...activeMuscleGroupIds, created.id];
    setActiveMuscleGroupIds(nextGroups);
    setNewGroupName('');
    setShowAddGroupModal(false);
    persistWorkout(title, splitType, nextGroups, exercises, notes, bodyWeightKg, completed);
  };

  const handleRemoveGroupFromDay = (groupId: string) => {
    const nextGroups = activeMuscleGroupIds.filter((id) => id !== groupId);
    setActiveMuscleGroupIds(nextGroups);
    persistWorkout(title, splitType, nextGroups, exercises, notes, bodyWeightKg, completed);
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
    const nextExercises = [...exercises, newLogged];
    setExercises(nextExercises);
    setCompleted(true);
    persistWorkout(title, splitType, activeMuscleGroupIds, nextExercises, notes, bodyWeightKg, true);
  };

  const handleRemoveExerciseFromWorkout = (loggedId: string) => {
    const nextExercises = exercises.filter((e) => e.id !== loggedId);
    setExercises(nextExercises);
    persistWorkout(title, splitType, activeMuscleGroupIds, nextExercises, notes, bodyWeightKg, completed);
  };

  // Set management
  const handleAddSet = (exerciseId: string) => {
    const nextExercises = exercises.map((ex) => {
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
    });
    setExercises(nextExercises);
    setCompleted(true);
    persistWorkout(title, splitType, activeMuscleGroupIds, nextExercises, notes, bodyWeightKg, true);
  };

  const handleDuplicateSet = (exerciseId: string, setIndex: number) => {
    const nextExercises = exercises.map((ex) => {
      if (ex.id !== exerciseId) return ex;
      const setToDuplicate = ex.sets[setIndex];
      if (!setToDuplicate) return ex;
      const newSetNumber = ex.sets.length + 1;
      const duplicated: GymSet = {
        ...setToDuplicate,
        id: `set_${Date.now()}_${newSetNumber}`,
        setNumber: newSetNumber,
        completed: false,
        dropSet: setToDuplicate.dropSet ? { ...setToDuplicate.dropSet } : undefined,
      };
      return { ...ex, sets: [...ex.sets, duplicated] };
    });
    setExercises(nextExercises);
    setCompleted(true);
    persistWorkout(title, splitType, activeMuscleGroupIds, nextExercises, notes, bodyWeightKg, true);
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    const nextExercises = exercises.map((ex) => {
      if (ex.id !== exerciseId) return ex;
      const filtered = ex.sets.filter((s) => s.id !== setId);
      const reindexed = filtered.map((s, idx) => ({
        ...s,
        setNumber: idx + 1,
      }));
      return { ...ex, sets: reindexed };
    });
    setExercises(nextExercises);
    persistWorkout(title, splitType, activeMuscleGroupIds, nextExercises, notes, bodyWeightKg, completed);
  };

  const handleUpdateSet = (
    exerciseId: string,
    setId: string,
    patch: Partial<GymSet>
  ) => {
    setCompleted(true);
    const nextExercises = exercises.map((ex) => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
      };
    });
    setExercises(nextExercises);
    debouncedPersist({ exercises: nextExercises, completed: true });
  };

  const handleToggleDropSet = (exerciseId: string, setId: string) => {
    const nextExercises = exercises.map((ex) => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s) => {
          if (s.id !== setId) return s;
          const willEnable = !s.isDropSet;
          const currentWeight = Number(s.weightKg) || 0;
          const dropSetData: DropSet | undefined = willEnable
            ? { weightKg: Math.round(currentWeight * 0.7), reps: 5 }
            : undefined;
          return {
            ...s,
            isDropSet: willEnable,
            dropSet: dropSetData,
          };
        }),
      };
    });
    setExercises(nextExercises);
    persistWorkout(title, splitType, activeMuscleGroupIds, nextExercises, notes, bodyWeightKg, completed);
  };

  const handleSaveAll = () => {
    const numericWeight = bodyWeightKg ? parseFloat(bodyWeightKg) : undefined;
    const hasSets = exercises.some((ex) => ex.sets && ex.sets.length > 0);
    const finalCompleted = hasSets ? true : completed;

    const sanitizedExercises = exercises.map((ex) => ({
      ...ex,
      sets: ex.sets.map((s) => ({
        ...s,
        weightKg: s.weightKg === '' ? 0 : Number(s.weightKg) || 0,
        reps: s.reps === '' ? 0 : parseInt(String(s.reps), 10) || 0,
        dropSet: s.dropSet
          ? {
              ...s.dropSet,
              weightKg: s.dropSet.weightKg === '' ? 0 : Number(s.dropSet.weightKg) || 0,
              reps: s.dropSet.reps === '' ? 0 : parseInt(String(s.dropSet.reps), 10) || 0,
            }
          : undefined,
      })),
    }));

    const finalWorkout: WorkoutDayLog = {
      id: workout?.id || `workout_${dateISO}`,
      dateISO,
      title: title.trim() || `${splitType.toUpperCase()} Workout`,
      notes: notes.trim() || undefined,
      splitType,
      muscleGroups: activeMuscleGroupIds,
      exercises: sanitizedExercises,
      bodyWeightKg: numericWeight,
      completed: finalCompleted,
    };

    onSaveWorkout(finalWorkout);

    if (completed) {
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#f59e0b'],
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0b0e17] border border-[#1e2436] w-full max-w-4xl rounded-2xl shadow-2xl my-auto overflow-hidden flex flex-col max-h-[94vh]">
        {/* Top Sticky Header */}
        <div className="p-4 sm:p-6 border-b border-[#1b2133] bg-[#0d101a]/95 sticky top-0 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2.5 py-0.5 rounded border border-blue-800/40">
                {formatDatePretty(dateISO)}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = !completed;
                  setCompleted(next);
                  persistWorkout(title, splitType, activeMuscleGroupIds, exercises, notes, bodyWeightKg, next);
                }}
                className={`flex items-center gap-1.5 px-3 py-0.5 rounded-md text-xs font-semibold border transition ${
                  completed
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                    : 'bg-[#141824] text-slate-400 border-[#232a3e] hover:text-white'
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${completed ? 'text-emerald-400' : ''}`} />
                <span>{completed ? 'Completed' : 'Mark Done'}</span>
              </button>

              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#141a29] border border-[#222e49] text-[10px] font-mono text-emerald-400 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Auto-saved</span>
                {lastAutoSavedAt && (
                  <span className="text-slate-500 hidden sm:inline">({lastAutoSavedAt})</span>
                )}
              </div>
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                debouncedPersist({ title: e.target.value });
              }}
              onBlur={() => {
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                persistWorkout(title, splitType, activeMuscleGroupIds, exercises, notes, bodyWeightKg, completed);
              }}
              placeholder="Assign Workout Title (e.g. Heavy Push A - PR Day)..."
              className="mt-2 text-lg sm:text-2xl font-black text-white bg-transparent border-b border-transparent hover:border-[#232a3e] focus:border-emerald-500 outline-none w-full placeholder:text-slate-600 transition tracking-tight"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleSaveAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-sm active-press"
            >
              <Save className="w-4 h-4" />
              <span>Save Session</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#141824] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Split Type Selector */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">
              Select Workout Split
            </label>
            <div className="flex flex-wrap gap-2">
              {(['push', 'pull', 'legs', 'rest', 'custom'] as SplitType[]).map((split) => (
                <button
                  key={split}
                  type="button"
                  onClick={() => handleSplitChange(split)}
                  className={`py-1.5 px-4 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-all ${
                    splitType === split
                      ? 'bg-[#1b2336] border-[#313e5e] text-white shadow-sm'
                      : 'bg-[#0e1119] border-[#1b2131] text-slate-400 hover:text-white hover:border-[#2b334c]'
                  }`}
                >
                  {split}
                </button>
              ))}
            </div>
          </div>

          {/* Muscle Groups Active for Today */}
          <div className="bg-[#0e1119] border border-[#1b2131] rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Muscle Groups for Today
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddGroupModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141824] hover:bg-[#1b2234] text-blue-400 border border-[#232a3e] text-xs font-semibold transition"
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
                    className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#141824] border border-[#232a3e] text-xs text-white font-medium"
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

            {/* Quick Add Available Groups */}
            {muscleGroups.filter((g) => !activeMuscleGroupIds.includes(g.id)).length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-[#1b2131] flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                <span className="text-slate-500 font-mono">Quick add:</span>
                {muscleGroups
                  .filter((g) => !activeMuscleGroupIds.includes(g.id))
                  .map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleAddExistingGroupToDay(g.id)}
                      className="px-2 py-0.5 rounded bg-[#090b10] border border-[#1b2131] hover:border-[#2b334c] text-slate-300 hover:text-blue-400 transition"
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
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-blue-400" />
                Exercise Log & Sets
              </h4>
              <span className="text-[11px] font-mono text-slate-500">
                Formula: Weight × Reps + Drop Set
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
                  className="bg-[#0e1119] border border-[#1b2131] rounded-xl p-4 sm:p-5 space-y-4"
                >
                  {/* Muscle Group Title & Sticky Exercises Picker */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1b2131]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <h5 className="text-sm font-bold text-white tracking-wide uppercase">
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
                          className="px-3 py-1.5 rounded-lg bg-[#141824] border border-[#232a3e] text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
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
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1b2234] text-blue-400 border border-[#232a3e] text-xs font-semibold transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Sticky Exercise</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setManagingStickyGroupId(
                            managingStickyGroupId === grpId ? null : grpId
                          )
                        }
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1b2234] text-slate-300 border border-[#232a3e] text-xs font-semibold transition"
                        title={`Edit sticky exercises in ${groupName}`}
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Edit Library</span>
                      </button>
                    </div>
                  </div>

                  {/* Add sticky exercise input field */}
                  {addingExerciseToGroupId === grpId && (
                    <div className="p-3 rounded-lg bg-[#141824] border border-blue-500/40 flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <input
                        type="text"
                        value={newExerciseName}
                        onChange={(e) => setNewExerciseName(e.target.value)}
                        placeholder={`New exercise name for ${groupName} (sticks to library)...`}
                        className="flex-1 px-3 py-1.5 rounded-md bg-[#090b10] border border-[#232a3e] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
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
                        className="px-3 py-1.5 rounded-md bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingExerciseToGroupId(null)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Manage / Edit Sticky Exercises in Library */}
                  {managingStickyGroupId === grpId && grp && (
                    <div className="p-3.5 rounded-xl bg-[#121624] border border-blue-500/30 space-y-3">
                      <div className="flex items-center justify-between border-b border-[#232a3e] pb-2">
                        <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                          <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                          Edit Sticky Exercises ({groupName})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setManagingStickyGroupId(null);
                            setEditingStickyExId(null);
                          }}
                          className="text-slate-400 hover:text-white text-xs font-mono"
                        >
                          Close
                        </button>
                      </div>

                      {grp.exercises && grp.exercises.length > 0 ? (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {grp.exercises.map((ex) => (
                            <div
                              key={ex.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-[#090b10] border border-[#1b2131]"
                            >
                              {editingStickyExId === ex.id ? (
                                <div className="flex items-center gap-2 w-full">
                                  <input
                                    type="text"
                                    value={editingStickyExName}
                                    onChange={(e) => setEditingStickyExName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveStickyRename(grpId, ex.id);
                                      }
                                    }}
                                    className="flex-1 px-2.5 py-1 rounded bg-[#141824] border border-blue-500 text-xs font-semibold text-white focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveStickyRename(grpId, ex.id)}
                                    className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingStickyExId(null)}
                                    className="p-1 text-slate-400 hover:text-white"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                    <span className="text-xs font-medium text-slate-200">{ex.name}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingStickyExId(ex.id);
                                      setEditingStickyExName(ex.name);
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-[#141824] hover:bg-[#1b2234] text-slate-300 hover:text-blue-400 border border-[#232a3e] text-xs transition"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>Rename</span>
                                  </button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs font-mono text-slate-500 py-2">
                          No sticky exercises registered for this group yet. Add one via &quot;Sticky Exercise&quot;.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Logged exercises list */}
                  <div className="space-y-4">
                    {groupLoggedExercises.map((loggedEx) => (
                      <div
                        key={loggedEx.id}
                        className="bg-[#090b10] border border-[#1b2131] rounded-xl p-3.5 sm:p-4 space-y-3"
                      >
                        {/* Exercise Title Bar */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {renamingExerciseId === loggedEx.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={renameExerciseInput}
                                  onChange={(e) => setRenameExerciseInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveRenameExercise(loggedEx.id);
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded bg-[#141824] border border-blue-500 text-xs font-bold text-white focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveRenameExercise(loggedEx.id)}
                                  className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRenamingExerciseId(null)}
                                  className="p-1 text-slate-400 hover:text-white"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="text-sm font-bold text-white">
                                  {loggedEx.exerciseName}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleStartRenameExercise(loggedEx.id, loggedEx.exerciseName)}
                                  className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition"
                                  title="Edit exercise name"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {/* Exercise Tags */}
                            {(loggedEx.tags || []).map((t) => (
                              <span
                                key={t}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30"
                              >
                                {t}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExerciseTag(loggedEx.id, t)}
                                  className="hover:text-rose-400"
                                  title="Remove tag"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}

                            <button
                              type="button"
                              onClick={() =>
                                setActiveTagTarget({
                                  type: 'exercise',
                                  exerciseId: loggedEx.id,
                                  exerciseName: loggedEx.exerciseName,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#141824] hover:bg-[#1b2234] text-slate-400 hover:text-slate-200 border border-[#232a3e] transition"
                              title="Add tag to exercise"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Tag</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveExerciseFromWorkout(loggedEx.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Remove exercise"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Sets Table */}
                        <div className="space-y-2">
                          {/* Desktop Header */}
                          <div className="hidden sm:grid grid-cols-12 text-[10px] font-mono text-slate-400 uppercase tracking-wider px-2">
                            <span className="col-span-1">Set</span>
                            <span className="col-span-3">Weight (kg)</span>
                            <span className="col-span-2">Reps</span>
                            <span className="col-span-4">Drop Set (Optional)</span>
                            <span className="col-span-2 text-right">Done</span>
                          </div>

                          {loggedEx.sets.map((set, setIdx) => (
                            <div
                              key={set.id}
                              className={`p-2.5 rounded-lg border transition ${
                                set.completed
                                  ? 'bg-emerald-950/20 border-emerald-800/40'
                                  : 'bg-[#10141f] border-[#1b2131]'
                              }`}
                            >
                              {/* Desktop Grid Layout */}
                              <div className="hidden sm:grid grid-cols-12 items-center gap-2">
                                <div className="col-span-1 font-mono font-bold text-xs text-slate-300">
                                  #{set.setNumber}
                                </div>
                                <div className="col-span-3 flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={set.weightKg ?? ''}
                                    onChange={(e) =>
                                      handleUpdateSet(loggedEx.id, set.id, {
                                        weightKg: e.target.value === '' ? '' : e.target.value,
                                      })
                                    }
                                    className="w-full px-2 py-1 rounded bg-[#090b10] border border-[#232a3e] text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                                  />
                                  <span className="text-[10px] font-mono text-slate-500">kg</span>
                                </div>
                                <div className="col-span-2 flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={set.reps ?? ''}
                                    onChange={(e) =>
                                      handleUpdateSet(loggedEx.id, set.id, {
                                        reps: e.target.value === '' ? '' : e.target.value,
                                      })
                                    }
                                    className="w-full px-2 py-1 rounded bg-[#090b10] border border-[#232a3e] text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                                  />
                                  <span className="text-[10px] font-mono text-slate-500">reps</span>
                                </div>
                                <div className="col-span-4">
                                  {set.isDropSet && set.dropSet ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-amber-400 font-bold text-xs font-mono">+</span>
                                      <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        placeholder="kg"
                                        value={set.dropSet.weightKg ?? ''}
                                        onChange={(e) =>
                                          handleUpdateSet(loggedEx.id, set.id, {
                                            dropSet: {
                                              ...set.dropSet!,
                                              weightKg: e.target.value === '' ? '' : e.target.value,
                                            },
                                          })
                                        }
                                        className="w-14 px-1.5 py-1 rounded bg-[#090b10] border border-amber-500/50 text-xs font-mono font-bold text-amber-300 focus:outline-none"
                                      />
                                      <span className="text-[10px] font-mono text-slate-500">kg ×</span>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="reps"
                                        value={set.dropSet.reps ?? ''}
                                        onChange={(e) =>
                                          handleUpdateSet(loggedEx.id, set.id, {
                                            dropSet: {
                                              ...set.dropSet!,
                                              reps: e.target.value === '' ? '' : e.target.value,
                                            },
                                          })
                                        }
                                        className="w-12 px-1.5 py-1 rounded bg-[#090b10] border border-amber-500/50 text-xs font-mono font-bold text-amber-300 focus:outline-none"
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
                                      className="text-[11px] font-mono text-slate-400 hover:text-amber-400 transition flex items-center gap-1"
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
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSet(loggedEx.id, set.id)}
                                    className="p-1 rounded text-slate-500 hover:text-rose-400"
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
                                    className={`w-6 h-6 rounded flex items-center justify-center border transition ${
                                      set.completed
                                        ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                        : 'bg-[#141824] border-[#232a3e] text-transparent hover:border-emerald-500'
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </button>
                                </div>
                              </div>

                              {/* Mobile Stacked Layout */}
                              <div className="sm:hidden space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-bold text-xs text-white">
                                    Set #{set.setNumber}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleDuplicateSet(loggedEx.id, setIdx)}
                                      className="p-1 text-slate-400 hover:text-white"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSet(loggedEx.id, set.id)}
                                      className="p-1 text-slate-400 hover:text-rose-400"
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
                                      className={`px-3 py-1 rounded text-xs font-mono font-bold border flex items-center gap-1 ${
                                        set.completed
                                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                          : 'bg-[#141824] text-slate-400 border-[#232a3e]'
                                      }`}
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>{set.completed ? 'DONE' : 'MARK'}</span>
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[10px] font-mono text-slate-400 mb-0.5">
                                      Weight (kg)
                                    </label>
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      value={set.weightKg ?? ''}
                                      onChange={(e) =>
                                        handleUpdateSet(loggedEx.id, set.id, {
                                          weightKg: e.target.value === '' ? '' : e.target.value,
                                        })
                                      }
                                      className="w-full px-2.5 py-1.5 rounded bg-[#090b10] border border-[#232a3e] text-xs font-mono font-bold text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-mono text-slate-400 mb-0.5">
                                      Reps
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={set.reps ?? ''}
                                      onChange={(e) =>
                                        handleUpdateSet(loggedEx.id, set.id, {
                                          reps: e.target.value === '' ? '' : e.target.value,
                                        })
                                      }
                                      className="w-full px-2.5 py-1.5 rounded bg-[#090b10] border border-[#232a3e] text-xs font-mono font-bold text-white"
                                    />
                                  </div>
                                </div>

                                {/* Drop Set on Mobile */}
                                <div className="pt-1">
                                  {set.isDropSet && set.dropSet ? (
                                    <div className="bg-[#090b10] p-2 rounded border border-amber-500/40 flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5 text-xs font-mono">
                                        <span className="text-amber-400 font-bold">Drop:</span>
                                        <input
                                          type="number"
                                          step="any"
                                          placeholder="kg"
                                          value={set.dropSet.weightKg ?? ''}
                                          onChange={(e) =>
                                            handleUpdateSet(loggedEx.id, set.id, {
                                              dropSet: {
                                                ...set.dropSet!,
                                                weightKg: e.target.value === '' ? '' : e.target.value,
                                              },
                                            })
                                          }
                                          className="w-14 px-1.5 py-1 rounded bg-[#141824] border border-amber-500/50 text-xs font-mono font-bold text-amber-300"
                                        />
                                        <span className="text-slate-400">kg ×</span>
                                        <input
                                          type="number"
                                          placeholder="reps"
                                          value={set.dropSet.reps ?? ''}
                                          onChange={(e) =>
                                            handleUpdateSet(loggedEx.id, set.id, {
                                              dropSet: {
                                                ...set.dropSet!,
                                                reps: e.target.value === '' ? '' : e.target.value,
                                              },
                                            })
                                          }
                                          className="w-12 px-1.5 py-1 rounded bg-[#141824] border border-amber-500/50 text-xs font-mono font-bold text-amber-300"
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
                                      className="text-xs font-mono text-amber-400 hover:underline flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>Add Drop Set</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Set Tags Bar (Visible for both Desktop & Mobile) */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-[#1b2131]/60">
                                <span className="text-[10px] font-mono text-slate-500">Tags:</span>
                                {(set.tags || []).map((t) => (
                                  <span
                                    key={t}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/30"
                                  >
                                    {t}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSetTag(loggedEx.id, set.id, t)}
                                      className="hover:text-rose-400"
                                      title="Remove tag"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </span>
                                ))}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveTagTarget({
                                      type: 'set',
                                      exerciseId: loggedEx.id,
                                      setId: set.id,
                                      setNumber: set.setNumber,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#141824] hover:bg-[#1b2234] text-slate-400 hover:text-slate-200 border border-[#232a3e] transition"
                                  title="Add tag to set"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                  <span>Tag</span>
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Formula Preview */}
                          <div className="mt-1 px-1 text-[10px] text-slate-400 font-mono">
                            <span className="text-slate-500">Formula: </span>
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
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => handleAddSet(loggedEx.id)}
                              className="flex items-center gap-1 text-xs font-mono font-bold text-blue-400 hover:text-blue-300 transition px-2.5 py-1 rounded bg-[#141824] border border-[#232a3e]"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Set</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {groupLoggedExercises.length === 0 && (
                      <div className="text-center py-6 border border-dashed border-[#1b2131] rounded-lg">
                        <p className="text-xs text-slate-500">
                          No exercises added for {groupName} today.
                        </p>
                        <span className="text-[11px] font-mono text-blue-400 mt-1 inline-block">
                          Select from dropdown above or create sticky exercise.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Day Notes */}
          <div className="bg-[#0e1119] border border-[#1b2131] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <label className="text-xs font-mono uppercase tracking-wider text-slate-300">
                Session Notes & Intensity Reflections
              </label>
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                debouncedPersist({ notes: e.target.value });
              }}
              onBlur={() => {
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                persistWorkout(title, splitType, activeMuscleGroupIds, exercises, notes, bodyWeightKg, completed);
              }}
              placeholder="e.g. High energy, good pump on incline press, warm-up took 8 min..."
              className="w-full px-3 py-2 rounded-lg bg-[#090b10] border border-[#232a3e] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Daily Body Weight Tracker */}
          <div className="bg-[#0e1119] border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-white">Daily Body Weight</h5>
                <p className="text-xs text-slate-400">
                  Track body weight at end of session for body composition delta
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="300"
                  placeholder="e.g. 79.4"
                  value={bodyWeightKg}
                  onChange={(e) => {
                    setBodyWeightKg(e.target.value);
                    debouncedPersist({ bodyWeightKg: e.target.value });
                  }}
                  onBlur={() => {
                    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                    persistWorkout(title, splitType, activeMuscleGroupIds, exercises, notes, bodyWeightKg, completed);
                  }}
                  className="w-24 px-2.5 py-1.5 rounded-lg bg-[#090b10] border border-[#232a3e] text-sm font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs font-mono text-slate-400">kg</span>
              </div>

              {weightDiff !== null && (
                <div
                  className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
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

          {/* Daily Workout & Progress Photos Section */}
          <div className="bg-[#0e1119] border border-[#1b2131] rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1b2131]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-white tracking-wide uppercase">
                    Workout & Physique Photos
                  </h5>
                  <p className="text-[11px] font-mono text-slate-400">
                    Client-compressed &lt; 1MB • Saved securely in vault
                  </p>
                </div>
              </div>

              <div>
                <input
                  type="file"
                  ref={photoInputRef}
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handlePhotoUpload(e.target.files);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={() => photoInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {isUploadingPhoto ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Add Photos</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {photoUploadStatus && (
              <div className="text-xs font-mono text-emerald-400 flex items-center gap-2 bg-emerald-950/20 border border-emerald-800/40 p-2.5 rounded-lg">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{photoUploadStatus}</span>
              </div>
            )}

            {modalPhotos.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-[#1b2131] rounded-xl text-slate-500 text-xs font-mono">
                No photos logged for this workout yet. Tap &quot;Add Photos&quot; to save physique check-ins or machine setups.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {modalPhotos.map((item) => (
                  <div
                    key={item.metadata.id}
                    className="group relative aspect-square rounded-lg overflow-hidden border border-[#232a3e] bg-[#090b10]"
                  >
                    <img
                      src={item.dataUrl}
                      alt={item.metadata.caption || 'Workout photo'}
                      className="w-full h-full object-cover cursor-pointer transition duration-300 group-hover:scale-105"
                      onClick={() => setActivePhotoPreview(item)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end justify-between p-2">
                      <span className="text-[10px] font-mono text-slate-300 truncate max-w-[70%]">
                        {item.metadata.caption || `${item.metadata.compressedSizeKB} KB`}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(item.metadata.id);
                        }}
                        className="p-1 rounded bg-rose-950/80 text-rose-400 hover:bg-rose-900 border border-rose-800/50 transition"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 border-t border-[#1b2131] bg-[#0d101a] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#141824] text-slate-300 text-xs font-semibold hover:bg-[#1b2234] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold uppercase tracking-wider transition shadow-sm active-press"
          >
            <Save className="w-4 h-4" />
            <span>Save & Complete Session</span>
          </button>
        </div>

        {/* Add Muscle Group Modal */}
        {showAddGroupModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0e1119] border border-[#1b2131] rounded-xl p-5 w-full max-w-md shadow-2xl relative">
              <button
                type="button"
                onClick={() => setShowAddGroupModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
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
                    className="w-full px-3 py-2 rounded-lg bg-[#090b10] border border-[#232a3e] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
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
                        className="accent-emerald-500"
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
                        className="accent-emerald-500"
                      />
                      <span>For today only</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddGroupModal(false)}
                    className="px-3 py-1.5 rounded-lg bg-[#141824] text-xs text-slate-300 hover:bg-[#1b2234]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
                  >
                    Add Group
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tag Picker Modal */}
        {activeTagTarget && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0e1119] border border-[#1b2131] rounded-xl p-5 w-full max-w-sm shadow-2xl relative">
              <button
                type="button"
                onClick={() => {
                  setActiveTagTarget(null);
                  setCustomTagInput('');
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-bold text-white">
                  {activeTagTarget.type === 'exercise'
                    ? `Tag: ${activeTagTarget.exerciseName}`
                    : `Tag: Set #${activeTagTarget.setNumber}`}
                </h4>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 mb-1.5 block">
                    Quick Presets
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Warm-up',
                      'Working Set',
                      'Top Set',
                      'PR',
                      'Failure',
                      'Drop Set',
                      'Tempo',
                      'Pause Rep',
                      'Strict Form',
                      'Back-off',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleAddTagToTarget(preset)}
                        className="px-2.5 py-1 rounded-md bg-[#141824] hover:bg-blue-600 hover:text-white border border-[#232a3e] text-xs font-medium text-slate-300 transition"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 mb-1.5 block">
                    Custom Tag
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTagToTarget(customTagInput);
                        }
                      }}
                      placeholder="e.g. Smith Machine, Slow Eccentric..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#090b10] border border-[#232a3e] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTagToTarget(customTagInput)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Photo Lightbox Preview */}
        {activePhotoPreview && (
          <div
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setActivePhotoPreview(null);
                setIsActualSize(false);
              }
              if (e.key === 'ArrowRight') handleNextPhoto();
              if (e.key === 'ArrowLeft') handlePrevPhoto();
            }}
          >
            {/* Top Bar */}
            <div className="p-3 sm:p-4 bg-gradient-to-b from-black/90 to-transparent flex items-center justify-between gap-3 z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                    {activePhotoPreview.metadata.caption || 'Progress Photo'}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono text-slate-400">
                    <span>{formatDatePretty(activePhotoPreview.metadata.dateISO)}</span>
                    <span>•</span>
                    <span>{activePhotoPreview.metadata.compressedSizeKB} KB</span>
                    <span>•</span>
                    <span>{activePhotoPreview.metadata.width} × {activePhotoPreview.metadata.height} px</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Save to Camera Roll Button */}
                <button
                  type="button"
                  onClick={() => handleSaveActivePhotoToCameraRoll(activePhotoPreview)}
                  disabled={isSavingToCameraRoll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg active-press disabled:opacity-50 cursor-pointer"
                  title="Save photo to Camera Roll / Photos"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isSavingToCameraRoll ? 'Saving...' : 'Save to Camera Roll'}</span>
                </button>

                {/* 100% Full Size / Fit Toggle */}
                <button
                  type="button"
                  onClick={() => setIsActualSize(!isActualSize)}
                  className="p-2 rounded-lg bg-[#141824] hover:bg-[#1b2234] text-slate-300 border border-[#232a3e] text-xs transition"
                  title={isActualSize ? 'Fit screen' : 'View 100% full size'}
                >
                  {isActualSize ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => {
                    handleDeletePhoto(activePhotoPreview.metadata.id);
                    setActivePhotoPreview(null);
                  }}
                  className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 border border-transparent hover:border-rose-800/40 transition"
                  title="Delete photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Close X */}
                <button
                  type="button"
                  onClick={() => {
                    setActivePhotoPreview(null);
                    setIsActualSize(false);
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                  title="Close full screen"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Canvas Viewport (True Full Screen) */}
            <div
              className={`flex-1 w-full h-full flex items-center justify-center p-2 sm:p-4 relative ${
                isActualSize ? 'overflow-auto' : 'overflow-hidden'
              }`}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setActivePhotoPreview(null);
                  setIsActualSize(false);
                }
              }}
            >
              {/* Previous Photo Button */}
              {modalPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevPhoto();
                  }}
                  className="absolute left-2 sm:left-4 z-20 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-sm transition"
                  title="Previous photo (Arrow Left)"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}

              {/* Photo Image */}
              <img
                src={activePhotoPreview.dataUrl}
                alt="Full resolution preview"
                className={`transition-all duration-200 select-none ${
                  isActualSize
                    ? 'max-w-none cursor-zoom-out'
                    : 'max-w-full max-h-[85vh] sm:max-h-[88vh] object-contain rounded-lg shadow-2xl cursor-zoom-in'
                }`}
                style={isActualSize ? { width: `${activePhotoPreview.metadata.width}px` } : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsActualSize(!isActualSize);
                }}
              />

              {/* Next Photo Button */}
              {modalPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextPhoto();
                  }}
                  className="absolute right-2 sm:right-4 z-20 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-sm transition"
                  title="Next photo (Arrow Right)"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
            </div>

            {/* Bottom Bar: Instructions & Toast */}
            <div className="p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between text-slate-400 text-xs font-mono">
              <span className="hidden sm:inline">
                Tap photo to toggle 100% full size • Use arrow buttons to navigate
              </span>
              <span className="sm:hidden">
                Tap photo to toggle full size
              </span>

              {saveToast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs shadow-2xl animate-in fade-in slide-in-from-bottom-2 z-30">
                  {saveToast}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
