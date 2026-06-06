import React from "react";
import { RiLineChartLine } from "@remixicon/react";

export const MemoryUsage = ({ data }: { data: number[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-pulse space-y-4 pt-10">
        <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-emerald-400 animate-spin"></div>
        <span className="font-mono text-sm tracking-wider">Awaiting Memory Data...</span>
      </div>
    );
  }

  const currentUsage = data[data.length - 1];
  const maxUsage = Math.max(...data, currentUsage * 1.5) || 1; // avoid division by zero

  return (
    <div className="p-6 h-full flex flex-col font-mono bg-black/20 rounded-xl border border-white/5 shadow-inner">
      <div className="flex items-center gap-2 mb-6 text-emerald-400 drop-shadow-[0_0_2px_rgba(52,211,153,0.4)]">
        <RiLineChartLine className="w-5 h-5" />
        <span className="text-lg font-bold tracking-wider uppercase">Memory Usage</span>
      </div>

      <div className="flex items-end gap-4 mb-8">
        <span className="text-4xl font-bold text-white tracking-tight">
          {currentUsage.toFixed(2)}
        </span>
        <span className="text-muted-foreground font-semibold mb-1 uppercase tracking-widest text-sm">
          KB
        </span>
      </div>

      {/* Simple line/bar chart visualization */}
      <div className="flex-1 min-h-[150px] relative border-b border-l border-white/10 pt-4 pb-0 pl-0">
        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`M 0 100 ` + data.map((v, i) => `L ${(i / Math.max(1, data.length - 1)) * 100} ${100 - (v / maxUsage) * 100}`).join(" ") + ` L 100 100 Z`}
            fill="url(#usageGradient)"
          />
          <polyline
            points={data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * 100},${100 - (v / maxUsage) * 100}`).join(" ")}
            fill="none"
            stroke="#34d399"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="flex justify-between mt-2 text-xs text-muted-foreground/50">
        <span>Oldest</span>
        <span>Current</span>
      </div>
    </div>
  );
};
