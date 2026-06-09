import React from "react"
import { Button } from "@/components/ui/button"

interface SpeedhackTabProps {
  speed: number
  setSpeed: (speed: number) => void
}

export const SpeedhackTab = ({ speed, setSpeed }: SpeedhackTabProps) => {
  const speeds = [0.1, 0.25, 0.5, 1, 1.5, 2, 3, 5, 10]

  const handleIncrement = () => {
    let step = 0.1
    if (speed >= 5) step = 1.0
    else if (speed >= 2) step = 0.5

    const newSpeed = Math.round((speed + step) * 100) / 100
    setSpeed(newSpeed)
  }

  const handleDecrement = () => {
    let step = 0.1
    if (speed > 5) step = 1.0
    else if (speed > 2) step = 0.5

    const newSpeed = Math.max(0.1, Math.round((speed - step) * 100) / 100)
    setSpeed(newSpeed)
  }

  // Format speed nicely: e.g. 1, 1.5, 0.25
  const formattedSpeed = parseFloat(speed.toFixed(2))

  return (
    <div className="relative flex h-full w-full flex-col bg-black/40 backdrop-blur-xl">
      <div className="flex-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent overflow-y-auto p-6 text-white">
        {/* <h2 className="mb-6 text-xl font-bold text-white/90">Speedhack</h2> */}

        <div className="mx-auto mt-2 flex max-w-md flex-col items-center gap-6">
          {/* Main Speed Control Card */}
          <div className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
            <Button
              variant="outline"
              onClick={handleDecrement}
              className="h-16 w-16 rounded-xl border-white/20 text-4xl font-light transition-all hover:bg-white/10"
            >
              -
            </Button>

            <div className="flex flex-col items-center justify-center">
              <span className="mb-1 text-xs font-semibold tracking-widest text-white/40 uppercase">
                Current Speed
              </span>
              <div className="font-mono text-4xl font-bold tracking-tighter text-primary drop-shadow-md">
                {formattedSpeed}x
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleIncrement}
              className="h-16 w-16 rounded-xl border-white/20 text-4xl font-light transition-all hover:bg-white/10"
            >
              +
            </Button>
          </div>

          {/* Presets Grid */}
          <div className="grid w-full grid-cols-3 gap-3">
            {speeds.map((s) => (
              <Button
                key={s}
                variant={speed === s ? "default" : "outline"}
                size="lg"
                onClick={() => setSpeed(s)}
                className={`h-10 text-lg font-medium transition-all ${
                  speed !== s
                    ? "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                    : "shadow-lg shadow-primary/20"
                }`}
              >
                {s}x
              </Button>
            ))}
          </div>

          {/* Reset Button */}
          <Button
            variant="ghost"
            onClick={() => setSpeed(1)}
            className="w-full text-white/40 hover:bg-white/5 hover:text-white"
          >
            Reset to Normal Speed
          </Button>
        </div>
      </div>
    </div>
  )
}
