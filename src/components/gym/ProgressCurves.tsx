'use client';

import React, { useState, useMemo } from 'react';
import { WorkoutDayLog, MuscleGroup } from '@/types';
import { calculateProgressCurve } from '@/lib/storage';
import {
  TrendingUp,
  Award,
  Zap,
  Activity,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface ProgressCurvesProps {
  workoutLogs: Record<string, WorkoutDayLog>;
  muscleGroups: MuscleGroup[];
}

type MetricType = 'weight' | 'estimated1RM' | 'totalVolume';

export const ProgressCurves: React.FC<ProgressCurvesProps> = ({
  workoutLogs,
  muscleGroups,
}) => {
  const loggedExerciseOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; groupName: string }>();

    Object.values(workoutLogs).forEach((log) => {
      log.exercises.forEach((ex) => {
        if (!map.has(ex.exerciseId)) {
          map.set(ex.exerciseId, {
            id: ex.exerciseId,
            name: ex.exerciseName,
            groupName: ex.muscleGroupName || 'Exercise',
          });
        }
      });
    });

    muscleGroups.forEach((group) => {
      group.exercises.forEach((ex) => {
        if (!map.has(ex.id)) {
          map.set(ex.id, {
            id: ex.id,
            name: ex.name,
            groupName: group.name,
          });
        }
      });
    });

    return Array.from(map.values());
  }, [workoutLogs, muscleGroups]);

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    loggedExerciseOptions[0]?.id || 'chest_press'
  );
  const [metric, setMetric] = useState<MetricType>('weight');

  const { dataPoints, insight } = useMemo(() => {
    return calculateProgressCurve(selectedExerciseId, workoutLogs);
  }, [selectedExerciseId, workoutLogs]);

  const selectedExercise = loggedExerciseOptions.find((e) => e.id === selectedExerciseId);

  const getMetricLabel = (m: MetricType) => {
    if (m === 'weight') return 'Top Working Weight (kg)';
    if (m === 'estimated1RM') return 'Estimated 1RM (kg)';
    return 'Total Volume (kg)';
  };

  const getMetricColor = (m: MetricType) => {
    if (m === 'weight') return '#3b82f6'; // blue
    if (m === 'estimated1RM') return '#10b981'; // emerald
    return '#f59e0b'; // amber
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header & Exercise Selector */}
      <div className="bg-surface-1 border border-surface-border rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <h3 className="text-base font-semibold text-white tracking-tight">
              Strength & Progressive Overload Curves
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Load trajectory, estimated 1RM, and session volume trends
          </p>
        </div>

        {/* Exercise picker */}
        <div className="w-full md:w-auto">
          <select
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            className="w-full md:w-64 px-3 py-2 rounded-xl bg-surface-2 border border-surface-border text-xs font-semibold text-white focus:border-blue-500 cursor-pointer"
          >
            {loggedExerciseOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name} ({opt.groupName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metric Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {(['weight', 'estimated1RM', 'totalVolume'] as MetricType[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetric(m)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border whitespace-nowrap ${
              metric === m
                ? 'bg-surface-3 text-white border-surface-borderHover'
                : 'bg-surface-1 text-slate-400 border border-surface-border hover:text-white'
            }`}
          >
            {getMetricLabel(m)}
          </button>
        ))}
      </div>

      {/* Metric Summary Cards */}
      {insight && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-surface-1 border border-surface-border rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>30-Day Delta</span>
              <Activity className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="mt-2">
              <div
                className={`text-xl sm:text-2xl font-bold tabular-nums ${
                  insight.percentWeightIncreaseMonth >= 0
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {insight.percentWeightIncreaseMonth >= 0
                  ? `+${insight.percentWeightIncreaseMonth}%`
                  : `${insight.percentWeightIncreaseMonth}%`}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{insight.summaryText}</p>
            </div>
          </div>

          <div className="bg-surface-1 border border-surface-border rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>All-Time PR</span>
              <Award className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-white tabular-nums">
                {insight.bestWeightKg} <span className="text-xs font-normal text-slate-400">kg</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Peak working weight</p>
            </div>
          </div>

          <div className="bg-surface-1 border border-surface-border rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Estimated 1RM</span>
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-emerald-400 tabular-nums">
                {insight.current1RM} <span className="text-xs font-normal text-slate-400">kg</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Baseline: {insight.baseline1RM} kg</p>
            </div>
          </div>

          <div className="bg-surface-1 border border-surface-border rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Logged Sessions</span>
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-bold text-white tabular-nums">
                {insight.totalSessionsLogged}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Volume delta: {insight.percentVolumeIncreaseMonth >= 0 ? '+' : ''}{insight.percentVolumeIncreaseMonth}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Chart */}
      <div className="bg-surface-1 border border-surface-border rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-semibold text-white flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getMetricColor(metric) }}
            />
            {selectedExercise?.name || 'Exercise'} – {getMetricLabel(metric)}
          </h4>
          <span className="text-[11px] text-slate-400 tabular-nums">
            {dataPoints.length} sessions
          </span>
        </div>

        {dataPoints.length > 0 ? (
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getMetricColor(metric)} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={getMetricColor(metric)} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2333" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(val) => {
                    const parts = val.split('-');
                    return `${parts[1]}/${parts[2]}`;
                  }}
                />
                <YAxis stroke="#64748b" fontSize={10} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as (typeof dataPoints)[0];
                      return (
                        <div className="bg-surface-1/95 border border-surface-border p-3 rounded-xl shadow-xl text-xs space-y-1 backdrop-blur-md">
                          <p className="font-semibold text-white">{data.date}</p>
                          <p className="text-slate-400">{data.workoutTitle}</p>
                          <div className="text-blue-400 font-semibold pt-1 tabular-nums">
                            Set: {data.weight} kg × {data.reps} reps
                          </div>
                          {data.dropSetSummary && (
                            <div className="text-amber-400 text-[11px] tabular-nums">
                              Drop: {data.dropSetSummary}
                            </div>
                          )}
                          <div className="text-emerald-400 font-medium tabular-nums">
                            Est. 1RM: {data.estimated1RM} kg
                          </div>
                          <div className="text-slate-400 text-[11px] tabular-nums">
                            Volume: {data.totalVolume} kg
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke={getMetricColor(metric)}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#metricGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 text-xs">
            No training logs for {selectedExercise?.name || 'this exercise'} yet.
          </div>
        )}
      </div>

      {/* Historical Sessions Breakdown Table */}
      {dataPoints.length > 0 && (
        <div className="bg-surface-1 border border-surface-border rounded-2xl p-4 sm:p-5">
          <h4 className="text-xs font-semibold text-white mb-3">Session Log History</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <thead>
                <tr className="border-b border-surface-border text-slate-400 font-medium text-[11px]">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Top Set</th>
                  <th className="pb-2">Drop Set</th>
                  <th className="pb-2">Est. 1RM</th>
                  <th className="pb-2">Volume</th>
                  <th className="pb-2">Session</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {dataPoints
                  .slice()
                  .reverse()
                  .map((pt) => (
                    <tr key={pt.date} className="hover:bg-surface-2/50 transition">
                      <td className="py-2.5 text-slate-300 font-medium">{pt.date}</td>
                      <td className="py-2.5 font-semibold text-white">
                        {pt.weight} kg × {pt.reps}
                      </td>
                      <td className="py-2.5 text-amber-400 font-medium">
                        {pt.dropSetSummary || '—'}
                      </td>
                      <td className="py-2.5 text-emerald-400">{pt.estimated1RM} kg</td>
                      <td className="py-2.5 text-slate-300">{pt.totalVolume} kg</td>
                      <td className="py-2.5 text-slate-400">{pt.workoutTitle}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
