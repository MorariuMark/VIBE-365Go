'use client';

import React, { useState } from 'react';
import { HabitBreaker, HabitBreakerLogEntry } from '@/types';
import { CylinderTimePicker } from '@/components/common/CylinderTimePicker';
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
  Check,
  RotateCcw,
} from 'lucide-react';
import { getTodayISO, formatDatePretty } from '@/lib/utils';

interface HabitBreakerCardProps {
  breaker: HabitBreaker;
  selectedDate: string;
  onLogExecution: (
    breakerId: string,
    dateISO: string,
    executed: boolean,
    metricValue?: number,
    notes?: string,
    metricHours?: number,
    metricMinutes?: number
  ) => void;
  onDeleteBreaker: (breakerId: string) => void;
}

export const HabitBreakerCard: React.FC<HabitBreakerCardProps> = ({
  breaker,
  selectedDate,
  onLogExecution,
  onDeleteBreaker,
}) => {
  const [activeDayModal, setActiveDayModal] = useState<{
    isOpen: boolean;
    dateISO: string;
    action: 'add_frequency' | 'remove_frequency' | 'log_metric';
  } | null>(null);

  // Time picker state for metric mode
  const [selectedHours, setSelectedHours] = useState<number>(2);
  const [selectedMinutes, setSelectedMinutes] = useState<number>(20);
  const [selectedFloatVal, setSelectedFloatVal] = useState<number>(2.33);
  const [modalNotes, setModalNotes] = useState<string>('');

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
  const targetMonth = targetDate.getMonth();

  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const dayStr = String(dayNum).padStart(2, '0');
    const monthStr = String(targetMonth + 1).padStart(2, '0');
    return `${targetYear}-${monthStr}-${dayStr}`;
  });

  const executedDaysThisMonth = monthDays.filter(
    (iso) => breaker.logs[iso] && breaker.logs[iso].executed
  );
  const executionCount = executedDaysThisMonth.length;

  const allowanceRemaining = Math.max(0, currentMonthTarget - executionCount);
  const isOverLimit = executionCount > currentMonthTarget;
  const excessBreaches = isOverLimit ? executionCount - currentMonthTarget : 0;

  // Clean streak (consecutive clean days leading up to selectedDate)
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

  // Click handler on calendar day
  const handleDayClick = (iso: string) => {
    const existing = breaker.logs[iso];

    if (breaker.trackingType === 'metric') {
      const h = existing?.metricHours !== undefined ? existing.metricHours : existing?.metricValue ? Math.floor(existing.metricValue) : 2;
      const m = existing?.metricMinutes !== undefined ? existing.metricMinutes : existing?.metricValue ? Math.round((existing.metricValue % 1) * 60) : 20;
      setSelectedHours(h);
      setSelectedMinutes(m);
      setSelectedFloatVal(existing?.metricValue !== undefined ? existing.metricValue : parseFloat((h + m / 60).toFixed(2)));
      setModalNotes(existing?.notes || '');
      setActiveDayModal({
        isOpen: true,
        dateISO: iso,
        action: 'log_metric',
      });
    } else {
      if (existing && existing.executed) {
        // Confirmation to remove
        setActiveDayModal({
          isOpen: true,
          dateISO: iso,
          action: 'remove_frequency',
        });
      } else {
        // Confirmation to add
        setActiveDayModal({
          isOpen: true,
          dateISO: iso,
          action: 'add_frequency',
        });
      }
    }
  };

  const handleConfirmAction = () => {
    if (!activeDayModal) return;

    if (activeDayModal.action === 'add_frequency') {
      onLogExecution(breaker.id, activeDayModal.dateISO, true, undefined, modalNotes);
    } else if (activeDayModal.action === 'remove_frequency') {
      onLogExecution(breaker.id, activeDayModal.dateISO, false);
    } else if (activeDayModal.action === 'log_metric') {
      onLogExecution(
        breaker.id,
        activeDayModal.dateISO,
        true,
        selectedFloatVal,
        modalNotes,
        selectedHours,
        selectedMinutes
      );
    }

    setActiveDayModal(null);
    setModalNotes('');
  };

  const handleRemoveMetricEntry = () => {
    if (!activeDayModal) return;
    setActiveDayModal({
      isOpen: true,
      dateISO: activeDayModal.dateISO,
      action: 'remove_frequency',
    });
  };

  const formatEntryTime = (entry: HabitBreakerLogEntry) => {
    if (entry.metricHours !== undefined || entry.metricMinutes !== undefined) {
      const h = entry.metricHours || 0;
      const m = entry.metricMinutes || 0;
      return `${h}h ${m}m`;
    }
    if (entry.metricValue !== undefined) {
      const h = Math.floor(entry.metricValue);
      const m = Math.round((entry.metricValue % 1) * 60);
      return m > 0 ? `${h}h ${m}m` : `${entry.metricValue}h`;
    }
    return 'Logged';
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
                {breaker.trackingType === 'frequency' ? 'Days Allowance' : `Daily Hours & Minutes`}
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
              (Target: ≤ {currentMonthTarget} {breaker.trackingType === 'frequency' ? 'days' : `${breaker.metricUnit || 'hrs'}/day`})
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
                Daily Ceiling: <strong className="text-white">{currentMonthTarget} {breaker.metricUnit || 'hrs'}</strong>
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
                    {breaker.trackingType === 'frequency' ? 'days' : breaker.metricUnit || 'hrs'}
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
            Click day to confirm execution or edit
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
                onClick={() => handleDayClick(iso)}
                className={`p-1.5 rounded-lg border text-center transition flex flex-col items-center justify-between min-h-[50px] relative active-press ${
                  isExecuted
                    ? 'bg-rose-950/40 border-rose-600/50 text-rose-300'
                    : 'bg-[#090b10] border-[#1b2131] hover:border-[#2b334c] text-slate-400'
                } ${isToday ? 'ring-1 ring-blue-400' : ''}`}
                title={`${iso}: ${isExecuted ? 'Habit executed (click to remove)' : 'Clean day (click to record)'}`}
              >
                <span className="text-[10px] font-mono font-bold">{dayNum}</span>
                {isExecuted ? (
                  <span className="text-[9px] font-mono font-extrabold text-rose-400 leading-tight">
                    {breaker.trackingType === 'metric'
                      ? formatEntryTime(entry)
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

      {/* POP-UP CONFIRMATION MODAL (Prevents accidental add / accidental delete) */}
      {activeDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0c0e17] border border-[#1e2436] w-full max-w-md rounded-2xl shadow-2xl my-auto overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#1b2133] bg-[#0d101a] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    activeDayModal.action === 'remove_frequency'
                      ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-400'
                      : 'bg-rose-950/40 border border-rose-800/40 text-rose-400'
                  }`}
                >
                  {activeDayModal.action === 'remove_frequency' ? (
                    <RotateCcw className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {activeDayModal.action === 'add_frequency'
                      ? 'Confirm Habit Execution'
                      : activeDayModal.action === 'remove_frequency'
                      ? 'Remove Logged Execution'
                      : `Log Time for ${formatDatePretty(activeDayModal.dateISO)}`}
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    {formatDatePretty(activeDayModal.dateISO)} • {breaker.title}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDayModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 text-xs">
              {/* CASE 1: CONFIRM ADD FREQUENCY DAY */}
              {activeDayModal.action === 'add_frequency' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-[#141824] border border-[#232a3e] text-slate-300 leading-relaxed">
                    Are you sure you want to mark <strong className="text-white font-mono">{formatDatePretty(activeDayModal.dateISO)}</strong> as an execution day for <strong className="text-rose-400">{breaker.title}</strong>?
                    <div className="mt-2 text-[11px] font-mono text-amber-400">
                      ⚡ This will deduct 1 day from your monthly allowance ({allowanceRemaining} days remaining).
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                      Trigger or Reflection Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={modalNotes}
                      onChange={(e) => setModalNotes(e.target.value)}
                      placeholder="e.g. Felt stressed after work, slipped up..."
                      className="w-full px-3 py-2 rounded-lg bg-[#090b10] border border-[#232a3e] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}

              {/* CASE 2: CONFIRM REMOVE DAY / TIME ENTRY */}
              {activeDayModal.action === 'remove_frequency' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-[#141824] border border-[#232a3e] text-slate-300 leading-relaxed">
                    Remove the entry recorded on <strong className="text-white font-mono">{formatDatePretty(activeDayModal.dateISO)}</strong>?
                    <div className="mt-2 text-[11px] font-mono text-emerald-400">
                      {breaker.trackingType === 'metric'
                        ? '✅ This will clear the logged duration and mark this day clean.'
                        : `✅ This will restore 1 day back to your available monthly allowance (${allowanceRemaining + 1} days remaining).`}
                    </div>
                  </div>
                </div>
              )}

              {/* CASE 3: CYLINDER TIME PICKER FOR METRIC AMOUNT (INT / FLOAT) */}
              {activeDayModal.action === 'log_metric' && (
                <div className="space-y-4">
                  <CylinderTimePicker
                    initialHours={selectedHours}
                    initialMinutes={selectedMinutes}
                    onChange={(h, m, floatVal) => {
                      setSelectedHours(h);
                      setSelectedMinutes(m);
                      setSelectedFloatVal(floatVal);
                    }}
                  />

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                      Context / Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={modalNotes}
                      onChange={(e) => setModalNotes(e.target.value)}
                      placeholder="e.g. Social media doomscrolling in evening..."
                      className="w-full px-3 py-2 rounded-lg bg-[#090b10] border border-[#232a3e] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-[#1b2133] bg-[#0d101a] flex items-center justify-between">
              {activeDayModal.action === 'log_metric' && breaker.logs[activeDayModal.dateISO]?.executed ? (
                <button
                  type="button"
                  onClick={handleRemoveMetricEntry}
                  className="text-xs font-mono text-rose-400 hover:text-rose-300 hover:underline"
                >
                  Remove Entry
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveDayModal(null)}
                  className="px-4 py-2 rounded-lg bg-[#141824] text-slate-300 text-xs font-semibold hover:bg-[#1b2234] transition"
                >
                  Cancel
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-5 py-2 rounded-lg font-bold text-xs transition active-press shadow-sm ${
                  activeDayModal.action === 'remove_frequency'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {activeDayModal.action === 'add_frequency'
                  ? 'Confirm Execution'
                  : activeDayModal.action === 'remove_frequency'
                  ? 'Restore Clean Day'
                  : 'Save Time Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
