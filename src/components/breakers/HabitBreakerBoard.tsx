'use client';

import React, { useState } from 'react';
import { HabitBreaker } from '@/types';
import { HabitBreakerCard } from './HabitBreakerCard';
import { CreateBreakerModal } from './CreateBreakerModal';
import {
  ShieldAlert,
  Plus,
  Flame,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
} from 'lucide-react';

interface HabitBreakerBoardProps {
  breakers: HabitBreaker[];
  selectedDate: string;
  onLogExecution: (
    breakerId: string,
    dateISO: string,
    executed: boolean,
    metricValue?: number,
    notes?: string
  ) => void;
  onCreateBreaker: (
    newBreaker: Omit<HabitBreaker, 'id' | 'createdAt' | 'logs'>
  ) => void;
  onDeleteBreaker: (breakerId: string) => void;
}

export const HabitBreakerBoard: React.FC<HabitBreakerBoardProps> = ({
  breakers = [],
  selectedDate,
  onLogExecution,
  onCreateBreaker,
  onDeleteBreaker,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Compute summary stats
  const totalBreakers = breakers.length;

  // Total executions this month across all breakers
  const currentMonthISO = selectedDate.substring(0, 7); // YYYY-MM
  let totalBreachesThisMonth = 0;

  breakers.forEach((b) => {
    if (b.trackingType === 'frequency') {
      const monthLogs = Object.keys(b.logs).filter(
        (iso) => iso.startsWith(currentMonthISO) && b.logs[iso].executed
      );
      const targetAllowance = b.monthlyPlan[0]?.targetAllowance || 0;
      if (monthLogs.length > targetAllowance) {
        totalBreachesThisMonth += monthLogs.length - targetAllowance;
      }
    }
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Summary Cards */}
      <div className="bg-[#0e1119] border border-[#1b2131] rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-950/50 border border-rose-800/40 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Habit Breaker Engine
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Progressively eliminate toxic impulses and addictions using structured monthly allowance tapers, calendar tracking, and breach alerts.
          </p>
        </div>

        {/* Action Button & Quick Stats */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141824] border border-[#232a3e] text-xs font-mono">
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-slate-400">Active:</span>
            <span className="font-bold text-white">{totalBreakers}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition active-press shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Break a Habit</span>
          </button>
        </div>
      </div>

      {/* List of Active Habit Breakers */}
      <div className="space-y-5">
        {breakers.length > 0 ? (
          breakers.map((breaker) => (
            <HabitBreakerCard
              key={breaker.id}
              breaker={breaker}
              selectedDate={selectedDate}
              onLogExecution={onLogExecution}
              onDeleteBreaker={onDeleteBreaker}
            />
          ))
        ) : (
          <div className="text-center py-16 bg-[#0e1119] border border-dashed border-[#1b2131] rounded-2xl p-6">
            <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-200">No Habits Being Eliminated</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-5">
              Add a habit you want to break (e.g. late-night doomscrolling, smoking, fast food, or excessive phone usage) and set your target elimination timeline.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition active-press"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Habit Breaker</span>
            </button>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {isCreateModalOpen && (
        <CreateBreakerModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={onCreateBreaker}
        />
      )}
    </div>
  );
};
