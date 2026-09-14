'use client';

import React, { useMemo, useState } from 'react';
import { Habit, WorkoutDayLog } from '@/types';
import { formatDatePretty } from '@/lib/utils';
import { Flame, Trophy, Calendar, CheckCircle2, Dumbbell, ChevronRight } from 'lucide-react';

interface ContributionGridProps {
  habits?: Habit[];
  workoutLogs: Record<string, WorkoutDayLog>;
  onSelectDate?: (dateISO: string) => void;
  colorTheme?: 'emerald' | 'blue';
  title?: string;
  subtitle?: string;
  mode?: 'habits' | 'gym';
}

export const ContributionGrid: React.FC<ContributionGridProps> = ({
  habits = [],
  workoutLogs,
  onSelectDate,
  colorTheme = 'emerald',
  title,
  subtitle,
  mode = 'habits',
}) => {
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    dayNum: number;
    monthName: string;
    dayOfWeek: string;
    completedCount: number;
    totalHabits: number;
    hasWorkout: boolean;
    workoutTitle?: string;
    workoutSplit?: string;
    x: number;
    y: number;
  } | null>(null);

  // Generate 28 weeks of history
  const { weeks, monthHeaders, stats } = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const totalDays = 28 * 7;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - totalDays + 1);

    // Align start date to Monday
    const startDay = startDate.getDay();
    const diffToMonday = startDay === 0 ? -6 : 1 - startDay;
    startDate.setDate(startDate.getDate() + diffToMonday);

    const dayCells: {
      date: string;
      dayNum: number;
      monthName: string;
      dayOfWeek: string;
      completedCount: number;
      totalHabits: number;
      rate: number;
      level: number;
      hasWorkout: boolean;
      workoutTitle?: string;
      workoutSplit?: string;
    }[] = [];

    let cur = new Date(startDate);
    let activeDaysCount = 0;
    const monthHeaderList: { label: string; colIndex: number }[] = [];
    let lastMonth = -1;
    let colCounter = 0;

    while (cur <= today) {
      const year = cur.getFullYear();
      const month = String(cur.getMonth() + 1).padStart(2, '0');
      const day = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const curMonth = cur.getMonth();
      if (curMonth !== lastMonth) {
        monthHeaderList.push({
          label: cur.toLocaleDateString('en-US', { month: 'short' }),
          colIndex: Math.floor(colCounter / 7),
        });
        lastMonth = curMonth;
      }

      let completedCount = 0;
      habits.forEach((h) => {
        if (h.history && h.history[dateStr]) {
          completedCount++;
        }
      });

      const workout = workoutLogs[dateStr];
      const hasWorkout = Boolean(workout && workout.completed);

      const totalHabits = habits.length;
      let rate = 0;
      let level = 0;

      if (mode === 'gym') {
        // Gym-focused calculation
        if (hasWorkout) {
          activeDaysCount++;
          const exerciseCount = workout?.exercises?.length || 0;
          if (exerciseCount >= 4) level = 4;
          else if (exerciseCount === 3) level = 3;
          else if (exerciseCount === 2) level = 2;
          else level = 1;
        }
      } else {
        // Habits-focused calculation
        rate = totalHabits > 0 ? completedCount / totalHabits : 0;
        if (rate > 0 && rate <= 0.25) level = 1;
        else if (rate > 0.25 && rate <= 0.5) level = 2;
        else if (rate > 0.5 && rate <= 0.75) level = 3;
        else if (rate > 0.75) level = 4;

        if (level > 0 || hasWorkout) {
          activeDaysCount++;
        }
      }

      dayCells.push({
        date: dateStr,
        dayNum: cur.getDate(),
        monthName: cur.toLocaleDateString('en-US', { month: 'short' }),
        dayOfWeek: cur.toLocaleDateString('en-US', { weekday: 'short' }),
        completedCount,
        totalHabits,
        rate,
        level,
        hasWorkout,
        workoutTitle: workout?.title,
        workoutSplit: workout?.splitType,
      });

      cur.setDate(cur.getDate() + 1);
      colCounter++;
    }

    // Group into weeks (columns of 7 days)
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
      monthHeaders: monthHeaderList,
      stats: {
        activeDays: activeDaysCount,
        consistencyPercent,
        totalDaysEvaluated: dayCells.length,
      },
    };
  }, [habits, workoutLogs, mode]);

  // Dynamic Color Palette for Emerald vs Blue theme
  const getColorClass = (level: number, hasWorkout: boolean) => {
    if (colorTheme === 'blue') {
      if (level === 4) return 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] border border-cyan-300';
      if (level === 3) return 'bg-sky-500 shadow-sm';
      if (level === 2) return 'bg-blue-600';
      if (level === 1) return 'bg-blue-900 border border-blue-800/60';
      return 'bg-slate-800/70 border border-slate-700/30';
    }

    // Emerald theme (Habits)
    if (level === 4) return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] border border-emerald-300';
    if (level === 3) return 'bg-emerald-500 shadow-sm';
    if (level === 2) return 'bg-emerald-700';
    if (level === 1) return 'bg-emerald-950 border border-emerald-800/40';
    if (hasWorkout) return 'bg-cyan-600/80 shadow-[0_0_6px_rgba(6,182,212,0.5)]';
    return 'bg-slate-800/70 border border-slate-700/30';
  };

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const defaultTitle =
    mode === 'gym' ? 'Fitness Activity Matrix' : 'Consistency Matrix & Activity';
  const defaultSubtitle =
    mode === 'gym'
      ? 'Weekly workout volume, split distribution & training consistency'
      : 'Daily habit completions and routine consistency grid';

  const accentText = colorTheme === 'blue' ? 'text-cyan-400' : 'text-emerald-400';
  const accentBorder = colorTheme === 'blue' ? 'border-cyan-500/30' : 'border-emerald-500/30';
  const accentBg = colorTheme === 'blue' ? 'bg-cyan-500/10' : 'bg-emerald-500/10';

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5">
        <div>
          <div className="flex items-center gap-2">
            {mode === 'gym' ? (
              <Dumbbell className={`w-5 h-5 ${accentText}`} />
            ) : (
              <Calendar className={`w-5 h-5 ${accentText}`} />
            )}
            <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
              {title || defaultTitle}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {subtitle || defaultSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/70 border border-slate-700/50 text-xs">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">
              {mode === 'gym' ? 'Workouts: ' : 'Active Days: '}
              <strong className="text-white">{stats.activeDays}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/70 border border-slate-700/50 text-xs">
            <Trophy className={`w-3.5 h-3.5 ${accentText}`} />
            <span className="text-slate-400">
              Score: <strong className={accentText}>{stats.consistencyPercent}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Grid Container with responsive horizontal scroll */}
      <div className="overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
        <div className="inline-block min-w-full">
          {/* Month Labels Bar */}
          <div className="flex mb-1.5 pl-8 sm:pl-9 text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-wider">
            {weeks.map((_, wIdx) => {
              const header = monthHeaders.find((h) => h.colIndex === wIdx);
              return (
                <div
                  key={`month-${wIdx}`}
                  className="w-4 sm:w-4.5 mr-1 text-left whitespace-nowrap overflow-visible"
                >
                  {header ? header.label : ''}
                </div>
              );
            })}
          </div>

          {/* Days Grid Rows */}
          <div className="flex gap-1 sm:gap-1.5">
            {/* Day of week labels */}
            <div className="flex flex-col gap-1 sm:gap-1.5 pr-1.5 sm:pr-2 pt-0.5 text-[9px] sm:text-[10px] text-slate-400 font-semibold select-none">
              {dayLabels.map((lbl, i) => (
                <div key={lbl} className="h-3.5 sm:h-4 leading-3.5 sm:leading-4 flex items-center justify-end w-6">
                  {i % 2 === 0 ? lbl : ''}
                </div>
              ))}
            </div>

            {/* Weeks Columns */}
            <div className="flex gap-1 sm:gap-1.5">
              {weeks.map((week, wIdx) => (
                <div key={`col-${wIdx}`} className="flex flex-col gap-1 sm:gap-1.5">
                  {week.map((day) => (
                    <button
                      key={day.date}
                      type="button"
                      aria-label={`${day.dayOfWeek}, ${day.monthName} ${day.dayNum}`}
                      onClick={() => onSelectDate?.(day.date)}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredDay({
                          date: day.date,
                          dayNum: day.dayNum,
                          monthName: day.monthName,
                          dayOfWeek: day.dayOfWeek,
                          completedCount: day.completedCount,
                          totalHabits: day.totalHabits,
                          hasWorkout: day.hasWorkout,
                          workoutTitle: day.workoutTitle,
                          workoutSplit: day.workoutSplit,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3px] contrib-box cursor-pointer relative group flex items-center justify-center text-[7px] font-mono text-white/50 ${getColorClass(
                        day.level,
                        day.hasWorkout
                      )}`}
                    >
                      {/* Day number visible subtly on desktop */}
                      <span className="hidden sm:inline-block select-none opacity-0 group-hover:opacity-100 text-[8px] font-bold text-slate-900">
                        {day.dayNum}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend & Details Footer */}
      <div className="mt-3 sm:mt-4 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span>Click any cell to inspect details</span>
          {mode === 'gym' ? (
            <span className="inline-flex items-center gap-1.5 text-cyan-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Blue Intensity = Workout Volume
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Green = Habit Consistency
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-slate-500 mr-1">Less</span>
          <div className="w-3 h-3 rounded-[2px] bg-slate-800/80 border border-slate-700/40" />
          {colorTheme === 'blue' ? (
            <>
              <div className="w-3 h-3 rounded-[2px] bg-blue-950" />
              <div className="w-3 h-3 rounded-[2px] bg-blue-700" />
              <div className="w-3 h-3 rounded-[2px] bg-sky-500" />
              <div className="w-3 h-3 rounded-[2px] bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
            </>
          ) : (
            <>
              <div className="w-3 h-3 rounded-[2px] bg-emerald-950" />
              <div className="w-3 h-3 rounded-[2px] bg-emerald-700" />
              <div className="w-3 h-3 rounded-[2px] bg-emerald-500" />
              <div className="w-3 h-3 rounded-[2px] bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            </>
          )}
          <span className="text-slate-500 ml-1">More</span>
        </div>
      </div>

      {/* Rich Hover Tooltip with Day of Week and Day of Month */}
      {hoveredDay && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full -mt-3 px-3.5 py-2.5 bg-slate-950/95 border border-slate-700 text-xs rounded-xl shadow-2xl backdrop-blur-md min-w-[200px]"
          style={{ left: `${hoveredDay.x}px`, top: `${hoveredDay.y}px` }}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5">
            <span className="font-bold text-white">
              {hoveredDay.dayOfWeek}, {hoveredDay.monthName} {hoveredDay.dayNum}
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
              Day {hoveredDay.dayNum}
            </span>
          </div>

          {mode === 'gym' ? (
            <div>
              {hoveredDay.hasWorkout ? (
                <div className="space-y-1">
                  <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                    <Dumbbell className="w-3.5 h-3.5" />
                    <span>{hoveredDay.workoutTitle || 'Session Logged'}</span>
                  </div>
                  {hoveredDay.workoutSplit && (
                    <div className="text-[11px] text-slate-400">
                      Split: <span className="uppercase font-semibold text-slate-200">{hoveredDay.workoutSplit}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 italic text-[11px]">Rest / No training logged</div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {hoveredDay.completedCount} of {hoveredDay.totalHabits} habits completed
                </span>
              </div>
              {hoveredDay.hasWorkout && (
                <div className="text-cyan-400 font-semibold text-[11px] mt-1 flex items-center gap-1">
                  <Dumbbell className="w-3 h-3" />
                  <span>{hoveredDay.workoutTitle || 'Workout Logged'}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
