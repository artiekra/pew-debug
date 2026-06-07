import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MemoryTree } from "./MemoryTree";
import { MemoryUsage } from "./MemoryUsage";
import { RiArrowLeftLine, RiTerminalLine, RiGamepadLine, RiNodeTree, RiLineChartLine } from "@remixicon/react";
import { Layout, Model, TabNode, IJsonModel, Actions, DockLocation } from "flexlayout-react";
import "flexlayout-react/style/alpha_dark.css";

interface SandboxViewProps {
  gameUrl: string;
}

const DEFAULT_LAYOUT: IJsonModel = {
  global: {
    tabEnableClose: true,
    tabEnableRename: false,
    tabSetEnableMaximize: true,
    tabEnablePopout: true,
    tabEnablePopoutFloatIcon: true,
    tabEnablePopoutIcon: true,
  },
  borders: [],
  layout: {
    type: "row",
    id: "root",
    weight: 100,
    children: [
      {
        type: "tabset",
        weight: 70,
        id: "sandbox-tabset",
        children: [
          {
            type: "tab",
            id: "sandbox-tab",
            name: "Sandbox",
            component: "sandbox",
          },
        ],
      },
      {
        type: "tabset",
        weight: 30,
        id: "memory-tabset",
        children: [
          {
            type: "tab",
            id: "memory-tab",
            name: "Memory Tree",
            component: "memory",
          },
          {
            type: "tab",
            id: "usage-tab",
            name: "Memory Usage",
            component: "usage",
          },
        ],
      },
    ],
  },
};

