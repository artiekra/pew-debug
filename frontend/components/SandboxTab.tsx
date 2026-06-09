import React from "react"
import { Button } from "@/components/ui/button"
import {
  RiArrowLeftLine,
  RiTerminalLine,
  RiGamepadLine,
  RiLineChartLine,
} from "@remixicon/react"

interface SandboxTabProps {
  gameUrl: string
  memoryUsage: number[]
  tickData: { tick: number; enemies: number } | null
  showDebugInfo: boolean
  handleIframeLoad: (e: React.SyntheticEvent<HTMLIFrameElement>) => void
  isPaused: boolean
  setIsPaused: (p: boolean) => void
  pauseOnHoverOut: boolean
}

export const SandboxTab: React.FC<SandboxTabProps> = ({
  gameUrl,
  memoryUsage,
  tickData,
  showDebugInfo,
  handleIframeLoad,
  isPaused,
  setIsPaused,
  pauseOnHoverOut,
}) => {
  const currentUsage =
    memoryUsage.length > 0 ? memoryUsage[memoryUsage.length - 1] : null

  React.useEffect(() => {
    if (!pauseOnHoverOut && isPaused) {
      setIsPaused(false)
    }
  }, [pauseOnHoverOut, isPaused, setIsPaused])

  return (
    <div
      className="relative h-full w-full bg-black"
      onMouseEnter={() => {
        if (pauseOnHoverOut) {
          setIsPaused(false)
        }
      }}
      onMouseLeave={() => {
        if (pauseOnHoverOut) {
          setIsPaused(true)
        }
      }}
    >
      <Button
        id="tour-exit-sandbox"
        variant="outline"
        size="sm"
        onClick={() => window.location.reload()}
        className="absolute top-4 left-4 z-50 h-10 rounded-full border-white/10 bg-black/40 px-4 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-black/60 hover:text-primary"
      >
        <RiArrowLeftLine className="mr-2 h-4 w-4" />
        Exit Sandbox
      </Button>

      {isPaused && (
        <div className="pointer-events-none absolute top-4 right-4 z-50 rounded-md border border-yellow-500/50 bg-yellow-500/20 px-4 py-2 text-sm font-medium text-yellow-200 shadow-lg backdrop-blur-md">
          <b>Game Paused</b> (Mouse out of sandbox)
          <br />
          <p>You can disable this in settings.</p>
        </div>
      )}

      {showDebugInfo && (currentUsage !== null || tickData !== null) && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-50 flex min-w-[280px] flex-col gap-1 rounded-md border border-white/10 bg-black/40 p-3 font-mono text-sm text-white shadow-lg backdrop-blur-md">
          {currentUsage !== null && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-white/70">
                <RiLineChartLine className="mr-2 h-4 w-4" />
                <span>Mem:</span>
              </div>
              <span>
                {currentUsage.toFixed(2)} KB (
                {((currentUsage / 500) * 100).toFixed(1)}%)
              </span>
            </div>
          )}
          {tickData !== null && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-white/70">
                  <RiTerminalLine className="mr-2 h-4 w-4" />
                  <span>Tick:</span>
                </div>
                <span>
                  {tickData.tick} ticks ({(tickData.tick / 30).toFixed(1)}s)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-white/70">
                  <RiGamepadLine className="mr-2 h-4 w-4" />
                  <span>Enemies:</span>
                </div>
                <span>
                  {tickData.enemies}/1300 (
                  {((tickData.enemies / 1300) * 100).toFixed(1)}%)
                </span>
              </div>
            </>
          )}
        </div>
      )}

      <iframe
        src={`/play/${gameUrl}_usage/pewpew.html`}
        onLoad={handleIframeLoad}
        className="relative z-10 h-full w-full border-none"
        title="pewpew usage sandbox"
      />
      <iframe
        src={`/play/${gameUrl}_dump/pewpew.html`}
        onLoad={handleIframeLoad}
        className="pointer-events-none absolute top-0 left-0 z-0 h-full w-full border-none opacity-0"
        title="pewpew dump sandbox"
      />
    </div>
  )
}
