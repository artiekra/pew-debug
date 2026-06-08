import React from "react";
import { Button } from "@/components/ui/button";

interface SpeedhackTabProps {
  speed: number;
  setSpeed: (speed: number) => void;
}

export const SpeedhackTab = ({ speed, setSpeed }: SpeedhackTabProps) => {
  const speeds = [0.1, 0.25, 0.5, 1, 2, 5, 10];

  return (
    <div className="w-full h-full flex flex-col bg-black/40 backdrop-blur-xl relative">
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent text-white">
        <h2 className="text-xl font-bold mb-6 text-white/90">Speedhack</h2>
        
        <div className="flex flex-col items-center gap-6 max-w-sm mx-auto mt-10">
          <div className="text-5xl font-mono font-bold text-primary">
            {speed.toFixed(2)}x
          </div>
          
          <div className="flex items-center gap-4 w-full justify-center">
            <Button 
              variant="outline" 
              onClick={() => setSpeed(Math.max(0.01, speed / 2))}
              className="w-16 h-16 text-2xl border-white/20 hover:bg-white/10"
            >
              -
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setSpeed(Math.min(100, speed * 2))}
              className="w-16 h-16 text-2xl border-white/20 hover:bg-white/10"
            >
              +
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-2 w-full mt-4">
            {speeds.map(s => (
              <Button
                key={s}
                variant={speed === s ? "default" : "outline"}
                size="sm"
                onClick={() => setSpeed(s)}
                className={speed !== s ? "border-white/20 hover:bg-white/10" : ""}
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
  );
};
