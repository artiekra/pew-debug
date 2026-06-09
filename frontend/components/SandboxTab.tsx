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
}

export const SandboxTab: React.FC<SandboxTabProps> = ({
  gameUrl,
  memoryUsage,
  tickData,
  showDebugInfo,
  handleIframeLoad,
}) => {
  const currentUsage =
    memoryUsage.length > 0 ? memoryUsage[memoryUsage.length - 1] : null

  return (
    <div className="relative h-full w-full bg-black">
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.location.reload()}
        className="absolute top-4 left-4 z-50 h-10 rounded-full border-white/10 bg-black/40 px-4 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-black/60 hover:text-primary"
      >
        <RiArrowLeftLine className="mr-2 h-4 w-4" />
        Exit Sandbox
      </Button>

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
