import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MemoryTree } from "./MemoryTree";
import { RiArrowLeftLine, RiTerminalLine } from "@remixicon/react";
import { Layout, Model, TabNode, IJsonModel } from "flexlayout-react";
import "flexlayout-react/style/alpha_dark.css";

interface SandboxViewProps {
  gameUrl: string;
}

const DEFAULT_LAYOUT: IJsonModel = {
  global: {
    tabEnableClose: false,
    tabEnableRename: false,
    tabSetEnableMaximize: true,
    tabEnablePopout: true,
    tabEnablePopoutFloatIcon: true,
    tabEnablePopoutIcon: true,
  },
  borders: [],
  layout: {
    type: "row",
    weight: 100,
    children: [
      {
        type: "tabset",
        weight: 70,
        children: [
          {
            type: "tab",
            name: "Sandbox",
            component: "sandbox",
          },
        ],
      },
      {
        type: "tabset",
        weight: 30,
        children: [
          {
            type: "tab",
            name: "Memory Tree",
            component: "memory",
          },
        ],
      },
    ],
  },
};

export const SandboxView = ({ gameUrl }: SandboxViewProps) => {
  const [memoryState, setMemoryState] = useState<any>(null);
  const [model] = useState(() => Model.fromJson(DEFAULT_LAYOUT));

  /** intercepts the iframe console once it loads. */
  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    const iframe = e.currentTarget;
    
    try {
      const targetWindow = iframe.contentWindow as any;
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

  const factory = (node: TabNode) => {
    const component = node.getComponent();

    if (component === "sandbox") {
      return (
        <div className="relative w-full h-full bg-black">
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
      );
    }

    if (component === "memory") {
      return (
        <div className="w-full h-full flex flex-col bg-black/40 backdrop-blur-xl relative">
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <MemoryTree data={memoryState} />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="w-full h-[100dvh] overflow-hidden bg-[#0A0A0A] text-foreground relative">
      <Layout model={model} factory={factory} />
    </div>
  );
};
