import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  RiArrowLeftLine,
  RiTerminalLine,
  RiGamepadLine,
  RiLineChartLine,
  RiClipboardLine,
  RiCheckLine,
  RiSaveLine,
  RiHistoryLine,
} from "@remixicon/react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SandboxTabProps {
  gameUrl: string
  memoryUsage: number[]
  tickData: { tick: number; enemies: number } | null
  showDebugInfo: boolean
  handleIframeLoad: (e: React.SyntheticEvent<HTMLIFrameElement>) => void
  isPaused: boolean
  setIsPaused: (p: boolean) => void
  pauseOnHoverOut: boolean
  takeSnapshot: () => void
  restoreSnapshot: () => void
}

const SandboxTooltip = ({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent
      side="bottom"
      sideOffset={10}
      className="z-50 flex flex-col gap-1 rounded-md border border-[#333] bg-[#1a1a1a] px-3 py-2 shadow-lg"
    >
      <span className="text-sm font-bold text-white">{title}</span>
      <span className="text-xs text-[#a0a0a0]">{description}</span>
    </TooltipContent>
  </Tooltip>
)

export const SandboxTab: React.FC<SandboxTabProps> = ({
  gameUrl,
  memoryUsage,
  tickData,
  showDebugInfo,
  handleIframeLoad,
  isPaused,
  setIsPaused,
  pauseOnHoverOut,
  takeSnapshot,
  restoreSnapshot,
}) => {
  const currentUsage =
    memoryUsage.length > 0 ? memoryUsage[memoryUsage.length - 1] : null
  const [copied, setCopied] = useState(false)

  React.useEffect(() => {
    if (!pauseOnHoverOut && isPaused) {
      setIsPaused(false)
    }
  }, [pauseOnHoverOut, isPaused, setIsPaused])

  const handleCopy = () => {
    navigator.clipboard.writeText(gameUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
      <TooltipProvider delayDuration={0}>
        <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
          <SandboxTooltip title="Exit Sandbox" description="Reloads the window">
            <Button
              id="tour-exit-sandbox"
              variant="outline"
              size="icon"
              onClick={() => window.location.reload()}
              className="h-8 w-8 rounded-full border-white/10 bg-black/40 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-black/60 hover:text-primary"
            >
              <RiArrowLeftLine className="h-7 w-7" />
            </Button>
          </SandboxTooltip>

          <SandboxTooltip
            title={copied ? "Copied!" : "Copy Session ID"}
            description={
              copied ? "Game ID copied" : "Copies gameUrl to clipboard"
            }
          >
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className={`h-8 w-8 rounded-full border-white/10 shadow-lg backdrop-blur-md transition-all duration-300 ${
                copied
                  ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  : "bg-black/40 text-white hover:bg-black/60 hover:text-primary"
              }`}
            >
              {copied ? (
                <RiCheckLine className="h-7 w-7" />
              ) : (
                <RiClipboardLine className="h-7 w-7" />
              )}
            </Button>
          </SandboxTooltip>

          <SandboxTooltip
            title="Take Snapshot"
            description="Saves the current state of the level"
          >
            <Button
              variant="outline"
              size="icon"
              onClick={() => takeSnapshot()}
              className="h-8 w-8 rounded-full border-white/10 bg-black/40 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-black/60 hover:text-primary"
            >
              <RiSaveLine className="h-7 w-7" />
            </Button>
          </SandboxTooltip>

          <SandboxTooltip
            title="Restore Snapshot"
            description="Rewinds the level to the last snapshot"
          >
            <Button
              variant="outline"
              size="icon"
              onClick={() => restoreSnapshot()}
              className="h-8 w-8 rounded-full border-white/10 bg-black/40 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-black/60 hover:text-primary"
            >
              <RiHistoryLine className="h-7 w-7" />
            </Button>
          </SandboxTooltip>
        </div>
      </TooltipProvider>

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
        src={`/api/v1/play/${gameUrl}_usage/pewpew.html`}
        onLoad={handleIframeLoad}
        className="relative z-10 h-full w-full border-none"
        title="pewpew usage sandbox"
      />
      <iframe
        src={`/api/v1/play/${gameUrl}_dump/pewpew.html`}
        onLoad={handleIframeLoad}
        className="pointer-events-none absolute top-0 left-0 z-0 h-full w-full border-none opacity-0"
        title="pewpew dump sandbox"
      />
    </div>
  )
}
