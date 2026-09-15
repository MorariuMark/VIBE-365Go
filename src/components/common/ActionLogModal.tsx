'use client';

import React, { useState } from 'react';
import { ActionLog, ActionType } from '@/types';
import {
  X,
  History,
  Search,
  Download,
  CheckCircle2,
  Dumbbell,
  Target,
  ShieldAlert,
  Trash2,
  Clock,
  Filter,
} from 'lucide-react';

interface ActionLogModalProps {
  logs: ActionLog[];
  onClose: () => void;
}

export const ActionLogModal: React.FC<ActionLogModalProps> = ({ logs, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredLogs = (logs || []).filter((log) => {
    const matchesSearch =
      log.entityTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actionType.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'all') return true;
    if (filterType === 'habit') return log.actionType.startsWith('habit_') || log.actionType.startsWith('subtask_');
    if (filterType === 'workout') return log.actionType.startsWith('workout_');
    if (filterType === 'breaker') return log.actionType.startsWith('breaker_');
    if (filterType === 'objective') return log.actionType.startsWith('objective_');
    if (filterType === 'trash') return log.actionType.startsWith('trash_');
    return true;
  });

  const getActionBadge = (type: ActionType) => {
    if (type.startsWith('habit_') || type.startsWith('subtask_')) {
      return (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
          HABIT
        </span>
      );
    }
    if (type.startsWith('workout_')) {
      return (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/40">
          WORKOUT
        </span>
      );
    }
    if (type.startsWith('breaker_')) {
      return (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/40">
          BREAKER
        </span>
      );
    }
    if (type.startsWith('objective_')) {
      return (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40">
          GOAL
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
        SYSTEM
      </span>
    );
  };

  const handleExportLogs = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vibe-365-audit-ledger-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0c0e17] border border-[#1e2436] w-full max-w-3xl rounded-2xl shadow-2xl my-auto overflow-hidden flex flex-col max-h-[88vh]">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#1b2133] bg-[#0d101a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-center text-blue-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Action Audit Ledger
                </h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#141824] text-slate-300 border border-[#232a3e]">
                  {logs.length} Recorded Actions
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Immutable timestamped history of every habit, workout, and breaker logged
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1c2234] text-slate-200 border border-[#232a3e] text-xs font-semibold transition"
              title="Download audit logs as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#141824] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-[#1b2133] bg-[#090b10] flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search actions or entities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0e1119] border border-[#1b2131] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'All' },
              { id: 'habit', label: 'Habits' },
              { id: 'workout', label: 'Fitness' },
              { id: 'breaker', label: 'Breakers' },
              { id: 'objective', label: 'Goals' },
              { id: 'trash', label: 'Trash' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  filterType === f.id
                    ? 'bg-[#1b2336] text-white border border-[#2f3b59]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Stream */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => {
              const dateObj = new Date(log.timestamp);
              const formattedDate = dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const formattedTime = dateObj.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={log.id}
                  className="bg-[#0e1119] border border-[#1b2131] rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {getActionBadge(log.actionType)}
                      <span className="text-xs font-bold text-white truncate">
                        {log.entityTitle}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {log.details}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-[11px] font-mono text-slate-500 flex-shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#141824]">
                    <span className="text-slate-400 font-semibold">{formattedDate}</span>
                    <span className="text-slate-500">{formattedTime}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 border border-dashed border-[#1b2131] rounded-xl p-6">
              <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">No matching action logs</p>
              <p className="text-xs text-slate-500 mt-1">
                Perform habits, log workouts, or manage breakers to see real-time audit records.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[#1b2131] bg-[#0d101a] flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>API: /api/logs • Serverless Ready</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-md bg-[#141824] hover:bg-[#1b2234] text-slate-300 font-sans text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
