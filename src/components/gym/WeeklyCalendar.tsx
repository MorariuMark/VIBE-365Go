'use client';

import React, { useState } from 'react';
import { WorkoutDayLog, UserGymProfile } from '@/types';
import { getWeekDays, toDateISO, getTodayISO } from '@/lib/utils';
import {
  Calendar as CalendarIcon,
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
  // Current week reference date
  const [weekReference, setWeekReference] = useState<Date>(new Date());
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(gymProfile.workoutsPerWeekGoal);

  const daysOfWeek = getWeekDays(weekReference);
  const todayISO = getTodayISO();

  // Navigation handlers
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

  // Compute workouts completed this week
  const weekDayISOs = daysOfWeek.map((d) => toDateISO(d));
  const workoutsCompletedThisWeek = weekDayISOs.filter(
    (iso) => workoutLogs[iso] && workoutLogs[iso].completed && workoutLogs[iso].splitType !== 'rest'
  ).length;

  const targetGoal = gymProfile.workoutsPerWeekGoal || 4;
  const goalPercent = Math.min(Math.round((workoutsCompletedThisWeek / targetGoal) * 100), 100);

  const splitColors: Record<string, { bg: string; text: string; border: string }> = {
    push: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    pull: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    legs: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    rest: { bg: 'bg-slate-800/60', text: 'text-slate-400', border: 'border-slate-700/40' },
    custom: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  };

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-4">
      {/* Calendar Header & Weekly Goal */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white tracking-wide">
              Weekly Workout Schedule
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Week of {daysOfWeek[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
            {daysOfWeek[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Goal Indicator & Navigation */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Workouts / Week Goal Box */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-800/70 border border-slate-700/60">
            <Trophy className="w-4 h-4 text-amber-400" />
            <div className="text-xs">
              <span className="text-slate-400">Weekly Goal: </span>
              {isEditingGoal ? (
                <span className="inline-flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={tempGoal}
                    onChange={(e) => setTempGoal(Number(e.target.value))}
                    className="w-10 px-1 py-0.5 rounded bg-slate-950 text-white font-bold text-xs border border-slate-600 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateGymProfile({ workoutsPerWeekGoal: tempGoal });
                      setIsEditingGoal(false);
                    }}
                    className="text-[10px] text-emerald-400 font-bold hover:underline"
                  >
                    Save
                  </button>
                </span>
              ) : (
                <span
                  onClick={() => setIsEditingGoal(true)}
                  className="font-bold text-white cursor-pointer hover:underline"
                  title="Click to change goal"
                >
                  {workoutsCompletedThisWeek} / {targetGoal} Days ({goalPercent}%)
                </span>
              )}
            </div>
            {!isEditingGoal && (
              <button
                type="button"
                onClick={() => setIsEditingGoal(true)}
                className="text-slate-500 hover:text-white"
                title="Edit weekly goal"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Week Nav controls */}
          <div className="flex items-center gap-1 bg-slate-800/70 border border-slate-700/60 rounded-xl p-1">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCurrentWeek}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700/50 transition"
            >
              Current Week
            </button>
            <button
              type="button"
              onClick={handleNextWeek}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 7-Day Week Calendar Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {daysOfWeek.map((dayDate, idx) => {
          const dateISO = toDateISO(dayDate);
          const workout = workoutLogs[dateISO];
          const isToday = dateISO === todayISO;
          const isSelected = dateISO === selectedDate;
          const split = workout?.splitType || 'rest';
          const splitStyle = splitColors[split] || splitColors.rest;
          const hasWorkout = Boolean(workout && workout.exercises && workout.exercises.length > 0);

          return (
            <div
              key={dateISO}
              onClick={() => {
                onSelectDate(dateISO);
                onOpenDayWorkout(dateISO);
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[160px] group ${
                isSelected
                  ? 'bg-slate-800/95 border-cyan-500 ring-2 ring-cyan-500/20 shadow-xl'
                  : isToday
                  ? 'bg-slate-900/90 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              {/* Day Header */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {dayNames[idx]}
                  </span>
                  {isToday && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Today
                    </span>
                  )}
                </div>

                <div className="text-xl font-bold text-white mt-1">
                  {dayDate.getDate()}
                </div>

                {/* Split Tag */}
                <div className="mt-2.5">
                  <span
                    className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${splitStyle.bg} ${splitStyle.text} ${splitStyle.border}`}
                  >
                    {split}
                  </span>
                </div>
              </div>

              {/* Workout details or empty prompt */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/60">
                {hasWorkout ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-200 line-clamp-1 group-hover:text-cyan-400 transition">
                      {workout.title || 'Session'}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>{workout.exercises.length} exercises</span>
                      {workout.completed && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>Rest / Off</span>
                    <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-cyan-400 transition" />
                  </div>
                )}

                {/* Logged Body Weight snippet */}
                {workout?.bodyWeightKg ? (
                  <div className="flex items-center gap-1 text-[10px] text-amber-400/90 font-medium mt-1.5 pt-1 border-t border-slate-800/40">
                    <Scale className="w-3 h-3" />
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
