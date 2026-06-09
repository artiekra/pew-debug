import React, { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RiDeleteBinLine } from "@remixicon/react"

export interface ConsoleMessage {
  message: string
}

export const ConsoleTab = ({
  logs,
  onClear,
}: {
  logs: ConsoleMessage[]
  onClear?: () => void
}) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  return (
    <div className="relative flex h-full w-full flex-col bg-black/40 backdrop-blur-xl">
      <div className="flex-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-1 overflow-y-auto p-4 font-mono text-sm">
        {logs.length === 0 ? (
          <div className="text-white/30 italic">No console output...</div>
        ) : (
          logs.map((log, i) => {
            let color = "text-white/80"
            let bg = ""
            let border = "border-white/5"

            return (
              <div
                key={i}
                className={`break-words whitespace-pre-wrap ${color} ${bg} border-b ${border} rounded-sm p-1`}
              >
                {log.message}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {onClear && (
        <div className="absolute right-4 bottom-4 z-50">
          <Button
            variant="outline"
            size="xl"
            onClick={onClear}
            className="h-8 rounded-md border-white/10 bg-black/60 px-3 text-white/70 shadow-lg backdrop-blur-md transition-all hover:bg-black/80 hover:text-red-400"
          >
            <RiDeleteBinLine className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      )}
    </div>
  )
}
