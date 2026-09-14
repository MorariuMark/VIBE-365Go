'use client';

import React, { useMemo, useState } from 'react';
import { Habit, WorkoutDayLog } from '@/types';
import { formatDatePretty } from '@/lib/utils';
import { Flame, Trophy, Calendar, CheckCircle2 } from 'lucide-react';

interface ContributionGridProps {
  habits: Habit[];
  workoutLogs: Record<string, WorkoutDayLog>;
  onSelectDate?: (dateISO: string) => void;
}

export const ContributionGrid: React.FC<ContributionGridProps> = ({
  habits,
  workoutLogs,
  onSelectDate,
}) => {
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    completedCount: number;
    totalHabits: number;
    hasWorkout: boolean;
    workoutTitle?: string;
    x: number;
    y: number;
  } | null>(null);

  // Generate 26 weeks (approx 6 months) or 52 weeks (1 year)
  // Let's generate 32 weeks for ideal desktop/tablet fit
  const { weeks, stats } = useMemo(() => {
    const today = new Date();
    // Normalize to end of day
    today.setHours(23, 59, 59, 999);

    const totalDays = 32 * 7; // 32 weeks
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - totalDays + 1);

    // Adjust start date to Monday
    const startDay = startDate.getDay();
    const diffToMonday = startDay === 0 ? -6 : 1 - startDay;
    startDate.setDate(startDate.getDate() + diffToMonday);

    const dayCells: {
      date: string;
      dateObj: Date;
      completedCount: number;
      totalHabits: number;
      rate: number;
      level: number;
      hasWorkout: boolean;
      workoutTitle?: string;
    }[] = [];

    let cur = new Date(startDate);
    let activeDaysCount = 0;
    let totalRateSum = 0;

    while (cur <= today) {
      const year = cur.getFullYear();
      const month = String(cur.getMonth() + 1).padStart(2, '0');
      const day = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      let completedCount = 0;
      habits.forEach((h) => {
        if (h.history && h.history[dateStr]) {
          completedCount++;
        }
      });

      const totalHabits = habits.length;
      const rate = totalHabits > 0 ? completedCount / totalHabits : 0;

      let level = 0;
      if (rate > 0 && rate <= 0.25) level = 1;
      else if (rate > 0.25 && rate <= 0.5) level = 2;
      else if (rate > 0.5 && rate <= 0.75) level = 3;
      else if (rate > 0.75) level = 4;

      const workout = workoutLogs[dateStr];
      const hasWorkout = Boolean(workout && workout.completed);

      if (level > 0 || hasWorkout) {
        activeDaysCount++;
        totalRateSum += Math.max(rate, hasWorkout ? 0.8 : 0);
      }

      dayCells.push({
        date: dateStr,
        dateObj: new Date(cur),
        completedCount,
        totalHabits,
        rate,
        level,
        hasWorkout,
        workoutTitle: workout?.title,
      });

      cur.setDate(cur.getDate() + 1);
    }

    // Group into columns of 7 days (Monday to Sunday)
    const groupedWeeks: (typeof dayCells)[] = [];
    let currentWeek: typeof dayCells = [];

    dayCells.forEach((cell, idx) => {
      currentWeek.push(cell);
      if (currentWeek.length === 7 || idx === dayCells.length - 1) {
        groupedWeeks.push(currentWeek);
        currentWeek = [];
      }
    });

    const consistencyPercent =
      dayCells.length > 0 ? Math.round((activeDaysCount / dayCells.length) * 100) : 0;

    return {
      weeks: groupedWeeks,
      stats: {
        activeDays: activeDaysCount,
        consistencyPercent,
        totalDaysEvaluated: dayCells.length,
      },
    };
  }, [habits, workoutLogs]);

  // Color mapper
  const getColorClass = (level: number, hasWorkout: boolean) => {
    if (level === 4) return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]';
    if (level === 3) return 'bg-emerald-500';
    if (level === 2) return 'bg-emerald-700';
    if (level === 1) return 'bg-emerald-900 border border-emerald-800/40';
    if (hasWorkout) return 'bg-cyan-600/80 shadow-[0_0_6px_rgba(6,182,212,0.5)]';
    return 'bg-slate-800/60 border border-slate-700/20';
  };

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white tracking-wide">
              Consistency Matrix & Activity
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            GitHub-style daily habits & workout activity tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            <div className="text-xs">
              <span className="text-slate-400">Active Days: </span>
              <span className="font-bold text-white">{stats.activeDays}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <Trophy className="w-4 h-4 text-emerald-400" />
            <div className="text-xs">
              <span className="text-slate-400">Consistency: </span>
              <span className="font-bold text-emerald-400">{stats.consistencyPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid container with horizontal scroll for responsiveness */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[760px]">
          <div className="flex gap-1.5">
            {/* Day of week labels */}
            <div className="flex flex-col gap-1.5 pr-2 pt-0.5 text-[10px] text-slate-500 font-medium select-none">
              {dayLabels.map((lbl, i) => (
                <div key={lbl} className="h-3.5 leading-3.5 flex items-center">
                  {i % 2 === 0 ? lbl : ''}
                </div>
              ))}
            </div>

            {/* Weeks columns */}
            <div className="flex gap-1.5">
              {weeks.map((week, wIdx) => (
                <div key={`week-${wIdx}`} className="flex flex-col gap-1.5">
                  {week.map((day) => (
                    <button
                      key={day.date}
                      type="button"
                      aria-label={`Select date ${day.date}`}
                      onClick={() => onSelectDate?.(day.date)}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredDay({
                          date: day.date,
                          completedCount: day.completedCount,
                          totalHabits: day.totalHabits,
                          hasWorkout: day.hasWorkout,
                          workoutTitle: day.workoutTitle,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`w-3.5 h-3.5 rounded-[3px] contrib-box cursor-pointer ${getColorClass(
                        day.level,
                        day.hasWorkout
                      )}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend & Hint */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">
            Click any square to inspect workout & habits
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-cyan-400 ml-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Gym Session
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 mr-1">Less</span>
          <div className="w-3 h-3 rounded-[2px] bg-slate-800/60 border border-slate-700/30" />
          <div className="w-3 h-3 rounded-[2px] bg-emerald-900" />
          <div className="w-3 h-3 rounded-[2px] bg-emerald-700" />
          <div className="w-3 h-3 rounded-[2px] bg-emerald-500" />
          <div className="w-3 h-3 rounded-[2px] bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          <span className="text-[11px] text-slate-500 ml-1">More</span>
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full -mt-2.5 px-3 py-2 bg-slate-950/95 border border-slate-700 text-xs rounded-lg shadow-2xl backdrop-blur-md"
          style={{ left: `${hoveredDay.x}px`, top: `${hoveredDay.y}px` }}
        >
          <p className="font-semibold text-white">{formatDatePretty(hoveredDay.date)}</p>
          <div className="flex items-center gap-1.5 text-emerald-400 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {hoveredDay.completedCount} of {hoveredDay.totalHabits} habits completed
            </span>
          </div>
          {hoveredDay.hasWorkout && (
            <div className="text-cyan-400 font-medium text-[11px] mt-0.5">
              🏋️ {hoveredDay.workoutTitle || 'Workout Logged'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
