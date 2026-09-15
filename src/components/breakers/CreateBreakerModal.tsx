'use client';

import React, { useState, useMemo } from 'react';
import {
  HabitBreaker,
  BreakerTrackingType,
  BreakerAggressiveness,
  MonthlyAllowancePlan,
} from '@/types';
import { X, ShieldAlert, Sparkles, Sliders, Calendar, ArrowRight } from 'lucide-react';
import { getTodayISO } from '@/lib/utils';

interface CreateBreakerModalProps {
  onClose: () => void;
  onCreate: (
    newBreaker: Omit<HabitBreaker, 'id' | 'createdAt' | 'logs'>
  ) => void;
}

export const CreateBreakerModal: React.FC<CreateBreakerModalProps> = ({
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('mindset');
  const [color, setColor] = useState('#f43f5e'); // Rose accent by default
  const [trackingType, setTrackingType] = useState<BreakerTrackingType>('frequency');
  const [metricUnit, setMetricUnit] = useState('hours');
  const [startingAllowance, setStartingAllowance] = useState<number>(21);
  const [durationMonths, setDurationMonths] = useState<number>(3);
  const [aggressiveness, setAggressiveness] = useState<BreakerAggressiveness>('linear');
  const [customPlan, setCustomPlan] = useState<number[]>([21, 14, 7, 0]);

  // Generate progressive monthly plan based on aggressiveness and duration
  const generatedPlan: MonthlyAllowancePlan[] = useMemo(() => {
    if (aggressiveness === 'custom') {
      return Array.from({ length: durationMonths }, (_, i) => ({
        monthIndex: i + 1,
        targetAllowance: customPlan[i] !== undefined ? customPlan[i] : Math.max(0, startingAllowance - (i + 1) * 5),
      }));
    }

    const plan: MonthlyAllowancePlan[] = [];
    const totalSteps = durationMonths;

    for (let m = 1; m <= totalSteps; m++) {
      let allowance = 0;
      const progressRatio = m / totalSteps;

      if (aggressiveness === 'linear') {
        allowance = Math.round(startingAllowance * (1 - progressRatio));
      } else if (aggressiveness === 'gentle') {
        // Concave curve: slower initial drop
        allowance = Math.round(startingAllowance * (1 - Math.pow(progressRatio, 1.6)));
      } else if (aggressiveness === 'aggressive') {
        // Convex curve: steep initial drop
        allowance = Math.round(startingAllowance * Math.pow(1 - progressRatio, 1.8));
      }

      if (trackingType === 'metric') {
        allowance = parseFloat(Math.max(0, allowance).toFixed(1));
      } else {
        allowance = Math.max(0, Math.round(allowance));
      }

      plan.push({
        monthIndex: m,
        targetAllowance: allowance,
      });
    }

    return plan;
  }, [aggressiveness, customPlan, durationMonths, startingAllowance, trackingType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      color,
      startDate: getTodayISO(),
      durationMonths,
      aggressiveness,
      trackingType,
      metricUnit: trackingType === 'metric' ? metricUnit.trim() : undefined,
      startingAllowance,
      monthlyPlan: generatedPlan,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0c0e17] border border-[#1e2436] w-full max-w-xl rounded-2xl shadow-2xl my-auto overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1b2133] bg-[#0d101a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-950/40 border border-rose-800/40 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Add Habit to Break
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure progressive elimination curve and monthly quotas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#141824] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                Habit to Eliminate *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Late-Night Doomscrolling, Vaping, Junk Food, Binge Gaming..."
                className="w-full px-3 py-2 rounded-lg bg-[#0e1119] border border-[#1b2131] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                Why eliminate this? (Motivation)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Better sleep quality, mental clarity, stop dopamine spikes..."
                className="w-full px-3 py-2 rounded-lg bg-[#0e1119] border border-[#1b2131] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Tracking Mode */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">
              Elimination Tracking Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setTrackingType('frequency');
                  setStartingAllowance(21);
                }}
                className={`p-3 rounded-xl border text-left transition ${
                  trackingType === 'frequency'
                    ? 'bg-[#1b2336] border-rose-500 text-white shadow-sm'
                    : 'bg-[#0e1119] border-[#1b2131] text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-white mb-1">Days Allowance</div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Limit allowed days per month (e.g. 21/30 days, then 15/30, 7/30, 0).
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTrackingType('metric');
                  setStartingAllowance(4.0);
                  setMetricUnit('hours');
                }}
                className={`p-3 rounded-xl border text-left transition ${
                  trackingType === 'metric'
                    ? 'bg-[#1b2336] border-rose-500 text-white shadow-sm'
                    : 'bg-[#0e1119] border-[#1b2131] text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-white mb-1">Daily Metric Ceiling</div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Gradually lower quantitative limits (e.g. daily screen time in hours).
                </p>
              </button>
            </div>
          </div>

          {/* Metric Details (if metric mode) */}
          {trackingType === 'metric' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                  Metric Unit
                </label>
                <input
                  type="text"
                  value={metricUnit}
                  onChange={(e) => setMetricUnit(e.target.value)}
                  placeholder="e.g. hours, min, cigs, $"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#0e1119] border border-[#1b2131] text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                  Initial Daily Ceiling ({metricUnit})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  value={startingAllowance}
                  onChange={(e) => setStartingAllowance(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#0e1119] border border-[#1b2131] text-xs font-mono font-bold text-white"
                />
              </div>
            </div>
          )}

          {/* Starting Allowance for Frequency Mode */}
          {trackingType === 'frequency' && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                Month 1 Allowed Days (out of ~30 days)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={startingAllowance}
                onChange={(e) => setStartingAllowance(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#0e1119] border border-[#1b2131] text-xs font-mono font-bold text-white"
              />
            </div>
          )}

          {/* Timeline & Aggressiveness */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                Elimination Timeline
              </label>
              <select
                value={durationMonths}
                onChange={(e) => setDurationMonths(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-lg bg-[#0e1119] border border-[#1b2131] text-xs text-white"
              >
                <option value={1}>1 Month (Immediate elimination)</option>
                <option value={2}>2 Months</option>
                <option value={3}>3 Months (Recommended)</option>
                <option value={4}>4 Months</option>
                <option value={6}>6 Months (Gradual long-term)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1">
                Taper Curve
              </label>
              <select
                value={aggressiveness}
                onChange={(e) => setAggressiveness(e.target.value as BreakerAggressiveness)}
                className="w-full px-3 py-2 rounded-lg bg-[#0e1119] border border-[#1b2131] text-xs text-white capitalize"
              >
                <option value="linear">Linear (Steady equal drop)</option>
                <option value="gentle">Gentle (Slow taper)</option>
                <option value="aggressive">Aggressive (Fast drop)</option>
              </select>
            </div>
          </div>

          {/* Progressive Quota Schedule Preview */}
          <div className="bg-[#090b10] border border-[#1b2131] rounded-xl p-3.5 space-y-2">
            <span className="text-[11px] font-mono text-slate-400 block uppercase">
              Progressive Elimination Schedule Preview
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {generatedPlan.map((p) => (
                <div
                  key={p.monthIndex}
                  className="bg-[#0e1119] border border-[#1b2131] p-2 rounded-lg text-center font-mono text-xs"
                >
                  <span className="text-[10px] text-slate-500">M{p.monthIndex}</span>
                  <div className="font-bold text-white text-sm">
                    {p.targetAllowance} {trackingType === 'frequency' ? 'd' : metricUnit}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#1b2131]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#141824] text-xs text-slate-300 hover:bg-[#1b2234] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition active-press"
            >
              Start Habit Elimination
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
