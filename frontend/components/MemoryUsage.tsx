import React from "react"

export const MemoryUsage = ({ data }: { data: number[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full animate-pulse flex-col items-center justify-center space-y-4 pt-10 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-r-2 border-emerald-400"></div>
        <span className="font-mono text-sm tracking-wider">
          Awaiting Memory Data...
        </span>
      </div>
    )
  }

  const currentUsage = data[data.length - 1]

  const getAverage = (count: number) => {
    if (data.length === 0) return 0
    const slice = data.slice(-count)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  }

  const avg1s = getAverage(2)
  const avg10s = getAverage(20)
  const avgAll = getAverage(data.length)
  const minVal = Math.min(...data)
  const maxVal = Math.max(...data)

  const getPercent = (val: number) => (val / 500) * 100
  const formatVal = (val: number) => val.toFixed(2)
  const formatPercent = (val: number) => getPercent(val).toFixed(2)

  // Chart calculation
  const chartData = data
  const chartMax = Math.max(...chartData, 10) * 1.1
  const range = chartMax

  const points = chartData
    .map((val, i) => {
      const x = chartData.length > 1 ? (i / (chartData.length - 1)) * 100 : 100
      const y = 100 - (val / range) * 100
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")

  return (
    <div className="flex h-full flex-col gap-6 rounded-xl border border-white/5 bg-black/20 p-6 font-mono shadow-inner">
      {/* Memory Chart */}
      <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-md border border-white/10 bg-white/5">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full opacity-80"
        >
          {chartData.length > 1 && (
            <>
              <polygon
                points={`${points} 100,100 0,100`}
                fill="rgb(16 185 129)"
                className="opacity-20"
              />
              <polyline
                points={points}
                fill="none"
                stroke="rgb(16 185 129)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-black/40 px-3 py-1 text-lg font-bold tracking-wider text-white drop-shadow-md backdrop-blur-sm">
            {currentUsage.toFixed(0)} KB
          </span>
        </div>
      </div>

      {/* Stats Rows */}
      <div className="flex flex-col text-sm">
        <div className="flex items-center justify-between p-2">
          <span className="font-semibold text-muted-foreground">
            Current Usage
          </span>
          <div className="flex items-center gap-4">
            <span className="text-base font-bold text-emerald-600">
              {formatVal(currentUsage)} KB
            </span>
            <span className="w-16 text-right font-bold text-emerald-600">
              {formatPercent(currentUsage)}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between p-2">
          <span className="font-semibold text-muted-foreground">
            Average (1s)
          </span>
          <div className="flex items-center gap-4">
            <span className="text-base font-bold text-blue-600">
              {formatVal(avg1s)} KB
            </span>
            <span className="w-16 text-right font-bold text-blue-600">
              {formatPercent(avg1s)}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between p-2">
          <span className="font-semibold text-muted-foreground">
            Average (10s)
          </span>
          <div className="flex items-center gap-4">
            <span className="text-base font-bold text-purple-600">
              {formatVal(avg10s)} KB
            </span>
            <span className="w-16 text-right font-bold text-purple-600">
              {formatPercent(avg10s)}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between p-2">
          <span className="font-semibold text-muted-foreground">
            Average (All)
          </span>
          <div className="flex items-center gap-4">
            <span className="text-base font-bold text-red-600">
              {formatVal(avgAll)} KB
            </span>
            <span className="w-16 text-right font-bold text-red-600">
              {formatPercent(avgAll)}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between p-2">
          <span className="font-semibold text-muted-foreground">Minimum</span>
          <div className="flex items-center gap-4">
            <span className="text-base font-bold text-cyan-600">
              {formatVal(minVal)} KB
            </span>
            <span className="w-16 text-right font-bold text-cyan-600">
              {formatPercent(minVal)}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between p-2">
          <span className="font-semibold text-muted-foreground">Maximum</span>
          <div className="flex items-center gap-4">
            <span className="text-base font-bold text-orange-600">
              {formatVal(maxVal)} KB
            </span>
            <span className="w-16 text-right font-bold text-orange-600">
              {formatPercent(maxVal)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
