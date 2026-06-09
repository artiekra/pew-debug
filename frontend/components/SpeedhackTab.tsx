import React from "react"
import { Button } from "@/components/ui/button"

interface SpeedhackTabProps {
  speed: number
  setSpeed: (speed: number) => void
}

export const SpeedhackTab = ({ speed, setSpeed }: SpeedhackTabProps) => {
  const speeds = [0.1, 0.25, 0.5, 1, 2, 5, 10]

  return (
    <div className="relative flex h-full w-full flex-col bg-black/40 backdrop-blur-xl">
      <div className="flex-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent overflow-y-auto p-6 text-white">
        <h2 className="mb-6 text-xl font-bold text-white/90">Speedhack</h2>

        <div className="mx-auto mt-10 flex max-w-sm flex-col items-center gap-6">
          <div className="font-mono text-5xl font-bold text-primary">
            {speed.toFixed(2)}x
          </div>

          <div className="flex w-full items-center justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => setSpeed(Math.max(0.01, speed / 2))}
              className="h-16 w-16 border-white/20 text-2xl hover:bg-white/10"
            >
              -
            </Button>

            <Button
              variant="outline"
              onClick={() => setSpeed(Math.min(100, speed * 2))}
              className="h-16 w-16 border-white/20 text-2xl hover:bg-white/10"
            >
              +
            </Button>
          </div>

          <div className="mt-4 grid w-full grid-cols-4 gap-2">
            {speeds.map((s) => (
              <Button
                key={s}
                variant={speed === s ? "default" : "outline"}
                size="sm"
                onClick={() => setSpeed(s)}
                className={
                  speed !== s ? "border-white/20 hover:bg-white/10" : ""
                }
              >
                {s}x
              </Button>
            ))}
          </div>

          <Button
            variant="ghost"
            onClick={() => setSpeed(1)}
            className="mt-4 text-white/50 hover:text-white"
          >
            Reset to Normal Speed
          </Button>
        </div>
      </div>
    </div>
  )
}
