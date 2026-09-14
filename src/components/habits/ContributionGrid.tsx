'use client';

import React, { useMemo, useState } from 'react';
import { Habit, WorkoutDayLog } from '@/types';
import { Calendar, CheckCircle2, Dumbbell, Flame, TrendingUp } from 'lucide-react';

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

  // 26 weeks for optimal density on all viewports
  const { weeks, monthHeaders, stats } = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const totalDays = 26 * 7;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - totalDays + 1);

    // Monday as start of week
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
        if (hasWorkout) {
          activeDaysCount++;
          const exerciseCount = workout?.exercises?.length || 0;
          if (exerciseCount >= 4) level = 4;
          else if (exerciseCount === 3) level = 3;
          else if (exerciseCount === 2) level = 2;
          else level = 1;
        }
      } else {
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
      },
    };
  }, [habits, workoutLogs, mode]);

  // Clean, high-contrast palette
  const getCellColor = (level: number, hasWorkout: boolean) => {
    if (colorTheme === 'blue') {
      if (level === 4) return 'bg-blue-500 border border-blue-400 text-slate-950';
      if (level === 3) return 'bg-blue-600 border border-blue-500 text-white';
      if (level === 2) return 'bg-blue-800 border border-blue-700 text-white';
      if (level === 1) return 'bg-blue-950/80 border border-blue-900 text-blue-300';
      return 'bg-surface-2 border border-surface-border';
    }

    // Emerald theme
    if (level === 4) return 'bg-emerald-500 border border-emerald-400 text-slate-950';
    if (level === 3) return 'bg-emerald-600 border border-emerald-500 text-white';
    if (level === 2) return 'bg-emerald-800 border border-emerald-700 text-white';
    if (level === 1) return 'bg-emerald-950/80 border border-emerald-900 text-emerald-300';
    if (hasWorkout) return 'bg-blue-600/70 border border-blue-500 text-white';
    return 'bg-surface-2 border border-surface-border';
  };

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="bg-surface-1 border border-surface-border rounded-2xl p-4 sm:p-6 transition-colors">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            {mode === 'gym' ? (
              <Dumbbell className="w-4 h-4 text-blue-400" />
            ) : (
              <Calendar className="w-4 h-4 text-emerald-400" />
            )}
            <h3 className="text-base font-semibold text-white tracking-tight">
              {title || (mode === 'gym' ? 'Training Consistency' : 'Habit Consistency')}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {subtitle || (mode === 'gym' ? 'Workout frequency and session volume distribution' : 'Daily completion rate over the past 26 weeks')}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-2 border border-surface-border text-xs tabular-nums">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">
              Active: <strong className="text-white font-semibold">{stats.activeDays}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-2 border border-surface-border text-xs tabular-nums">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">
              Rate: <strong className="text-white font-semibold">{stats.consistencyPercent}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Grid Canvas with Horizontal Scroll */}
      <div className="overflow-x-auto pb-2 scrollbar-thin -mx-1 px-1">
        <div className="inline-block min-w-full">
          {/* Month Header Track */}
          <div className="flex mb-1.5 pl-6 text-[10px] font-medium text-slate-400 tracking-tight">
            {weeks.map((_, wIdx) => {
              const header = monthHeaders.find((h) => h.colIndex === wIdx);
              return (
                <div key={`m-${wIdx}`} className="w-3.5 sm:w-4 mr-1 text-left whitespace-nowrap overflow-visible">
                  {header ? header.label : ''}
                </div>
              );
            })}
          </div>

          {/* Days Grid */}
          <div className="flex gap-1 sm:gap-1.5">
            {/* Weekday labels */}
            <div className="flex flex-col gap-1 sm:gap-1.5 pr-1.5 text-[9px] text-slate-400 font-semibold select-none">
              {dayLabels.map((lbl, i) => (
                <div key={`${lbl}-${i}`} className="h-3.5 sm:h-4 leading-3.5 sm:leading-4 flex items-center justify-end w-4">
                  {i % 2 === 0 ? lbl : ''}
                </div>
              ))}
            </div>

            {/* Weeks Columns */}
            <div className="flex gap-1 sm:gap-1.5">
              {weeks.map((week, wIdx) => (
                <div key={`wk-${wIdx}`} className="flex flex-col gap-1 sm:gap-1.5">
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
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3px] contrib-cell cursor-pointer relative flex items-center justify-center text-[7px] font-mono select-none ${getCellColor(
                        day.level,
                        day.hasWorkout
                      )}`}
                    >
                      <span className="opacity-0 hover:opacity-100 font-bold pointer-events-none hidden sm:inline">
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

      {/* Grid Legend & Interactive Cue */}
      <div className="mt-4 pt-3.5 border-t border-surface-border flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2 text-[11px]">
          <span>Tap any day to view or edit logs</span>
          {mode === 'gym' ? (
            <span className="inline-flex items-center gap-1.5 text-blue-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Volume Scale
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Completion Scale
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px] self-end sm:self-auto">
          <span className="text-slate-400 mr-1">Less</span>
          <div className="w-3 h-3 rounded-[2px] bg-surface-2 border border-surface-border" />
          {colorTheme === 'blue' ? (
            <>
              <div className="w-3 h-3 rounded-[2px] bg-blue-950/80 border border-blue-900" />
              <div className="w-3 h-3 rounded-[2px] bg-blue-800 border border-blue-700" />
              <div className="w-3 h-3 rounded-[2px] bg-blue-600 border border-blue-500" />
              <div className="w-3 h-3 rounded-[2px] bg-blue-500 border border-blue-400" />
            </>
          ) : (
            <>
              <div className="w-3 h-3 rounded-[2px] bg-emerald-950/80 border border-emerald-900" />
              <div className="w-3 h-3 rounded-[2px] bg-emerald-800 border border-emerald-700" />
              <div className="w-3 h-3 rounded-[2px] bg-emerald-600 border border-emerald-500" />
              <div className="w-3 h-3 rounded-[2px] bg-emerald-500 border border-emerald-400" />
            </>
          )}
          <span className="text-slate-400 ml-1">More</span>
        </div>
      </div>

      {/* Floating Precision Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full -mt-2.5 px-3 py-2 bg-surface-1/95 border border-surface-border text-xs rounded-xl shadow-xl backdrop-blur-md min-w-[190px]"
          style={{ left: `${hoveredDay.x}px`, top: `${hoveredDay.y}px` }}
        >
          <div className="flex items-center justify-between border-b border-surface-border pb-1 mb-1.5 font-medium">
            <span className="text-white">
              {hoveredDay.dayOfWeek}, {hoveredDay.monthName} {hoveredDay.dayNum}
            </span>
            <span className="text-[10px] text-slate-400 tabular-nums">
              Day {hoveredDay.dayNum}
            </span>
          </div>

          {mode === 'gym' ? (
            <div>
              {hoveredDay.hasWorkout ? (
                <div className="space-y-0.5">
                  <div className="text-blue-400 font-semibold flex items-center gap-1.5">
                    <Dumbbell className="w-3 h-3" />
                    <span className="truncate">{hoveredDay.workoutTitle || 'Session Logged'}</span>
                  </div>
                  {hoveredDay.workoutSplit && (
                    <div className="text-[10px] text-slate-400 capitalize">
                      Split: {hoveredDay.workoutSplit}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-400 text-[11px]">Rest day</div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3" />
                <span>
                  {hoveredDay.completedCount} of {hoveredDay.totalHabits} completed
                </span>
              </div>
              {hoveredDay.hasWorkout && (
                <div className="text-blue-400 text-[10px] mt-1 flex items-center gap-1">
                  <Dumbbell className="w-2.5 h-2.5" />
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
