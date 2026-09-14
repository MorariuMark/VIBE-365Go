'use client';

import React, { useState, useMemo } from 'react';
import { WorkoutDayLog, MuscleGroup } from '@/types';
import { calculateProgressCurve } from '@/lib/storage';
import {
  TrendingUp,
  Award,
  Zap,
  Activity,
  Flame,
  Calendar,
  Layers,
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
  // Collect all unique logged exercises
  const loggedExerciseOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; groupName: string }>();

    // From workout logs
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

    // Also include muscle group sticky library definitions
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

  // Compute curve and insights
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
    if (m === 'weight') return '#06b6d4'; // cyan
    if (m === 'estimated1RM') return '#10b981'; // emerald
    return '#f59e0b'; // amber
  };

  return (
    <div className="space-y-6">
      {/* Header & Exercise Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white tracking-wide">
              Strength & Progress Curves
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Progressive overload trajectory, drop set volume & automated strength insights
          </p>
        </div>

        {/* Exercise picker */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            className="w-full md:w-72 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
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
      <div className="flex items-center gap-2">
        {(['weight', 'estimated1RM', 'totalVolume'] as MetricType[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetric(m)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
              metric === m
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-sm'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {getMetricLabel(m)}
          </button>
        ))}
      </div>

      {/* Insights Engine Summary Cards */}
      {insight && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: 30-Day Progress Delta */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Past 30 Days Delta</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2">
              <div
                className={`text-2xl font-black ${
                  insight.percentWeightIncreaseMonth >= 0
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {insight.percentWeightIncreaseMonth >= 0
                  ? `+${insight.percentWeightIncreaseMonth}%`
                  : `${insight.percentWeightIncreaseMonth}%`}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{insight.summaryText}</p>
            </div>
          </div>

          {/* Card 2: Peak Working Weight */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">All-Time PR Weight</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white">
                {insight.bestWeightKg} <span className="text-sm font-normal text-slate-400">kg</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Highest weight moved across all recorded sessions
              </p>
            </div>
          </div>

          {/* Card 3: Estimated 1RM */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Current Est. 1RM</span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-emerald-400">
                {insight.current1RM} <span className="text-sm font-normal text-slate-400">kg</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Baseline: {insight.baseline1RM} kg (Brzycki Formula)
              </p>
            </div>
          </div>

          {/* Card 4: Total Sessions */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Logged Sessions</span>
              <Calendar className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white">
                {insight.totalSessionsLogged}{' '}
                <span className="text-sm font-normal text-slate-400">workouts</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Volume increase: {insight.percentVolumeIncreaseMonth >= 0 ? '+' : ''}
                {insight.percentVolumeIncreaseMonth}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Recharts Graph */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: getMetricColor(metric) }}
            />
            {selectedExercise?.name || 'Exercise'} – {getMetricLabel(metric)}
          </h4>
          <span className="text-xs text-slate-400">
            {dataPoints.length} data points
          </span>
        </div>

        {dataPoints.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataPoints} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getMetricColor(metric)} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={getMetricColor(metric)} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => {
                    const parts = val.split('-');
                    return `${parts[1]}/${parts[2]}`;
                  }}
                />
                <YAxis stroke="#64748b" fontSize={11} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as (typeof dataPoints)[0];
                      return (
                        <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1 backdrop-blur-md">
                          <p className="font-bold text-white">{data.date}</p>
                          <p className="text-slate-400">{data.workoutTitle}</p>
                          <div className="text-cyan-400 font-semibold pt-1">
                            Working Set: {data.weight} kg × {data.reps} reps
                          </div>
                          {data.dropSetSummary && (
                            <div className="text-amber-400 text-[11px]">
                              Drop Set: {data.dropSetSummary}
                            </div>
                          )}
                          <div className="text-emerald-400 font-semibold">
                            Est. 1RM: {data.estimated1RM} kg
                          </div>
                          <div className="text-slate-400 text-[11px]">
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
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#metricGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-16">
            <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">
              No workout logs found for {selectedExercise?.name || 'this exercise'} yet.
            </p>
            <p className="text-slate-500 text-xs mt-1">
              Select a calendar day to log your sets with weight and drop sets.
            </p>
          </div>
        )}
      </div>

      {/* Historical Sessions Breakdown Table */}
      {dataPoints.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h4 className="text-sm font-bold text-white mb-3">Logged Sessions History</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Top Set</th>
                  <th className="pb-2">Drop Set</th>
                  <th className="pb-2">Est. 1RM</th>
                  <th className="pb-2">Session Volume</th>
                  <th className="pb-2">Session Title</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {dataPoints
                  .slice()
                  .reverse()
                  .map((pt) => (
                    <tr key={pt.date} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 font-medium text-slate-300">{pt.date}</td>
                      <td className="py-2.5 font-bold text-white">
                        {pt.weight} kg × {pt.reps}
                      </td>
                      <td className="py-2.5 text-amber-400 font-medium">
                        {pt.dropSetSummary || '—'}
                      </td>
                      <td className="py-2.5 text-emerald-400 font-semibold">{pt.estimated1RM} kg</td>
                      <td className="py-2.5 text-slate-300 font-medium">{pt.totalVolume} kg</td>
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
