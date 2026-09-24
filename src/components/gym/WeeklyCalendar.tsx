'use client';

import React, { useState } from 'react';
import { WorkoutDayLog, UserGymProfile } from '@/types';
import { getWeekDays, toDateISO, getTodayISO } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  CheckCircle2,
  Trophy,
  Scale,
  Settings,
  Plus,
} from 'lucide-react';

interface WeeklyCalendarProps {
  workoutLogs: Record<string, WorkoutDayLog>;
  gymProfile: UserGymProfile;
  selectedDate: string;
  onSelectDate: (dateISO: string) => void;
  onOpenDayWorkout: (dateISO: string) => void;
  onUpdateGymProfile: (profile: Partial<UserGymProfile>) => void;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  workoutLogs,
  gymProfile,
  selectedDate,
  onSelectDate,
  onOpenDayWorkout,
  onUpdateGymProfile,
}) => {
  const [weekReference, setWeekReference] = useState<Date>(new Date());
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(gymProfile.workoutsPerWeekGoal);

  const daysOfWeek = getWeekDays(weekReference);
  const todayISO = getTodayISO();

  const handlePrevWeek = () => {
    const prev = new Date(weekReference);
    prev.setDate(prev.getDate() - 7);
    setWeekReference(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(weekReference);
    next.setDate(next.getDate() + 7);
    setWeekReference(next);
  };

  const handleCurrentWeek = () => {
    setWeekReference(new Date());
  };

  const weekDayISOs = daysOfWeek.map((d) => toDateISO(d));
  const workoutsCompletedThisWeek = weekDayISOs.filter(
    (iso) => workoutLogs[iso] && workoutLogs[iso].completed && workoutLogs[iso].splitType !== 'rest'
  ).length;

  const targetGoal = gymProfile.workoutsPerWeekGoal || 4;
  const goalPercent = Math.min(Math.round((workoutsCompletedThisWeek / targetGoal) * 100), 100);

  // Intentional, matte split badges
  const splitStyles: Record<string, { bg: string; text: string; border: string }> = {
    push: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    pull: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    legs: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    rest: { bg: 'bg-surface-2', text: 'text-slate-400', border: 'border-surface-border' },
    custom: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  };

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Calendar Header & Weekly Goal */}
      <div className="bg-surface-1 border border-surface-border rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-blue-400" />
            <h3 className="text-base font-semibold text-white tracking-tight">
              Weekly Training Schedule
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {daysOfWeek[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
            {daysOfWeek[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Goal Indicator & Navigation */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          {/* Workouts / Week Goal Box */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-2 border border-surface-border text-xs tabular-nums">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Target:</span>
            {isEditingGoal ? (
              <span className="inline-flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={tempGoal}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setTempGoal(val);
                    if (val >= 1 && val <= 7) {
                      onUpdateGymProfile({ workoutsPerWeekGoal: val });
                    }
                  }}
                  onBlur={() => setIsEditingGoal(false)}
                  autoFocus
                  className="w-10 px-1 py-0.5 rounded bg-surface-1 text-white font-semibold text-xs border border-surface-border"
                />
                <button
                  type="button"
                  onClick={() => {
                    onUpdateGymProfile({ workoutsPerWeekGoal: tempGoal });
                    setIsEditingGoal(false);
                  }}
                  className="text-[11px] text-emerald-400 font-semibold hover:underline"
                >
                  Done
                </button>
              </span>
            ) : (
              <span
                onClick={() => setIsEditingGoal(true)}
                className="font-semibold text-white cursor-pointer hover:underline"
                title="Edit weekly target"
              >
                {workoutsCompletedThisWeek} / {targetGoal} Days ({goalPercent}%)
              </span>
            )}
            {!isEditingGoal && (
              <button
                type="button"
                onClick={() => setIsEditingGoal(true)}
                className="text-slate-400 hover:text-white"
                title="Edit goal"
              >
                <Settings className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Week Nav controls */}
          <div className="flex items-center gap-1 bg-surface-2 border border-surface-border rounded-xl p-1">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-3 transition"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCurrentWeek}
              className="px-2 py-0.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition"
            >
              Current
            </button>
            <button
              type="button"
              onClick={handleNextWeek}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-3 transition"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 7-Day Week Calendar Cards - Clean 2-col on phone, 7-col on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
        {daysOfWeek.map((dayDate, idx) => {
          const dateISO = toDateISO(dayDate);
          const workout = workoutLogs[dateISO];
          const isToday = dateISO === todayISO;
          const isSelected = dateISO === selectedDate;
          const split = workout?.splitType || 'rest';
          const splitStyle = splitStyles[split] || splitStyles.rest;
          const hasWorkout = Boolean(workout && workout.exercises && workout.exercises.length > 0);

          return (
            <div
              key={dateISO}
              onClick={() => {
                onSelectDate(dateISO);
                onOpenDayWorkout(dateISO);
              }}
              className={`p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[135px] sm:min-h-[155px] group active-press ${
                isSelected
                  ? 'bg-surface-2 border-blue-500 shadow-md ring-1 ring-blue-500/20'
                  : isToday
                  ? 'bg-surface-1 border-emerald-500/50'
                  : 'bg-surface-1 border-surface-border hover:border-surface-borderHover'
              }`}
            >
              {/* Day Header */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight">
                    {dayNames[idx]}
                  </span>
                  {isToday && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Today
                    </span>
                  )}
                </div>

                <div className="text-lg sm:text-xl font-bold text-white mt-1 tabular-nums">
                  {dayDate.getDate()}
                </div>

                {/* Split Tag */}
                <div className="mt-2">
                  <span
                    className={`inline-block text-[10px] font-semibold capitalize px-2 py-0.5 rounded-md border ${splitStyle.bg} ${splitStyle.text} ${splitStyle.border}`}
                  >
                    {split}
                  </span>
                </div>
              </div>

              {/* Workout details or empty prompt */}
              <div className="mt-2.5 pt-2 border-t border-surface-border">
                {hasWorkout ? (
                  <div>
                    <p className="text-xs font-medium text-slate-200 line-clamp-1 group-hover:text-blue-400 transition">
                      {workout.title || 'Session'}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5 tabular-nums">
                      <span>{workout.exercises.length} lifts</span>
                      {workout.completed && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="text-[11px]">Rest</span>
                    <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 text-blue-400 transition" />
                  </div>
                )}

                {workout?.bodyWeightKg ? (
                  <div className="flex items-center gap-1 text-[10px] text-amber-400 font-medium mt-1 pt-1 border-t border-surface-border tabular-nums">
                    <Scale className="w-2.5 h-2.5" />
                    <span>{workout.bodyWeightKg} kg</span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
