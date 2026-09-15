'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Clock } from 'lucide-react';

interface CylinderTimePickerProps {
  initialHours?: number;
  initialMinutes?: number;
  onChange: (hours: number, minutes: number, floatValue: number) => void;
}

export const CylinderTimePicker: React.FC<CylinderTimePickerProps> = ({
  initialHours = 2,
  initialMinutes = 20,
  onChange,
}) => {
  const [hours, setHours] = useState<number>(Math.max(0, Math.min(23, initialHours)));
  const [minutes, setMinutes] = useState<number>(Math.max(0, Math.min(59, initialMinutes)));

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Emit change whenever hours or minutes update
  useEffect(() => {
    const floatVal = parseFloat((hours + minutes / 60).toFixed(2));
    onChangeRef.current(hours, minutes, floatVal);
  }, [hours, minutes]);

  // Adjust hours with wrapping (0-23)
  const adjustHours = (delta: number) => {
    setHours((prev) => {
      let next = prev + delta;
      if (next < 0) next = 23;
      if (next > 23) next = 0;
      return next;
    });
  };

  // Adjust minutes with wrapping (0-59)
  const adjustMinutes = (delta: number) => {
    setMinutes((prev) => {
      let next = prev + delta;
      if (next < 0) next = 59;
      if (next > 59) next = 0;
      return next;
    });
  };

  // Helper to get array of 5 visible cylinder items centered on current index
  const getVisibleItems = (centerVal: number, max: number) => {
    const offsets = [-2, -1, 0, 1, 2];
    return offsets.map((offset) => {
      let val = centerVal + offset;
      while (val < 0) val += max + 1;
      val = val % (max + 1);
      return { offset, val };
    });
  };

  const visibleHours = getVisibleItems(hours, 23);
  const visibleMinutes = getVisibleItems(minutes, 59);

  // Wheel event handlers for smooth desktop cylinder spin
  const handleHoursWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      adjustHours(1);
    } else if (e.deltaY < 0) {
      adjustHours(-1);
    }
  };

  const handleMinutesWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      adjustMinutes(1);
    } else if (e.deltaY < 0) {
      adjustMinutes(-1);
    }
  };

  const floatEquivalent = (hours + minutes / 60).toFixed(2);

  return (
    <div className="bg-[#090b10] border border-[#1b2131] rounded-2xl p-4 sm:p-5 select-none">
      {/* Time Header Indicator */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1b2131]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
            Cylinder Time Picker
          </span>
        </div>
        <div className="text-right font-mono">
          <span className="text-base font-bold text-white">
            {hours}h {minutes}m
          </span>
          <span className="text-xs text-slate-400 ml-1.5 font-normal">
            ({floatEquivalent} hrs)
          </span>
        </div>
      </div>

      {/* 3D Combination Lock Cylinder Drums */}
      <div className="relative py-2 flex items-center justify-center gap-4 sm:gap-8 overflow-hidden">
        {/* Centered Selection Lens */}
        <div className="pointer-events-none absolute inset-x-2 sm:inset-x-6 top-1/2 -translate-y-1/2 h-11 bg-white/[0.04] border-y border-rose-500/40 rounded-lg shadow-[inset_0_0_12px_rgba(244,63,94,0.1)] z-10" />

        {/* Gradient Shadow Fades (Top & Bottom cylinder curvature) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#090b10] via-[#090b10]/80 to-transparent z-20" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#090b10] via-[#090b10]/80 to-transparent z-20" />

        {/* COLUMN 1: HOURS CYLINDER */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => adjustHours(-1)}
            className="p-1 text-slate-500 hover:text-white transition z-30 mb-1"
            title="Scroll hours up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          <div
            onWheel={handleHoursWheel}
            className="w-24 sm:w-28 h-44 flex flex-col items-center justify-center cursor-ns-resize touch-none relative"
            title="Scroll or swipe to change hours"
          >
            {visibleHours.map(({ offset, val }) => {
              const isCenter = offset === 0;
              const absOffset = Math.abs(offset);

              // 3D Cylinder rotation & perspective math
              const rotateX = offset * 26;
              const scale = isCenter ? 1.05 : 1 - absOffset * 0.12;
              const opacity = isCenter ? 1 : absOffset === 1 ? 0.45 : 0.18;

              return (
                <div
                  key={`h-${offset}`}
                  onClick={() => offset !== 0 && adjustHours(offset)}
                  style={{
                    transform: `perspective(200px) rotateX(${rotateX}deg) scale(${scale})`,
                    opacity,
                  }}
                  className={`h-9 flex items-center justify-center gap-1 font-mono transition-all duration-100 ${
                    isCenter
                      ? 'text-white text-xl sm:text-2xl font-black text-rose-300'
                      : 'text-slate-400 text-sm sm:text-base font-semibold'
                  }`}
                >
                  <span>{String(val).padStart(2, '0')}</span>
                  <span className="text-[11px] font-sans font-medium text-slate-400">hr</span>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => adjustHours(1)}
            className="p-1 text-slate-500 hover:text-white transition z-30 mt-1"
            title="Scroll hours down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* CYLINDER DIVIDER */}
        <div className="text-xl font-mono text-slate-600 font-bold z-10">:</div>

        {/* COLUMN 2: MINUTES CYLINDER */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => adjustMinutes(-5)}
            className="p-1 text-slate-500 hover:text-white transition z-30 mb-1"
            title="Scroll minutes up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          <div
            onWheel={handleMinutesWheel}
            className="w-24 sm:w-28 h-44 flex flex-col items-center justify-center cursor-ns-resize touch-none relative"
            title="Scroll or swipe to change minutes"
          >
            {visibleMinutes.map(({ offset, val }) => {
              const isCenter = offset === 0;
              const absOffset = Math.abs(offset);

              const rotateX = offset * 26;
              const scale = isCenter ? 1.05 : 1 - absOffset * 0.12;
              const opacity = isCenter ? 1 : absOffset === 1 ? 0.45 : 0.18;

              return (
                <div
                  key={`m-${offset}`}
                  onClick={() => offset !== 0 && adjustMinutes(offset)}
                  style={{
                    transform: `perspective(200px) rotateX(${rotateX}deg) scale(${scale})`,
                    opacity,
                  }}
                  className={`h-9 flex items-center justify-center gap-1 font-mono transition-all duration-100 ${
                    isCenter
                      ? 'text-white text-xl sm:text-2xl font-black text-rose-300'
                      : 'text-slate-400 text-sm sm:text-base font-semibold'
                  }`}
                >
                  <span>{String(val).padStart(2, '0')}</span>
                  <span className="text-[11px] font-sans font-medium text-slate-400">min</span>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => adjustMinutes(5)}
            className="p-1 text-slate-500 hover:text-white transition z-30 mt-1"
            title="Scroll minutes down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div className="mt-3 pt-3 border-t border-[#1b2131] flex flex-wrap items-center justify-center gap-1.5">
        <span className="text-[10px] font-mono text-slate-500 mr-1">Presets:</span>
        {[
          { label: '30m', h: 0, m: 30 },
          { label: '1h', h: 1, m: 0 },
          { label: '1h 30m', h: 1, m: 30 },
          { label: '2h', h: 2, m: 0 },
          { label: '2h 20m', h: 2, m: 20 },
          { label: '3h', h: 3, m: 0 },
          { label: '4h', h: 4, m: 0 },
        ].map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              setHours(preset.h);
              setMinutes(preset.m);
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
              hours === preset.h && minutes === preset.m
                ? 'bg-rose-950 text-rose-300 border border-rose-700/60'
                : 'bg-[#141824] text-slate-400 hover:text-white border border-[#232a3e]'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};