export const SandboxView = ({ gameUrl }: SandboxViewProps) => {
  const [memoryState, setMemoryState] = useState<any>(null);
  const [memoryUsage, setMemoryUsage] = useState<number[]>([]);
  const [model] = useState(() => Model.fromJson(DEFAULT_LAYOUT));
  const [, forceUpdate] = useState({});
  const tabStatesRef = React.useRef<Record<string, any>>({});

  // Continuously track the latest state of all known tabs while they are open
  const jsonModel = model.toJson();
  const currentTabIds = ["sandbox-tab", "memory-tab", "usage-tab"];
  
  currentTabIds.forEach(id => {
    const node = model.getNodeById(id);
    if (node) {
      const parent = node.getParent();
      let subLayout: any = undefined;
      
      // Check if this tab's parent is within a floating or popout window
      if (jsonModel.subLayouts) {
        for (const [key, sl] of Object.entries(jsonModel.subLayouts)) {
           if (JSON.stringify(sl).includes(`"id":"${id}"`)) {
             subLayout = sl;
             break;
           }
        }
      }
      
      tabStatesRef.current[id] = {
        json: node.toJson(),
        parentId: parent?.getId(),
        // Only restore the subLayout itself if this tab was its only child (otherwise the window stays open without this tab)
        subLayout: parent?.getChildren().length === 1 ? subLayout : undefined,
      };
    }
  });

  /** intercepts the iframe console once it loads. */
  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    const iframe = e.currentTarget;
    
    try {
      const targetWindow = iframe.contentWindow as any;
      if (!targetWindow) return;

      const originalLog = targetWindow.console.log;
      let currentTickState: any = {};

      // overwrite the sandbox's console
      targetWindow.console.log = (...args: any[]) => {
        const logLine = args.join(" ");

        if (logLine.includes("__MEM_USAGE__")) {
          const usageStr = logLine.substring(logLine.indexOf("__MEM_USAGE__") + 13);
          const usageNum = parseFloat(usageStr);
          if (!isNaN(usageNum)) {
            setMemoryUsage(prev => {
              return [...prev, usageNum];
            });
          }
          // Tick ended, commit state
          setMemoryState(currentTickState);
          currentTickState = {}; // reset for next tick
        } else if (logLine.includes("[V]")) {
          const vIndex = logLine.indexOf("[V]");
          const afterV = logLine.substring(vIndex + 3).trim();
          const firstSpace = afterV.search(/\s/);
          if (firstSpace !== -1) {
             const depthStr = afterV.substring(0, firstSpace);
             const depth = parseInt(depthStr);
             if (!isNaN(depth) && depth >= 1 && depth <= 5) {
                 const limit = depth + 1;
                 const regex = new RegExp("^" + Array(limit).fill("(\\S+)").join("\\s+") + "(?:\\s+([\\s\\S]*))?$");
                 const match = afterV.match(regex);
                 if (match) {
                     const keys = match.slice(2, limit + 1);
                     const valStr = match[limit + 1] || "";
                     let val: any = valStr;

                     if (valStr === "#NIL#") return;

                     if (valStr === "true") val = true;
                     else if (valStr === "false") val = false;
                     else if (valStr === "nil") val = null;
                     else if (!isNaN(Number(valStr)) && valStr.trim() !== "") val = Number(valStr);
                     
                     const rootParts = keys[0].split(':');
                     if (rootParts.length >= 4) {
                         rootParts[3] = rootParts[3].replace(/_\d+$/, '');
                     }
                     const fullPath = [...rootParts, ...keys.slice(1)];
                     
                     let current = currentTickState;
                     for (let i = 0; i < fullPath.length - 1; i++) {
                         if (!current[fullPath[i]] || typeof current[fullPath[i]] !== 'object') {
                             current[fullPath[i]] = {};
                         }
                         current = current[fullPath[i]];
                     }
                     current[fullPath[fullPath.length - 1]] = val;
                 }
             }
          }
        } else if (logLine.includes("__MEM__")) {
          try {
            // slice out everything before the json structure starts
            const jsonStartIndex = logLine.indexOf("__MEM__") + 7;
            let jsonStr = logLine.substring(jsonStartIndex);
            
            // preserve the 'fx' suffix by wrapping fixed-point numbers in a special object, ignoring those inside strings
            jsonStr = jsonStr.replace(/"(?:[^"\\]|\\.)*"|(-?\d+(?:\.\d+)?)fx/g, (match, fxGroup) => {
              if (fxGroup !== undefined) {
                return `{"__fx":"${fxGroup}"}`;
              }
              return match;
            });
            
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

    if (component === "usage") {
      return (
        <div className="w-full h-full flex flex-col bg-black/40 backdrop-blur-xl relative">
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <MemoryUsage data={memoryUsage} />
          </div>
        </div>
      );
    }

    return null;
  };

  const toggleTab = (id: string, name: string, component: string, defaultLocation: DockLocation) => {
    const node = model.getNodeById(id);
    if (node) {
      model.doAction(Actions.deleteTab(id));
    } else {
      const saved = tabStatesRef.current[id];
      const jsonNode = saved?.json || { type: "tab", id, name, component };

      // If the tab was the only thing in a popout or floating window, recreate the whole window!
      if (saved?.subLayout && saved.subLayout.rect) {
        model.doAction(Actions.createSubLayout(
          saved.subLayout.layout, 
          saved.subLayout.rect, 
          saved.subLayout.type || "float"
        ));
        return;
      }

      let targetId = "root";
      let location = defaultLocation;

      // If the parent tabset is still around, dock it exactly back where it was
      if (saved?.parentId && model.getNodeById(saved.parentId)) {
        targetId = saved.parentId;
        location = DockLocation.CENTER;
      }

      model.doAction(
        Actions.addTab(jsonNode, targetId, location, -1, true)
      );
    }
  };

  const hasSandbox = !!model.getNodeById("sandbox-tab");
  const hasMemory = !!model.getNodeById("memory-tab");
  const hasUsage = !!model.getNodeById("usage-tab");

  return (
    <div className="flex w-full h-[100dvh] overflow-hidden bg-[var(--color-background)] text-[var(--color-text)] relative">
      {/* Left Toolbar styled like FlexLayout borders */}
      <div 
        className="h-full flex flex-col items-center py-2 z-20"
        style={{ 
          width: "40px",
          backgroundColor: "var(--color-border-background, #1a1a1a)",
          borderRight: "1px solid var(--color-border-divider-line, #333)"
        }}
      >
        <button 
          onClick={() => toggleTab("sandbox-tab", "Sandbox", "sandbox", DockLocation.LEFT)}
          className={`flex flex-col items-center py-2 w-full transition-colors duration-150 border-l-[3px] ${
            hasSandbox 
              ? "bg-[var(--color-border-tab-selected-background,transparent)]" 
              : "text-[var(--color-border-tab-unselected,gray)] border-transparent hover:text-[var(--color-text)] hover:bg-white/5"
          }`}
          title={hasSandbox ? "Hide Sandbox" : "Show Sandbox"}
        >
          {/* <RiGamepadLine className="w-5 h-5 mb-3" /> */}
          {/* <span  */}
          {/*   className="text-xs uppercase tracking-wider font-semibold"  */}
          {/*   style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }} */}
          {/* > */}
          {/*   Sandbox */}
          {/* </span> */}
          <RiGamepadLine className="w-5 h-5" />
        </button>

        <button 
          onClick={() => toggleTab("memory-tab", "Memory Tree", "memory", DockLocation.RIGHT)}
          className={`flex flex-col items-center py-2 w-full transition-colors duration-150 border-l-[3px] mt-2 ${
            hasMemory 
              ? "bg-[var(--color-border-tab-selected-background,transparent)]" 
              : "text-[var(--color-border-tab-unselected,gray)] border-transparent hover:text-[var(--color-text)] hover:bg-white/5"
          }`}
          title={hasMemory ? "Hide Memory Tree" : "Show Memory Tree"}
        >
          {/* <RiNodeTree className="w-5 h-5 mb-3" /> */}
          {/* <span  */}
          {/*   className="text-xs uppercase tracking-wider font-semibold"  */}
          {/*   style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }} */}
          {/* > */}
          {/*   Memory */}
          {/* </span> */}
          <RiNodeTree className="w-5 h-5" />
        </button>

        <button 
          onClick={() => toggleTab("usage-tab", "Memory Usage", "usage", DockLocation.RIGHT)}
          className={`flex flex-col items-center py-2 w-full transition-colors duration-150 border-l-[3px] mt-2 ${
            hasUsage 
              ? "bg-[var(--color-border-tab-selected-background,transparent)]" 
              : "text-[var(--color-border-tab-unselected,gray)] border-transparent hover:text-[var(--color-text)] hover:bg-white/5"
          }`}
          title={hasUsage ? "Hide Memory Usage" : "Show Memory Usage"}
        >
          <RiLineChartLine className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 relative h-full">
        <Layout 
          model={model} 
          factory={factory} 
          onModelChange={() => forceUpdate({})} 
        />
      </div>
    </div>
  );
};
