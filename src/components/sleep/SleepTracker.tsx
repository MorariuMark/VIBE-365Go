'use client';

import React, { useState, useEffect } from 'react';
import { SleepLog, PhotoMetadata } from '@/types';
import { getTodayISO, formatDatePretty } from '@/lib/utils';
import { compressAndDownscaleImage } from '@/lib/imageCompressor';
import { savePhotoToVault, getPhotoFromVault, getPhotoRecordFromVault, deletePhotoFromVault } from '@/lib/photoStorage';
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

  // Local form state
  const [bedtime, setBedtime] = useState<string>(currentLog?.bedtime || '23:00');
  const [wakeTime, setWakeTime] = useState<string>(currentLog?.wakeTime || '07:00');
  const [durationHours, setDurationHours] = useState<number>(currentLog?.durationHours || 8.0);
  const [qualityScore, setQualityScore] = useState<number>(currentLog?.qualityScore || 85);
  const [notes, setNotes] = useState<string>(currentLog?.notes || '');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [photos, setPhotos] = useState<Array<{ metadata: PhotoMetadata; dataUrl: string }>>([]);
  const [previewPhoto, setPreviewPhoto] = useState<{ metadata: PhotoMetadata; dataUrl: string } | null>(null);

  // Sync state when selectedDate or currentLog changes
  useEffect(() => {
    if (currentLog) {
      setBedtime(currentLog.bedtime || '23:00');
      setWakeTime(currentLog.wakeTime || '07:00');
      setDurationHours(currentLog.durationHours || 8.0);
      setQualityScore(currentLog.qualityScore || 85);
      setNotes(currentLog.notes || '');
    } else {
      setBedtime('23:00');
      setWakeTime('07:00');
      setDurationHours(8.0);
      setQualityScore(85);
      setNotes('');
    }
    loadPhotosForDate(selectedDate);
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

  // Auto calculate duration from bedtime and wake time
  const calculateDurationFromRange = (bed: string, wake: string): number => {
    try {
      if (bed === wake) return 0;
      const [bH, bM] = bed.split(':').map(Number);
      const [wH, wM] = wake.split(':').map(Number);
      if (isNaN(bH) || isNaN(bM) || isNaN(wH) || isNaN(wM)) return 8.0;

      let bedMinutes = bH * 60 + bM;
      let wakeMinutes = wH * 60 + wM;

      if (wakeMinutes <= bedMinutes) {
        // Passed midnight
        wakeMinutes += 24 * 60;
      }
      const diffMinutes = wakeMinutes - bedMinutes;
      const hours = Number((diffMinutes / 60).toFixed(2));
      return hours;
    } catch {
      return 8.0;
    }
  };

  const handleBedtimeChange = (newBed: string) => {
    setBedtime(newBed);
    const calculated = calculateDurationFromRange(newBed, wakeTime);
    setDurationHours(calculated);
  };

  const handleWakeTimeChange = (newWake: string) => {
    setWakeTime(newWake);
    const calculated = calculateDurationFromRange(bedtime, newWake);
    setDurationHours(calculated);
  };

  // Date stepper
  const stepDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    onSelectDate(d.toISOString().split('T')[0]);
  };

  // Save current sleep log
  const handleSave = () => {
    const photoIds = photos.map((p) => p.metadata.id);
    const updated: SleepLog = {
      dateISO: selectedDate,
      durationHours: Number(durationHours),
      durationMinutesTotal: Math.round(durationHours * 60),
      bedtime,
      wakeTime,
      qualityScore: Number(qualityScore),
      notes: notes.trim() || undefined,
      photoIds,
      updatedAt: new Date().toISOString(),
    };
    onSaveSleepLog(updated);
  };

  // Photo Upload Handler with Downscaling & Compression (<1MB)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Process through the proportional downscaler & adaptive compressor
        const result = await compressAndDownscaleImage(file, {
          maxDimension: 1600,
          targetMaxKB: 950, // strictly under 1MB
          category: 'sleep',
          dateISO: selectedDate,
        });

        // Persist binary payload into IndexedDB
        await savePhotoToVault(result.metadata.id, result.dataUrl, result.metadata);

        // Update local photos list and auto-save sleep log
        setPhotos((prev) => {
          const next = [result, ...prev];
          const photoIds = next.map((p) => p.metadata.id);
          onSaveSleepLog({
            dateISO: selectedDate,
            durationHours: Number(durationHours),
            durationMinutesTotal: Math.round(durationHours * 60),
            bedtime,
            wakeTime,
            qualityScore: Number(qualityScore),
            notes: notes.trim() || undefined,
            photoIds,
            updatedAt: new Date().toISOString(),
          });
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
      onSaveSleepLog({
        dateISO: selectedDate,
        durationHours: Number(durationHours),
        durationMinutesTotal: Math.round(durationHours * 60),
        bedtime,
        wakeTime,
        qualityScore: Number(qualityScore),
        notes: notes.trim() || undefined,
        photoIds: next.map((p) => p.metadata.id),
        updatedAt: new Date().toISOString(),
      });
      return next;
    });
  };

  // Calculate Past 7 Days Average Sleep
  const recentLogs = Object.values(sleepLogs).filter((l) => {
    const diffDays =
      (new Date(selectedDate).getTime() - new Date(l.dateISO).getTime()) / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays < 7;
  });
  const avgSleep =
    recentLogs.length > 0
      ? (recentLogs.reduce((acc, l) => acc + l.durationHours, 0) / recentLogs.length).toFixed(1)
      : '8.0';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Card & Date Selector */}
      <div className="athletic-card rounded-2xl p-4 sm:p-6 border border-[#1b2234] bg-[#0a0d14] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Track restorative sleep cycles, exact bedtime-to-wake hour ranges, and tracker screenshots.
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

      {/* Main Sleep Input Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Hour Range & Duration Input */}
        <div className="lg:col-span-2 athletic-card rounded-2xl p-5 sm:p-6 border border-[#1b2234] bg-[#0c101a] space-y-5">
          <div className="flex items-center justify-between border-b border-[#182030] pb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Sleep Schedule & Duration for {formatDatePretty(selectedDate)}</span>
            </span>
            {currentLog && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                LOGGED
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bedtime Hour Input */}
            <div className="bg-[#080b12] border border-[#1c2336] p-4 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-bold text-white">
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Bedtime</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">Sleep Inception</span>
              </div>
              <input
                type="time"
                value={bedtime}
                onChange={(e) => handleBedtimeChange(e.target.value)}
                className="w-full bg-[#0d121c] border border-[#222a3d] rounded-lg px-3 py-2 text-base font-mono font-bold text-indigo-300 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Wake Time Hour Input */}
            <div className="bg-[#080b12] border border-[#1c2336] p-4 rounded-xl space-y-1.5">
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
                className="w-full bg-[#0d121c] border border-[#222a3d] rounded-lg px-3 py-2 text-base font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Computed Duration Slider & Overwrite */}
          <div className="bg-[#080b12] border border-[#1c2336] p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white font-mono uppercase">
                  Total Rest Period
                </span>
                <span className="text-[10px] font-mono text-slate-500 block">
                  Auto-calculated from hour range ({bedtime} → {wakeTime})
                </span>
              </div>
              <div className="text-right">
                <span className="text-xl sm:text-2xl font-extrabold text-indigo-400 font-mono">
                  {durationHours}
                </span>
                <span className="text-xs text-slate-400 ml-1 font-mono">HOURS</span>
              </div>
            </div>

            <input
              type="range"
              min="2.0"
              max="14.0"
              step="0.25"
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
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
                onChange={(e) => setQualityScore(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <span className="text-[10px] font-mono text-slate-500 block">
                {qualityScore >= 85 ? 'Optimal Recovery' : qualityScore >= 70 ? 'Moderate Rest' : 'Suboptimal'}
              </span>
            </div>

            <div className="sm:col-span-2 bg-[#080b12] border border-[#1c2336] p-4 rounded-xl space-y-1.5">
              <label className="text-xs font-bold text-white font-mono uppercase block">
                Rest Observations & Biometrics
              </label>
              <input
                type="text"
                placeholder="e.g. Deep REM, room temp 19°C, no caffeine after 2pm..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#0d121c] border border-[#222a3d] rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {currentLog && (
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
            )}
            <div className="ml-auto">
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-sm active-press flex items-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Save Sleep Log</span>
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
              Upload Oura, Whoop, Apple Health, or Sleep Cycle charts. Images are automatically compressed & downscaled to &lt; 1MB.
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
                  Downscaling & compressing picture...
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
                      {/* Metadata Badge */}
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
