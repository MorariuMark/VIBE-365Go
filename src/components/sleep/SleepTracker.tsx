'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SleepLog, PhotoMetadata } from '@/types';
import {
  getTodayISO,
  formatDatePretty,
  getWeekDays,
  toDateISO,
  parseSleepDuration,
  calculateDurationFromBedWake,
  formatSleepDisplay,
} from '@/lib/utils';
import { compressAndDownscaleImage } from '@/lib/imageCompressor';
import {
  savePhotoToVault,
  getPhotoFromVault,
  getPhotoRecordFromVault,
  deletePhotoFromVault,
} from '@/lib/photoStorage';
import {
  Moon,
  Sun,
  Clock,
  Calendar,
  Sparkles,
  Camera,
  Trash2,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Check,
  Zap,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

interface SleepTrackerProps {
  selectedDate: string;
  onSelectDate: (dateISO: string) => void;
  sleepLogs: Record<string, SleepLog>;
  onSaveSleepLog: (sleepLog: SleepLog) => void;
  onDeleteSleepLog: (dateISO: string) => void;
  targetSleepHours?: number;
}

export const SleepTracker: React.FC<SleepTrackerProps> = ({
  selectedDate,
  onSelectDate,
  sleepLogs,
  onSaveSleepLog,
  onDeleteSleepLog,
  targetSleepHours = 8.0,
}) => {
  const currentLog = sleepLogs[selectedDate];

  // Derive initial parsed duration
  const initialDuration = parseSleepDuration(
    currentLog?.durationTime ||
      currentLog?.durationMinutesTotal ||
      currentLog?.durationHours ||
      '08:00'
  );

  // Local form state
  const [bedtime, setBedtime] = useState<string>(currentLog?.bedtime || '23:00');
  const [wakeTime, setWakeTime] = useState<string>(currentLog?.wakeTime || '07:00');
  const [durationTime, setDurationTime] = useState<string>(
    currentLog ? initialDuration.timeStr : '08:00'
  );
  const [qualityScore, setQualityScore] = useState<number>(currentLog?.qualityScore ?? 85);
  const [notes, setNotes] = useState<string>(currentLog?.notes || '');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [photos, setPhotos] = useState<Array<{ metadata: PhotoMetadata; dataUrl: string }>>([]);
  const [previewPhoto, setPreviewPhoto] = useState<{ metadata: PhotoMetadata; dataUrl: string } | null>(
    null
  );

  // Feedback indicators
  const [showSavedFeedback, setShowSavedFeedback] = useState<boolean>(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(null);

  // Keep latest callbacks and state in refs for auto-save and unmount flush
  const onSaveRef = useRef(onSaveSleepLog);
  onSaveRef.current = onSaveSleepLog;

  const stateRef = useRef({
    selectedDate,
    bedtime,
    wakeTime,
    durationTime,
    qualityScore,
    notes,
    photos,
  });
  stateRef.current = {
    selectedDate,
    bedtime,
    wakeTime,
    durationTime,
    qualityScore,
    notes,
    photos,
  };

  // Track previous selectedDate to detect date switches
  const prevDateRef = useRef(selectedDate);

  // Sync state when selectedDate changes or when currentLog updates from outside
  useEffect(() => {
    if (prevDateRef.current !== selectedDate) {
      prevDateRef.current = selectedDate;
      if (currentLog) {
        const parsed = parseSleepDuration(
          currentLog.durationTime || currentLog.durationMinutesTotal || currentLog.durationHours
        );
        setBedtime(currentLog.bedtime || '23:00');
        setWakeTime(currentLog.wakeTime || '07:00');
        setDurationTime(parsed.timeStr);
        setQualityScore(currentLog.qualityScore ?? 85);
        setNotes(currentLog.notes || '');
      } else {
        setBedtime('23:00');
        setWakeTime('07:00');
        setDurationTime('08:00');
        setQualityScore(85);
        setNotes('');
      }
      loadPhotosForDate(selectedDate);
    }
  }, [selectedDate, currentLog]);

  // Load photos from IndexedDB for the selected date
  const loadPhotosForDate = async (dateISO: string) => {
    const photoIds = sleepLogs[dateISO]?.photoIds || [];
    const loaded: Array<{ metadata: PhotoMetadata; dataUrl: string }> = [];

    for (const id of photoIds) {
      const record = await getPhotoRecordFromVault(id);
      if (record) {
        loaded.push(record);
      } else {
        const dataUrl = await getPhotoFromVault(id);
        if (dataUrl) {
          loaded.push({
            metadata: {
              id,
              dateISO,
              uploadedAt: new Date().toISOString(),
              originalSizeKB: 0,
              compressedSizeKB: 0,
              width: 0,
              height: 0,
              mimeType: 'image/jpeg',
              category: 'sleep',
            },
            dataUrl,
          });
        }
      }
    }
    setPhotos(loaded);
  };

  // Reusable persistence function (updates parent state & auto-saves immediately)
  const persistLog = (
    newBed: string,
    newWake: string,
    newDurTime: string,
    newQuality: number,
    newNotes: string,
    currentPhotos = photos
  ) => {
    const parsed = parseSleepDuration(newDurTime);
    const photoIds = currentPhotos.map((p) => p.metadata.id);
    const updated: SleepLog = {
      dateISO: selectedDate,
      bedtime: newBed,
      wakeTime: newWake,
      durationTime: parsed.timeStr,
      durationHours: parsed.floatHours,
      durationMinutesTotal: parsed.totalMinutes,
      qualityScore: Number(newQuality),
      notes: newNotes.trim() || undefined,
      photoIds,
      updatedAt: new Date().toISOString(),
    };
    onSaveRef.current(updated);
    setLastAutoSavedAt(
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  };

  // Handlers with instant auto-save
  const handleBedtimeChange = (newBed: string) => {
    setBedtime(newBed);
    const calculated = calculateDurationFromBedWake(newBed, wakeTime);
    setDurationTime(calculated.timeStr);
    persistLog(newBed, wakeTime, calculated.timeStr, qualityScore, notes);
  };

  const handleWakeTimeChange = (newWake: string) => {
    setWakeTime(newWake);
    const calculated = calculateDurationFromBedWake(bedtime, newWake);
    setDurationTime(calculated.timeStr);
    persistLog(bedtime, newWake, calculated.timeStr, qualityScore, notes);
  };

  const handleDurationTimeChange = (newDurationTime: string) => {
    setDurationTime(newDurationTime);
    persistLog(bedtime, wakeTime, newDurationTime, qualityScore, notes);
  };

  const handleQualityChange = (newScore: number) => {
    setQualityScore(newScore);
    persistLog(bedtime, wakeTime, durationTime, newScore, notes);
  };

  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    notesDebounceRef.current = setTimeout(() => {
      persistLog(bedtime, wakeTime, durationTime, qualityScore, newNotes);
    }, 400);
  };

  const handleNotesBlur = () => {
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    persistLog(bedtime, wakeTime, durationTime, qualityScore, notes);
  };

  // Quick adjust duration by fine minute offsets (+15m, -15m, +30m, etc.)
  const handleQuickAdjust = (minutesDelta: number) => {
    const parsed = parseSleepDuration(durationTime);
    const newTotal = Math.max(0, Math.min(23 * 60 + 59, parsed.totalMinutes + minutesDelta));
    const newParsed = parseSleepDuration(newTotal);
    setDurationTime(newParsed.timeStr);
    persistLog(bedtime, wakeTime, newParsed.timeStr, qualityScore, notes);
  };

  const handleResetToRange = () => {
    const calculated = calculateDurationFromBedWake(bedtime, wakeTime);
    setDurationTime(calculated.timeStr);
    persistLog(bedtime, wakeTime, calculated.timeStr, qualityScore, notes);
  };

  // Manual save button (placebo / explicit reassurance)
  const handleManualSave = () => {
    persistLog(bedtime, wakeTime, durationTime, qualityScore, notes);
    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 2200);
  };

  // Date stepper
  const stepDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    onSelectDate(d.toISOString().split('T')[0]);
  };

  // Photo Upload Handler with Downscaling & Compression (<1MB)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await compressAndDownscaleImage(file, {
          maxDimension: 1600,
          targetMaxKB: 950,
          category: 'sleep',
          dateISO: selectedDate,
        });

        await savePhotoToVault(result.metadata.id, result.dataUrl, result.metadata);

        setPhotos((prev) => {
          const next = [result, ...prev];
          persistLog(bedtime, wakeTime, durationTime, qualityScore, notes, next);
          return next;
        });
      }
    } catch (err: any) {
      alert(`Photo processing failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Remove this sleep photo?')) return;
    const target = photos.find((p) => p.metadata.id === photoId);
    await deletePhotoFromVault(photoId, target?.metadata?.storagePath);
    setPhotos((prev) => {
      const next = prev.filter((p) => p.metadata.id !== photoId);
      persistLog(bedtime, wakeTime, durationTime, qualityScore, notes, next);
      return next;
    });
  };

  // Current parsed duration details
  const parsedDuration = parseSleepDuration(durationTime);

  // Past 7 Days Average Sleep
  const recentLogs = Object.values(sleepLogs).filter((l) => {
    const diffDays =
      (new Date(selectedDate).getTime() - new Date(l.dateISO).getTime()) / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays < 7;
  });
  const avgSleep =
    recentLogs.length > 0
      ? (
          recentLogs.reduce(
            (acc, l) => acc + (l.durationMinutesTotal ? l.durationMinutesTotal / 60 : l.durationHours || 0),
            0
          ) / recentLogs.length
        ).toFixed(1)
      : '8.0';

  // 7-day rolling week days for the hero section
  const weekDays = getWeekDays(new Date(selectedDate));
  const isSelectedDateLogged = !!sleepLogs[selectedDate];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HERO SECTION: Circadian Header + 7-Day Logged Status Strip */}
      <div className="athletic-card rounded-2xl p-4 sm:p-6 border border-[#1b2234] bg-[#0a0d14] space-y-5">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-indigo-400 flex-shrink-0 shadow-sm">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight font-sans">
                  CIRCADIAN RECOVERY ARCHITECTURE
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/70 text-indigo-400 border border-indigo-800/40">
                  7D AVG: {avgSleep}H / {targetSleepHours}H TARGET
                </span>
                {isSelectedDateLogged ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-700/60 shadow-sm">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>LOGGED ({formatSleepDisplay(currentLog.durationHours, currentLog.durationMinutesTotal, currentLog.durationTime)})</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-500 bg-[#121622] px-2 py-0.5 rounded-full border border-[#1f273b]">
                    PENDING LOG
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Precision sleep tracking with fine hours &amp; minutes, instant auto-save, and tracker screenshots.
              </p>
            </div>
          </div>

          {/* Date Navigator Strip */}
          <div className="flex items-center gap-1.5 bg-[#10141e] p-1.5 rounded-xl border border-[#1c2336] self-stretch sm:self-auto justify-between sm:justify-start">
            <button
              onClick={() => stepDate(-1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#182030] transition"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onSelectDate(e.target.value)}
              className="bg-transparent border-0 text-xs font-mono font-bold text-white focus:outline-none px-2 cursor-pointer"
            />

            <button
              onClick={() => stepDate(1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#182030] transition"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {selectedDate !== getTodayISO() && (
              <button
                onClick={() => onSelectDate(getTodayISO())}
                className="text-[10px] font-mono uppercase px-2 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/40 hover:bg-indigo-900/60 ml-1 transition"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* HERO WEEK STRIP: Visual Status with small checkmark for logged days */}
        <div className="border-t border-[#161c2b] pt-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-slate-400 font-bold">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Weekly Recovery Log Check</span>
            </span>
            <span className="text-[10px] text-slate-500">
              Days marked with <Check className="w-3 h-3 text-emerald-400 inline mx-0.5 stroke-[2.5]" /> are recorded in memory &amp; cloud
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {weekDays.map((d) => {
              const iso = toDateISO(d);
              const isSelected = iso === selectedDate;
              const isToday = iso === getTodayISO();
              const logForDay = sleepLogs[iso];
              const isLogged = !!logForDay;
              const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNumber = d.getDate();

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onSelectDate(iso)}
                  className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-between min-h-[64px] sm:min-h-[72px] group relative ${
                    isSelected
                      ? 'bg-indigo-950/60 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                      : isLogged
                      ? 'bg-[#0d121c] border-[#222d42] hover:bg-[#121824]'
                      : 'bg-[#080b12] border-[#161b29] hover:bg-[#0d111a] opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between w-full text-[10px] font-mono leading-none">
                    <span
                      className={`uppercase ${
                        isSelected
                          ? 'text-indigo-300 font-bold'
                          : isToday
                          ? 'text-amber-400 font-bold'
                          : 'text-slate-400'
                      }`}
                    >
                      {dayName}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Today" />
                    )}
                  </div>

                  {/* Day Number */}
                  <span
                    className={`text-sm sm:text-base font-extrabold font-mono my-0.5 ${
                      isSelected ? 'text-white scale-105' : 'text-slate-200'
                    }`}
                  >
                    {dayNumber}
                  </span>

                  {/* Status Indicator: Small Check for logged days */}
                  <div className="w-full flex items-center justify-center min-h-[18px]">
                    {isLogged ? (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[9px] font-mono font-bold tracking-tight shadow-sm">
                        <Check className="w-3 h-3 text-emerald-400 stroke-[3] flex-shrink-0" />
                        <span className="truncate hidden xs:inline sm:inline">
                          {formatSleepDisplay(
                            logForDay.durationHours,
                            logForDay.durationMinutesTotal,
                            logForDay.durationTime
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-600">—</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Sleep Input Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Hour Range, Fine Duration & Quality Input */}
        <div className="lg:col-span-2 athletic-card rounded-2xl p-5 sm:p-6 border border-[#1b2234] bg-[#0c101a] space-y-5">
          {/* Card Header & Live Autosave Status */}
          <div className="flex items-center justify-between border-b border-[#182030] pb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Sleep Schedule &amp; Fine Duration for {formatDatePretty(selectedDate)}</span>
            </span>

            <div className="flex items-center gap-2">
              {/* Live Autosave Indicator */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#101522] border border-[#1f273b] text-[10px] font-mono text-emerald-400 shadow-sm"
                title="Any change is automatically saved to storage and cloud"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Auto-saved</span>
                {lastAutoSavedAt && (
                  <span className="text-slate-500 hidden sm:inline">({lastAutoSavedAt})</span>
                )}
              </div>

              {isSelectedDateLogged && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/40 font-bold hidden xs:inline">
                  LOGGED ✓
                </span>
              )}
            </div>
          </div>

          {/* Time Picker Inputs: Bedtime, Wake Time, and Total Rest Period using the same lock number picker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* 1. Bedtime Hour Input */}
            <div className="bg-[#080b12] border border-[#1c2336] p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-bold text-white">
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Bedtime</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">Inception</span>
              </div>
              <input
                type="time"
                value={bedtime}
                onChange={(e) => handleBedtimeChange(e.target.value)}
                className="w-full bg-[#0d121c] border border-[#222a3d] rounded-lg px-3 py-2 text-base font-mono font-bold text-indigo-300 focus:outline-none focus:border-indigo-500 transition shadow-inner"
              />
              <span className="text-[10px] font-mono text-slate-500 block truncate">
                Clock inception point
              </span>
            </div>

            {/* 2. Wake Time Hour Input */}
            <div className="bg-[#080b12] border border-[#1c2336] p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-bold text-white">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Wake Time</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">Awakening</span>
              </div>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => handleWakeTimeChange(e.target.value)}
                className="w-full bg-[#0d121c] border border-[#222a3d] rounded-lg px-3 py-2 text-base font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500 transition shadow-inner"
              />
              <span className="text-[10px] font-mono text-slate-500 block truncate">
                Morning rising point
              </span>
            </div>

            {/* 3. Total Rest Period with fine hours:minutes lock number mechanism */}
            <div className="bg-[#080b12] border border-indigo-900/40 p-4 rounded-xl space-y-2 ring-1 ring-indigo-500/20">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-bold text-white">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Total Rest Period</span>
                </span>
                <span className="text-[10px] font-mono text-indigo-400 font-bold">Fine Time</span>
              </div>
              <input
                type="time"
                value={durationTime}
                onChange={(e) => handleDurationTimeChange(e.target.value)}
                className="w-full bg-[#0d121c] border border-indigo-700/50 rounded-lg px-3 py-2 text-base font-mono font-extrabold text-indigo-300 focus:outline-none focus:border-indigo-400 transition shadow-inner"
              />
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="text-white font-bold">{parsedDuration.displayStr}</span>
                <span className="text-slate-500">({parsedDuration.totalMinutes} min)</span>
              </div>
            </div>
          </div>

          {/* Duration Summary Bar & Quick Offset Fine-Tuning */}
          <div className="bg-[#080b12] border border-[#1c2336] p-4 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-white font-mono uppercase block">
                  Measured Sleep: {parsedDuration.hours} Hours &amp; {parsedDuration.minutes} Minutes
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Calculated from range ({bedtime} → {wakeTime}) • Fine adjustment lock active
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-indigo-400 font-mono tracking-tight">
                  {parsedDuration.displayStr}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ({parsedDuration.floatHours}h)
                </span>
              </div>
            </div>

            {/* Quick Micro-Adjustment Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#141a27] text-[11px] font-mono">
              <span className="text-slate-500 text-[10px] mr-1">Fine Offset:</span>
              <button
                type="button"
                onClick={() => handleQuickAdjust(-15)}
                className="px-2 py-0.5 rounded bg-[#101420] hover:bg-[#181f30] text-slate-300 border border-[#20273a] transition"
              >
                -15m
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdjust(-5)}
                className="px-2 py-0.5 rounded bg-[#101420] hover:bg-[#181f30] text-slate-300 border border-[#20273a] transition"
              >
                -5m
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdjust(5)}
                className="px-2 py-0.5 rounded bg-[#101420] hover:bg-[#181f30] text-slate-300 border border-[#20273a] transition"
              >
                +5m
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdjust(15)}
                className="px-2 py-0.5 rounded bg-[#101420] hover:bg-[#181f30] text-slate-300 border border-[#20273a] transition"
              >
                +15m
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdjust(30)}
                className="px-2 py-0.5 rounded bg-[#101420] hover:bg-[#181f30] text-slate-300 border border-[#20273a] transition"
              >
                +30m
              </button>
              <button
                type="button"
                onClick={handleResetToRange}
                className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded bg-[#101522] hover:bg-[#182032] text-indigo-300 border border-indigo-900/40 text-[10px] transition"
                title="Reset total rest period back to exact bedtime-to-wake calculation"
              >
                <RotateCcw className="w-3 h-3 text-indigo-400" />
                <span>Reset to Range</span>
              </button>
            </div>
          </div>

          {/* Quality Score & Recovery Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#080b12] border border-[#1c2336] p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="text-white font-bold">Sleep Quality</span>
                <span className="text-indigo-400 font-bold">{qualityScore}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="100"
                value={qualityScore}
                onChange={(e) => handleQualityChange(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <span className="text-[10px] font-mono text-slate-500 block">
                {qualityScore >= 85 ? 'Optimal Recovery' : qualityScore >= 70 ? 'Moderate Rest' : 'Suboptimal'}
              </span>
            </div>

            <div className="sm:col-span-2 bg-[#080b12] border border-[#1c2336] p-4 rounded-xl space-y-1.5">
              <label className="text-xs font-bold text-white font-mono uppercase block">
                Rest Observations &amp; Biometrics
              </label>
              <input
                type="text"
                placeholder="e.g. Deep REM, room temp 19°C, no caffeine after 2pm..."
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                onBlur={handleNotesBlur}
                className="w-full bg-[#0d121c] border border-[#222a3d] rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Action Row: Delete & Placebo Save Button */}
          <div className="flex items-center justify-between pt-2">
            {isSelectedDateLogged ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Delete sleep record for this day?')) {
                    onDeleteSleepLog(selectedDate);
                  }
                }}
                className="text-xs text-rose-400 hover:text-rose-300 font-mono transition"
              >
                Delete Log
              </button>
            ) : (
              <span className="text-[11px] font-mono text-slate-500">
                All inputs are saved automatically as you edit.
              </span>
            )}

            <div className="ml-auto flex items-center gap-3">
              {showSavedFeedback && (
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Saved to memory &amp; cloud!</span>
                </span>
              )}

              <button
                type="button"
                onClick={handleManualSave}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs transition shadow-sm active-press flex items-center gap-2 ${
                  showSavedFeedback
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
                title="Data is already auto-saved in real time, but click here for explicit confirmation"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{showSavedFeedback ? 'Saved ✓' : 'Save Sleep Log'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Sleep Tracker Screenshots & Pictures */}
        <div className="athletic-card rounded-2xl p-5 border border-[#1b2234] bg-[#0c101a] space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#182030] pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                <Camera className="w-4 h-4" />
                <span>Tracker Screenshots</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {photos.length} Uploaded
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2">
              Upload Oura, Whoop, Apple Health, or Sleep Cycle charts. Images are automatically compressed &amp; downscaled to &lt; 1MB.
            </p>

            {/* Upload Area */}
            <div className="mt-4">
              <label className="border-2 border-dashed border-[#1f283c] hover:border-indigo-500/70 bg-[#080b12] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition group">
                <Camera className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform mb-1.5" />
                <span className="text-xs font-bold text-white">Upload Screenshot</span>
                <span className="text-[10px] font-mono text-slate-500 mt-0.5">
                  Automatic iPhone 12 Downscale (&lt; 1MB)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
              {isUploading && (
                <div className="mt-2 text-center text-xs font-mono text-indigo-400 animate-pulse">
                  Downscaling &amp; compressing picture...
                </div>
              )}
            </div>

            {/* Photos Gallery */}
            {photos.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="text-[10px] font-mono uppercase text-slate-400">
                  Recorded Screenshots:
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {photos.map((item) => (
                    <div
                      key={item.metadata.id}
                      className="relative rounded-xl overflow-hidden border border-[#1e263a] group bg-[#07090f]"
                    >
                      <img
                        src={item.dataUrl}
                        alt="Sleep Tracker"
                        className="w-full h-24 object-cover cursor-pointer group-hover:scale-105 transition duration-300"
                        onClick={() => setPreviewPhoto(item)}
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto(item)}
                          className="p-1.5 rounded bg-black/60 text-white hover:bg-black"
                          title="Maximize"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(item.metadata.id)}
                          className="p-1.5 rounded bg-rose-900/80 text-rose-200 hover:bg-rose-800"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-1.5 bg-[#080b12] text-[9px] font-mono text-slate-400 truncate">
                        {item.metadata.compressedSizeKB > 0
                          ? `${item.metadata.compressedSizeKB} KB`
                          : '< 1 MB'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-4xl max-h-[90vh] bg-[#0c0f17] border border-[#1f2638] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-[#080b12] border-b border-[#1b2234] text-xs font-mono text-slate-300">
              <span className="font-bold text-white">Sleep Screenshot Telemetry</span>
              <div className="flex items-center gap-3 text-[10px] text-slate-400">
                <span>Date: {previewPhoto.metadata.dateISO}</span>
                {previewPhoto.metadata.compressedSizeKB > 0 && (
                  <span>
                    Size: {previewPhoto.metadata.compressedSizeKB} KB (downscaled from{' '}
                    {previewPhoto.metadata.originalSizeKB} KB)
                  </span>
                )}
                <button
                  onClick={() => setPreviewPhoto(null)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-2 overflow-auto max-h-[75vh] flex items-center justify-center">
              <img
                src={previewPhoto.dataUrl}
                alt="Enlarged sleep screenshot"
                className="max-h-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
