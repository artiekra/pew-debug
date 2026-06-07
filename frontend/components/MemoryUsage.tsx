import React from "react";

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
  
  // Assume 60 updates per second based on requestAnimationFrame
  const getAverage = (count: number) => {
    if (data.length === 0) return 0;
    const slice = data.slice(-count);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  };

  const avg1s = getAverage(60);
  const avg10s = getAverage(600);
  const avgAll = getAverage(data.length);
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);

  const getPercent = (val: number) => ((val / 500) * 100);
  const formatVal = (val: number) => val.toFixed(2);
  const formatPercent = (val: number) => getPercent(val).toFixed(2);

  const currentPercent = Math.max(0, Math.min(getPercent(currentUsage), 100));

  return (
    <div className="p-6 h-full flex flex-col font-mono bg-black/20 rounded-xl border border-white/5 shadow-inner gap-6">
      {/* Progress Bar */}
      <div className="relative w-full h-12 bg-white/5 rounded-md overflow-hidden border border-white/10 shrink-0">
        <div 
          className="absolute top-0 left-0 h-full bg-emerald-500/80 transition-all duration-100 ease-out"
          style={{ width: `${currentPercent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-white font-bold drop-shadow-md text-lg tracking-wider">
          {currentUsage.toFixed(0)} KB
        </div>
      </div>

      {/* Stats Rows */}
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between items-center p-2">
          <span className="text-muted-foreground font-semibold">Current Usage</span>
          <div className="flex gap-4 items-center">
            <span className="text-emerald-600 font-bold text-base">{formatVal(currentUsage)} KB</span>
            <span className="text-emerald-600 font-bold w-16 text-right">{formatPercent(currentUsage)}%</span>
          </div>
        </div>

        <div className="flex justify-between items-center p-2">
          <span className="text-muted-foreground font-semibold">Average (1s)</span>
          <div className="flex gap-4 items-center">
            <span className="text-blue-600 font-bold text-base">{formatVal(avg1s)} KB</span>
            <span className="text-blue-600 font-bold w-16 text-right">{formatPercent(avg1s)}%</span>
          </div>
        </div>

        <div className="flex justify-between items-center p-2">
          <span className="text-muted-foreground font-semibold">Average (10s)</span>
          <div className="flex gap-4 items-center">
            <span className="text-purple-600 font-bold text-base">{formatVal(avg10s)} KB</span>
            <span className="text-purple-600 font-bold w-16 text-right">{formatPercent(avg10s)}%</span>
          </div>
        </div>

        <div className="flex justify-between items-center p-2">
          <span className="text-muted-foreground font-semibold">Average (All)</span>
          <div className="flex gap-4 items-center">
            <span className="text-red-600 font-bold text-base">{formatVal(avgAll)} KB</span>
            <span className="text-red-600 font-bold w-16 text-right">{formatPercent(avgAll)}%</span>
          </div>
        </div>

        <div className="flex justify-between items-center p-2">
          <span className="text-muted-foreground font-semibold">Minimum</span>
          <div className="flex gap-4 items-center">
            <span className="text-cyan-600 font-bold text-base">{formatVal(minVal)} KB</span>
            <span className="text-cyan-600 font-bold w-16 text-right">{formatPercent(minVal)}%</span>
          </div>
        </div>

        <div className="flex justify-between items-center p-2">
          <span className="text-muted-foreground font-semibold">Maximum</span>
          <div className="flex gap-4 items-center">
            <span className="text-orange-600 font-bold text-base">{formatVal(maxVal)} KB</span>
            <span className="text-orange-600 font-bold w-16 text-right">{formatPercent(maxVal)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
