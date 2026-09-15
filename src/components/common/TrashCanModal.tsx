'use client';

import React, { useState } from 'react';
import { TrashItem, TrashItemType } from '@/types';
import {
  X,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Dumbbell,
  Target,
  ShieldAlert,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TrashCanModalProps {
  trash: TrashItem[];
  onClose: () => void;
  onRestore: (trashId: string) => void;
  onPurge: (trashId: string) => void;
  onEmptyAll: () => void;
}

export const TrashCanModal: React.FC<TrashCanModalProps> = ({
  trash,
  onClose,
  onRestore,
  onPurge,
  onEmptyAll,
}) => {
  const [filterType, setFilterType] = useState<'all' | TrashItemType>('all');

  const filteredItems = trash.filter((item) => {
    if (filterType === 'all') return true;
    return item.itemType === filterType;
  });

  const getDaysRemaining = (expiresAt: string) => {
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  const handleRestore = (item: TrashItem) => {
    onRestore(item.id);
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6'],
      });
    } catch {
      // Fallback
    }
  };

  const getEntityIcon = (type: TrashItemType) => {
    switch (type) {
      case 'habit':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'workout':
        return <Dumbbell className="w-4 h-4 text-blue-400" />;
      case 'objective':
        return <Target className="w-4 h-4 text-amber-400" />;
      case 'habitBreaker':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      default:
        return <Trash2 className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0c0e17] border border-[#1e2436] w-full max-w-2xl rounded-2xl shadow-2xl my-auto overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1b2133] bg-[#0d101a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-950/40 border border-rose-800/40 flex items-center justify-center text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Trash Can
                </h3>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[#141824] text-slate-300 border border-[#232a3e]">
                  {trash.length} {trash.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Deleted items are safely retained for 30 days before permanent purge
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

        {/* Filter Pills & Actions Bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-[#1b2133] bg-[#090b10] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {(['all', 'habit', 'workout', 'objective', 'habitBreaker'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                  filterType === type
                    ? 'bg-[#1b2336] text-white border border-[#2f3b59]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type === 'all' ? 'All Items' : type === 'habitBreaker' ? 'Breakers' : `${type}s`}
              </button>
            ))}
          </div>

          {trash.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Permanently delete all items in Trash? This cannot be undone.')) {
                  onEmptyAll();
                }
              }}
              className="text-xs font-mono text-rose-400 hover:text-rose-300 hover:underline px-2 py-1"
            >
              Empty Trash
            </button>
          )}
        </div>

        {/* List of Trash Items */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const daysLeft = getDaysRemaining(item.expiresAt);
              return (
                <div
                  key={item.id}
                  className="bg-[#0e1119] border border-[#1b2131] hover:border-[#2b334c] rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-[#141824] border border-[#232a3e] flex-shrink-0 mt-0.5">
                      {getEntityIcon(item.itemType)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white truncate">
                          {item.title}
                        </h4>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#141824] text-slate-400 border border-[#232a3e]">
                          {item.itemType}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {item.subtitle}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono">
                        <span className="text-slate-500">
                          Deleted {new Date(item.deletedAt).toLocaleDateString()}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span
                          className={`flex items-center gap-1 font-semibold ${
                            daysLeft <= 3
                              ? 'text-rose-400'
                              : daysLeft <= 10
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{daysLeft} days remaining</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRestore(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition active-press"
                      title="Restore to active collection"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Permanently purge "${item.title}"?`)) {
                          onPurge(item.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Permanently delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 border border-dashed border-[#1b2131] rounded-xl p-6">
              <Trash2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">
                {trash.length === 0 ? 'Trash Can is Empty' : 'No deleted items in this category'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                When you delete a habit, workout, goal, or breaker, it is held here for 30 days so you can restore it anytime.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[#1b2131] bg-[#0d101a] flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>Auto-purges after 30 days</span>
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
