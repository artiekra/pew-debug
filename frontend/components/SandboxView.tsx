import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MemoryTree } from "./MemoryTree";
import { RiArrowLeftLine, RiTerminalLine } from "@remixicon/react";

interface SandboxViewProps {
  gameUrl: string;
}

export const SandboxView = ({ gameUrl }: SandboxViewProps) => {
  const [memoryState, setMemoryState] = useState<any>(null);

  /** intercepts the iframe console once it loads. */
  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    const iframe = e.currentTarget;
    
    try {
      const targetWindow = iframe.contentWindow;
      if (!targetWindow) return;

      const originalLog = targetWindow.console.log;

      // overwrite the sandbox's console
      targetWindow.console.log = (...args: any[]) => {
        const logLine = args.join(" ");

        if (logLine.includes("__MEM__")) {
          try {
            // slice out everything before the json structure starts
            const jsonStartIndex = logLine.indexOf("__MEM__") + 7;
            let jsonStr = logLine.substring(jsonStartIndex);
            
            // wipe out the 'fx' suffix from fixed-point numbers
            jsonStr = jsonStr.replace(/(-?\d+(?:\.\d+)?)fx/g, "$1");
            
            const state = JSON.parse(jsonStr);
            setMemoryState(state);
          } catch (err) {
            originalLog.apply(targetWindow.console, ["mangled json target:", logLine, err]);
          }
        } else {
          // pass normal logs through
          originalLog.apply(targetWindow.console, args);
        }
      };
    } catch (err) {
      console.warn("could not hook into iframe console. check cors/proxy setup.", err);
    }
  };

  return (
    <div className="flex w-full h-[100dvh] overflow-hidden bg-[#0A0A0A]">
      <div className="relative w-full lg:w-[70%] h-full bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)] z-20">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.location.reload()}
          className="absolute top-4 left-4 z-50 bg-black/40 backdrop-blur-md text-white border-white/10 hover:bg-black/60 hover:text-primary transition-all duration-300 shadow-lg rounded-full px-4 h-10"
        >
          <RiArrowLeftLine className="w-4 h-4 mr-2" />
          Exit Sandbox
        </Button>
        <iframe 
          src={gameUrl} 
          onLoad={handleIframeLoad}
          className="w-full h-full border-none"
          title="pewpew sandbox"
        />
      </div>

      <div className="hidden lg:flex w-[30%] h-full flex-col bg-black/40 backdrop-blur-xl border-l border-white/5 relative z-10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
        <div className="px-6 py-5 border-b border-white/5 bg-gradient-to-r from-primary/10 to-transparent">
          <h5 className="text-foreground font-heading font-semibold text-lg flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
              <RiTerminalLine className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
            </div>
            Live Memory Tree
          </h5>
        </div>
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <MemoryTree data={memoryState} />
        </div>
      </div>
    </div>
  );
};
