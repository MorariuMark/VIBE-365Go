'use client';

import React, { useState } from 'react';
import { HabitBreaker, HabitBreakerLogEntry } from '@/types';
import {
  ShieldAlert,
  Flame,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  X,
  Clock,
  TrendingDown,
  Info,
} from 'lucide-react';
import { getTodayISO } from '@/lib/utils';

interface HabitBreakerCardProps {
  breaker: HabitBreaker;
  selectedDate: string;
  onLogExecution: (
    breakerId: string,
    dateISO: string,
    executed: boolean,
    metricValue?: number,
    notes?: string
  ) => void;
  onDeleteBreaker: (breakerId: string) => void;
}

export const HabitBreakerCard: React.FC<HabitBreakerCardProps> = ({
  breaker,
  selectedDate,
  onLogExecution,
  onDeleteBreaker,
}) => {
  const [activeMonthOffset, setActiveMonthOffset] = useState<number>(0);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [metricInputValue, setMetricInputValue] = useState<string>('');
  const [dayNotes, setDayNotes] = useState<string>('');

  const today = getTodayISO();

  // Determine current active month index in plan (based on startDate)
  const startDate = new Date(breaker.startDate);
  const targetDate = new Date(selectedDate);
  const monthsDiff =
    (targetDate.getFullYear() - startDate.getFullYear()) * 12 +
    (targetDate.getMonth() - startDate.getMonth());

  const currentMonthIndex = Math.max(1, Math.min(monthsDiff + 1, breaker.durationMonths + 1));
  const currentPlan =
    breaker.monthlyPlan.find((p) => p.monthIndex === currentMonthIndex) ||
    breaker.monthlyPlan[breaker.monthlyPlan.length - 1];

  const currentMonthTarget = currentPlan ? currentPlan.targetAllowance : 0;

  // Compute executions and metrics for the current calendar month
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth(); // 0-indexed

  // Days in month
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const dayStr = String(dayNum).padStart(2, '0');
    const monthStr = String(targetMonth + 1).padStart(2, '0');
    return `${targetYear}-${monthStr}-${dayStr}`;
  });

  // Calculate executed days in this month
  const executedDaysThisMonth = monthDays.filter(
    (iso) => breaker.logs[iso] && breaker.logs[iso].executed
  );
  const executionCount = executedDaysThisMonth.length;

  // Allowance math
  const allowanceRemaining = Math.max(0, currentMonthTarget - executionCount);
  const isOverLimit = executionCount > currentMonthTarget;
  const excessBreaches = isOverLimit ? executionCount - currentMonthTarget : 0;

  // Clean streak (consecutive days without execution leading up to selectedDate)
  const cleanStreak = React.useMemo(() => {
    let streak = 0;
    const cur = new Date(selectedDate);
    while (true) {
      const iso = cur.toISOString().split('T')[0];
      const log = breaker.logs[iso];
      if (log && log.executed) {
        break;
      }
      streak++;
      cur.setDate(cur.getDate() - 1);
      if (streak > 365) break;
    }
    return Math.max(0, streak - 1);
  }, [breaker.logs, selectedDate]);

  // Today log entry
  const todayEntry = breaker.logs[selectedDate];

  const handleToggleDayExecution = (iso: string) => {
    const existing = breaker.logs[iso];
    if (existing && existing.executed) {
      // Toggle off
      onLogExecution(breaker.id, iso, false);
    } else {
      // Toggle on
      onLogExecution(breaker.id, iso, true, undefined, 'Performed habit');
    }
  };

  const handleSaveDayMetric = (iso: string) => {
    const val = metricInputValue ? parseFloat(metricInputValue) : undefined;
    onLogExecution(breaker.id, iso, true, val, dayNotes);
    setEditingDay(null);
    setMetricInputValue('');
    setDayNotes('');
  };

  return (
    <div className="bg-[#0e1119] border border-[#1b2131] hover:border-[#2b334c] rounded-2xl p-4 sm:p-6 space-y-5 transition-all">
      {/* Top Title & Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border"
            style={{
              backgroundColor: `${breaker.color}15`,
              borderColor: `${breaker.color}40`,
              color: breaker.color,
            }}
          >
            <ShieldAlert className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {breaker.title}
              </h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#141824] text-slate-300 border border-[#232a3e]">
                {breaker.trackingType === 'frequency' ? 'Days Allowance' : `Daily ${breaker.metricUnit || 'Metric'}`}
              </span>
              <span className="text-[10px] font-mono capitalize px-2 py-0.5 rounded bg-[#141824] text-slate-400 border border-[#232a3e]">
                {breaker.aggressiveness} Taper
              </span>
            </div>
            {breaker.description && (
              <p className="text-xs text-slate-400 mt-1">{breaker.description}</p>
            )}
          </div>
        </div>

        {/* Clean Streak & Delete */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#141824] border border-[#232a3e] text-xs font-mono">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Clean Streak:</span>
            <span className="font-bold text-emerald-400">{cleanStreak}d</span>
          </div>

          <button
            type="button"
            onClick={() => onDeleteBreaker(breaker.id)}
            className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
            title="Delete habit breaker (moves to 30-day trash)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progressive Monthly Allowance Schedule Banner */}
      <div className="bg-[#090b10] border border-[#1b2131] rounded-xl p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-200">
              Month {currentMonthIndex} of {breaker.durationMonths}
            </span>
            <span className="text-slate-500 font-mono">
              (Target: ≤ {currentMonthTarget} {breaker.trackingType === 'frequency' ? 'days' : `${breaker.metricUnit || ''}/day`})
            </span>
          </div>

          <div className="text-[11px] font-mono">
            {breaker.trackingType === 'frequency' ? (
              isOverLimit ? (
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>+{excessBreaches} Over Limit ({executionCount}/{currentMonthTarget} recorded)</span>
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold">
                  {allowanceRemaining} of {currentMonthTarget} allowed days remaining
                </span>
              )
            ) : (
              <span className="text-slate-300">
                Daily Ceiling: <strong className="text-white">{currentMonthTarget} {breaker.metricUnit}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Monthly Plan Milestone Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {breaker.monthlyPlan.map((plan) => {
            const isCurrent = plan.monthIndex === currentMonthIndex;
            const isPast = plan.monthIndex < currentMonthIndex;

            return (
              <div
                key={plan.monthIndex}
                className={`p-2 rounded-lg border text-center font-mono text-xs transition ${
                  isCurrent
                    ? 'bg-[#1b2336] border-[#3b82f6] text-white'
                    : isPast
                    ? 'bg-[#0e1119] border-[#1b2131] text-slate-500 line-through'
                    : 'bg-[#0e1119] border-[#1b2131] text-slate-400'
                }`}
              >
                <div className="text-[10px] text-slate-400 uppercase">Month {plan.monthIndex}</div>
                <div className="font-bold text-sm mt-0.5">
                  {plan.targetAllowance}{' '}
                  <span className="text-[10px] font-normal text-slate-400">
                    {breaker.trackingType === 'frequency' ? 'days' : breaker.metricUnit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Allowance Depletion Bar */}
        {breaker.trackingType === 'frequency' && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Monthly Allowance Usage</span>
              <span className={isOverLimit ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                {executionCount} / {currentMonthTarget} days used
              </span>
            </div>
            <div className="w-full bg-[#141824] h-2 rounded-full overflow-hidden flex">
              <div
                className={`h-full transition-all duration-300 ${
                  isOverLimit
                    ? 'bg-rose-500'
                    : executionCount > currentMonthTarget * 0.75
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                style={{
                  width: `${Math.min(100, currentMonthTarget > 0 ? (executionCount / currentMonthTarget) * 100 : 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Interactive 30-Day Execution Calendar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300">
              {targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Execution Log
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Click day to log or adjust
          </span>
        </div>

        {/* 30-Day Grid */}
        <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-16 gap-1.5 pt-1">
          {monthDays.map((iso) => {
            const dayNum = parseInt(iso.split('-')[2], 10);
            const entry = breaker.logs[iso];
            const isExecuted = Boolean(entry && entry.executed);
            const isToday = iso === today;

            return (
              <button
                key={iso}
                type="button"
                onClick={() => {
                  if (breaker.trackingType === 'metric') {
                    setEditingDay(iso);
                    setMetricInputValue(entry?.metricValue !== undefined ? String(entry.metricValue) : '');
                    setDayNotes(entry?.notes || '');
                  } else {
                    handleToggleDayExecution(iso);
                  }
                }}
                className={`p-1.5 rounded-lg border text-center transition flex flex-col items-center justify-between min-h-[48px] relative ${
                  isExecuted
                    ? 'bg-rose-950/40 border-rose-600/50 text-rose-300'
                    : 'bg-[#090b10] border-[#1b2131] hover:border-[#2b334c] text-slate-400'
                } ${isToday ? 'ring-1 ring-blue-400' : ''}`}
                title={`${iso}: ${isExecuted ? 'Habit executed' : 'Clean day'}`}
              >
                <span className="text-[10px] font-mono font-bold">{dayNum}</span>
                {isExecuted ? (
                  <span className="text-[9px] font-mono font-extrabold text-rose-400">
                    {breaker.trackingType === 'metric' && entry?.metricValue !== undefined
                      ? `${entry.metricValue}${breaker.metricUnit || 'h'}`
                      : 'FAIL'}
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 my-auto" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Day Log Modal for Metric Mode */}
      {editingDay && (
        <div className="p-4 rounded-xl bg-[#141824] border border-blue-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">
              Log Usage for {editingDay} ({breaker.title})
            </span>
            <button
              type="button"
              onClick={() => setEditingDay(null)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1">
                Amount ({breaker.metricUnit || 'Units'})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={metricInputValue}
                onChange={(e) => setMetricInputValue(e.target.value)}
                placeholder={`e.g. 3.5 ${breaker.metricUnit || ''}`}
                className="w-full px-3 py-1.5 rounded-lg bg-[#090b10] border border-[#232a3e] text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1">
                Trigger Notes (Optional)
              </label>
              <input
                type="text"
                value={dayNotes}
                onChange={(e) => setDayNotes(e.target.value)}
                placeholder="e.g. Boredom in evening, stressed..."
                className="w-full px-3 py-1.5 rounded-lg bg-[#090b10] border border-[#232a3e] text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                onLogExecution(breaker.id, editingDay, false);
                setEditingDay(null);
              }}
              className="text-xs text-slate-400 hover:text-white"
            >
              Mark Clean (0 {breaker.metricUnit})
            </button>

            <button
              type="button"
              onClick={() => handleSaveDayMetric(editingDay)}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
            >
              Save Metric Log
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
