'use client';

import React, { useState } from 'react';
import { LoggedExercise, GymSet } from '@/types';
import { formatDatePretty } from '@/lib/utils';
import { PastExerciseSession, calculateSetLoad } from '@/lib/progressiveOverload';
import {
  X,
  History,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  CheckCircle2,
  Zap,
  Info,
  Clock,
  Layers,
} from 'lucide-react';

interface ExerciseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  currentDateISO: string;
  highlightSetNumber?: number;
  pastSessions: PastExerciseSession[];
}

export const ExerciseHistoryModal: React.FC<ExerciseHistoryModalProps> = ({
  isOpen,
  onClose,
  exerciseName,
  currentDateISO,
  highlightSetNumber,
  pastSessions,
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  if (!isOpen) return null;

  const currentPastSession = pastSessions[selectedDayIndex];
  const totalSessions = pastSessions.length;

  const handlePrevDay = () => {
    if (selectedDayIndex < totalSessions - 1) {
      setSelectedDayIndex(selectedDayIndex + 1);
    }
  };

  const handleNextDay = () => {
    if (selectedDayIndex > 0) {
      setSelectedDayIndex(selectedDayIndex - 1);
    }
  };

  // Helper to format days ago
  const getDaysAgoText = (pastDateISO: string) => {
    try {
      const pastTime = new Date(pastDateISO).getTime();
      const currTime = new Date(currentDateISO).getTime();
      const diffDays = Math.round((currTime - pastTime) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) return 'Yesterday';
      if (diffDays > 1) return `${diffDays} days ago`;
      return 'Past session';
    } catch {
      return 'Past session';
    }
  };

  // Calculate session summary for the selected past session
  const sets = currentPastSession?.exercise?.sets || [];
  const first3Sets = sets.slice(0, 3).filter(
    (s) => (Number(s.weightKg) || 0) > 0 || (Number(s.reps) || 0) > 0
  );
  const avgLoadFirst3 =
    first3Sets.length > 0
      ? Math.round(
          (first3Sets.reduce((sum, s) => sum + calculateSetLoad(s.weightKg, s.reps), 0) /
            first3Sets.length) *
            10
        ) / 10
      : 0;

  let topWeight = 0;
  let topReps = 0;
  sets.forEach((s) => {
    const w = Number(s.weightKg) || 0;
    const r = Number(s.reps) || 0;
    if (w > topWeight || (w === topWeight && r > topReps)) {
      topWeight = w;
      topReps = r;
    }
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="bg-[#0b0e17] border border-[#1e2538] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1b2133] bg-[#0e121d] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex-shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white truncate">
                  {exerciseName}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
                  Read-Only History
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                Past performance & set logs from previous days
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition"
            title="Close history"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {totalSessions === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-[#1b2131] rounded-xl bg-[#090b10]">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">
                No Previous Sessions Found
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No past logs recorded for <strong className="text-slate-200">{exerciseName}</strong> prior to {formatDatePretty(currentDateISO)}. Once you complete today&apos;s workout, it will appear here as your history.
              </p>
            </div>
          ) : (
            <>
              {/* Day Switcher Bar */}
              <div className="bg-[#0e121d] border border-[#1b2131] rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center justify-between sm:justify-start gap-2">
                  <button
                    type="button"
                    onClick={handlePrevDay}
                    disabled={selectedDayIndex >= totalSessions - 1}
                    className="p-1.5 rounded-lg bg-[#141824] hover:bg-[#1b2234] text-slate-300 hover:text-white border border-[#232a3e] disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1 text-xs font-mono"
                    title="Go to older session"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Older</span>
                  </button>

                  <div className="text-center px-2">
                    <div className="flex items-center justify-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs sm:text-sm font-bold text-white">
                        {formatDatePretty(currentPastSession.dateISO)}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-blue-400 font-semibold">
                        {getDaysAgoText(currentPastSession.dateISO)}
                      </span>
                      <span className="text-slate-600 text-xs">•</span>
                      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">
                        {currentPastSession.workoutTitle}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextDay}
                    disabled={selectedDayIndex <= 0}
                    className="p-1.5 rounded-lg bg-[#141824] hover:bg-[#1b2234] text-slate-300 hover:text-white border border-[#232a3e] disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1 text-xs font-mono"
                    title="Go to newer session"
                  >
                    <span className="hidden sm:inline">Newer</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Day selector dropdown if multiple days */}
                {totalSessions > 1 && (
                  <div className="flex items-center gap-2 self-center sm:self-auto">
                    <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                      Jump to:
                    </span>
                    <select
                      value={selectedDayIndex}
                      onChange={(e) => setSelectedDayIndex(Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-lg bg-[#141824] border border-[#232a3e] text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      {pastSessions.map((session, idx) => (
                        <option key={session.dateISO} value={idx}>
                          {session.dateISO} ({getDaysAgoText(session.dateISO)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Session Performance Stats Quick Pill */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-lg bg-[#0e121d] border border-[#1b2131]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-0.5">
                    Top Set
                  </span>
                  <span className="text-sm font-bold font-mono text-white">
                    {topWeight > 0 ? `${topWeight} kg × ${topReps}` : 'Bodyweight'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0e121d] border border-[#1b2131]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-0.5">
                    1st 3 Sets Avg Load
                  </span>
                  <span className="text-sm font-bold font-mono text-blue-400">
                    {avgLoadFirst3 > 0 ? `${avgLoadFirst3} kg` : '—'}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1 p-2.5 rounded-lg bg-[#0e121d] border border-[#1b2131]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-0.5">
                    Total Sets Logged
                  </span>
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    {sets.length} sets
                  </span>
                </div>
              </div>

              {/* Non-Modifiable Sets Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                  <span className="uppercase tracking-wider">Logged Sets & Drop Sets</span>
                  <span className="text-[11px] text-slate-500">
                    Session {totalSessions - selectedDayIndex} of {totalSessions}
                  </span>
                </div>

                <div className="border border-[#1e2538] rounded-xl overflow-hidden bg-[#090b10] divide-y divide-[#1b2131]">
                  {sets.map((set: GymSet) => {
                    const isHighlighted =
                      highlightSetNumber !== undefined && set.setNumber === highlightSetNumber;
                    const setLoad = calculateSetLoad(set.weightKg, set.reps);

                    return (
                      <div
                        key={set.id}
                        className={`p-3 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          isHighlighted
                            ? 'bg-blue-950/30 border-l-4 border-blue-500'
                            : 'hover:bg-[#0e121d]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                              isHighlighted
                                ? 'bg-blue-500 text-slate-950'
                                : 'bg-[#141824] text-slate-300 border border-[#232a3e]'
                            }`}
                          >
                            #{set.setNumber}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold font-mono text-white">
                                {set.weightKg} kg × {set.reps} reps
                              </span>
                              {isHighlighted && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold">
                                  Selected Set
                                </span>
                              )}
                              {set.completed && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>Done</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>Load capacity: {Math.round(setLoad * 10) / 10} kg</span>
                              {set.setNumber <= 3 && (
                                <span className="text-[10px] text-blue-400/80 bg-blue-950/40 px-1 rounded">
                                  Included in 3-set overload
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Drop Set Display (if present) */}
                        <div className="flex items-center gap-2 sm:self-center">
                          {set.isDropSet && set.dropSet ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                              <span className="text-amber-400">Drop Set:</span>
                              <span>
                                {set.dropSet.weightKg} kg × {set.dropSet.reps} reps
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-600 hidden sm:inline">
                              No drop set
                            </span>
                          )}

                          {set.tags && set.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              {set.tags.map((t) => (
                                <span
                                  key={t}
                                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Formula & Reference Note */}
              <div className="p-3 rounded-xl bg-[#090b10] border border-[#1b2131] text-[11px] font-mono text-slate-400 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-300 font-semibold">Previous Day Formula: </span>
                  {sets.map((s, i) => (
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
                  <div className="mt-1 text-[10px] text-slate-500">
                    Use these previous weights and reps to target progressive overload in your current session.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1b2133] bg-[#0e121d] flex items-center justify-between">
          <span className="text-xs font-mono text-slate-500">
            {totalSessions > 0
              ? `Viewing session ${selectedDayIndex + 1} of ${totalSessions}`
              : 'No sessions'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#141824] hover:bg-[#1b2234] text-white text-xs font-bold uppercase tracking-wider transition border border-[#232a3e]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
