import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MemoryTree } from "./MemoryTree";

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
    <div className="flex w-full h-screen overflow-hidden">
      <div className="relative w-[70%] h-full bg-black">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.location.reload()}
          className="absolute top-2 left-2 z-50 bg-black/50 text-white hover:bg-black/70 border-gray-600"
        >
          &larr; back
        </Button>
        <iframe 
          src={gameUrl} 
          onLoad={handleIframeLoad}
          className="w-full h-full border-none"
          title="pewpew sandbox"
        />
      </div>

      <div className="w-[30%] h-full overflow-y-auto bg-[#1e1e1e] text-[#d4d4d4] p-4 border-l-2 border-[#333]">
        <h5 className="text-white mb-3 pb-2 border-b border-gray-600 font-semibold">
          live memory tree
        </h5>
        <MemoryTree data={memoryState} />
      </div>
    </div>
  );
};
