import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MemoryTree } from "./MemoryTree";
import { MemoryUsage } from "./MemoryUsage";
import { ConsoleTab, ConsoleMessage } from "./ConsoleTab";
import { RiArrowLeftLine, RiTerminalLine, RiGamepadLine, RiNodeTree, RiLineChartLine, RiSettings3Line, RiGithubFill, RiExternalLinkLine, RiSpeedUpLine } from "@remixicon/react";
import { Layout, Model, TabNode, IJsonModel, Actions, DockLocation } from "flexlayout-react";
import { SpeedhackTab } from "./SpeedhackTab";
import { SettingsTab } from "./SettingsTab";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSettings } from "@/hooks/useSettings";
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
            id: "console-tab",
            name: "Console",
            component: "console",
          },
        ],
      },
    ],
  },
};

const SidebarTooltip = ({ title, description, children }: { title: string, description: string, children: React.ReactNode }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      {children}
    </TooltipTrigger>
    <TooltipContent side="right" sideOffset={10} className="flex flex-col gap-1 px-3 py-2 border border-[#333] bg-[#1a1a1a] shadow-lg rounded-md z-50">
      <span className="font-bold text-sm text-white">{title}</span>
      <span className="text-[#a0a0a0] text-xs">{description}</span>
    </TooltipContent>
  </Tooltip>
);

export const SandboxView = ({ gameUrl }: SandboxViewProps) => {
  const [memoryState, setMemoryState] = useState<any>(null);
  const [memoryUsage, setMemoryUsage] = useState<number[]>([]);
  const [tickData, setTickData] = useState<{tick: number, enemies: number} | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleMessage[]>([]);
  const [model] = useState(() => Model.fromJson(DEFAULT_LAYOUT));
  const [, forceUpdate] = useState({});
  const tabStatesRef = React.useRef<Record<string, any>>({});
  const workerRef = React.useRef<Worker | null>(null);
  const { showDebugInfo } = useSettings();
  const [speedhackMultiplier, setSpeedhackMultiplier] = useState<number>(1);
  const speedRef = React.useRef(1);

  useEffect(() => {
    speedRef.current = speedhackMultiplier;
  }, [speedhackMultiplier]);

  // Continuously track the latest state of all known tabs while they are open
  const jsonModel = model.toJson();
  const currentTabIds = ["sandbox-tab", "memory-tab", "usage-tab", "console-tab", "settings-tab", "speedhack-tab"];
  
  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/logParser.worker.ts', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const { type, value, data, state, line, error } = e.data;
      if (type === "usage") {
        setMemoryUsage(prev => [...prev, value]);
      } else if (type === "tick") {
        setTickData(data);
      } else if (type === "level_start") {
        setMemoryUsage([]);
        setTickData(null);
      } else if (type === "memory_state") {
        setMemoryState(state);
      } else if (type === "parse_error") {
        console.warn("Worker parse error for line:", line, error);
      }
    };

    let cbUsage: any = null;
    let cbDump: any = null;
    let usageWin: any = null;
    let dumpWin: any = null;
    let usageCanvas: any = null;
    let dumpCanvas: any = null;

    const tryTick = () => {
      if (cbUsage && cbDump) {
        const u = cbUsage;
        const d = cbDump;
        cbUsage = null;
        cbDump = null;
        
        const executeTick = (now: number) => {
          const dt = 1000 / 60;
          if (usageWin) {
            usageWin.virtualTime += dt;
            usageWin.perfTime += dt;
          }
          if (dumpWin) {
            dumpWin.virtualTime += dt;
            dumpWin.perfTime += dt;
          }
          u(usageWin ? usageWin.perfTime : now);
          d(dumpWin ? dumpWin.perfTime : now);
        };

        if (speedRef.current === 1) {
          window.requestAnimationFrame(executeTick);
        } else {
          setTimeout(() => executeTick(performance.now()), 1000 / (60 * speedRef.current));
        }
      }
    };

    (window as any).registerIframe = (win: any, canvas: any) => {
      const isUsage = win.location.href.includes('_usage');
      if (isUsage) {
        usageWin = win;
        usageCanvas = canvas;
        
        win.requestAnimationFrame = (cb: any) => {
          cbUsage = cb;
          tryTick();
          return 1;
        };

        const events = [
          'keydown', 'keyup', 'keypress',
          'mousedown', 'mouseup', 'mousemove', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout', 'contextmenu',
          'wheel', 
          'touchstart', 'touchend', 'touchmove', 'touchcancel',
          'pointerdown', 'pointerup', 'pointermove', 'pointerenter', 'pointerleave', 'pointerover', 'pointerout', 'pointercancel',
          'blur', 'focus'
        ];
        events.forEach(type => {
          win.addEventListener(type, (e: any) => {
            if (type === "pointerdown") {
              try { e.target.setPointerCapture(e.pointerId); } catch(err) {}
            }
            if (type === "pointerup" || type === "pointercancel") {
              try {
                if (e.target.hasPointerCapture(e.pointerId)) {
                  e.target.releasePointerCapture(e.pointerId);
                }
              } catch(err) {}
            }

            if (dumpWin) {
              const targetMap = new Map<any, any>([
                [usageWin, dumpWin],
                [usageCanvas, dumpCanvas],
                [usageWin.document, dumpWin.document],
                [usageWin.document.body, dumpWin.document.body],
                [usageWin.document.documentElement, dumpWin.document.documentElement]
              ]);

              const dumpEvent = new dumpWin[e.constructor.name](e.type, e);
              
              let currentObj = e;
              const props = new Set<string>();
              while (currentObj && currentObj !== Object.prototype) {
                Object.getOwnPropertyNames(currentObj).forEach(p => props.add(p));
                currentObj = Object.getPrototypeOf(currentObj);
              }
              
              props.forEach(key => {
                if (key === 'target' || key === 'currentTarget' || key === 'srcElement' || key === 'path' || key === 'composedPath') return;
                if (typeof e[key] !== 'function') {
                  try {
                    Object.defineProperty(dumpEvent, key, { 
                      get: () => {
                        let val = e[key];
                        return targetMap.has(val) ? targetMap.get(val) : val;
                      } 
                    });
                  } catch (err) {}
                }
              });

              let dispatchTarget = targetMap.get(e.target) || dumpWin;
              dispatchTarget.dispatchEvent(dumpEvent);
            }
          }, true);
        });
      } else {
        dumpWin = win;
        dumpCanvas = canvas;
        
        win.requestAnimationFrame = (cb: any) => {
          cbDump = cb;
          tryTick();
          return 1;
        };
      }
    };

    return () => {
      delete (window as any).registerIframe;
      workerRef.current?.terminate();
    };
  }, []);

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
      const originalWarn = targetWindow.console.warn;
      const originalError = targetWindow.console.error;
      const originalInfo = targetWindow.console.info;
      let currentTickState: any = {};

      // overwrite the sandbox's console
      targetWindow.console.log = (...args: any[]) => {
        const logLine = args.join(" ");

        const isInternal = logLine.includes("__MEM_USAGE__") || 
                           logLine.includes("__TICK_DATA__") || 
                           logLine.includes("__LEVEL_START__") || 
                           logLine.includes("__MEM_START__") || 
                           logLine.includes("__MEM_PART__") || 
                           logLine.includes("__MEM_END__") || 
                           logLine.includes("__MEM__");

        if (isInternal) {
          workerRef.current?.postMessage({ type: "parse", line: logLine });
        } else {
          // pass normal logs through
          originalLog.apply(targetWindow.console, args);
          setConsoleLogs(prev => [...prev.slice(-999), { type: "log", message: logLine }]);
        }
      };

      if (originalWarn) {
        targetWindow.console.warn = (...args: any[]) => {
          originalWarn.apply(targetWindow.console, args);
          setConsoleLogs(prev => [...prev.slice(-999), { type: "warn", message: args.join(" ") }]);
        };
      }
      if (originalError) {
        targetWindow.console.error = (...args: any[]) => {
          originalError.apply(targetWindow.console, args);
          setConsoleLogs(prev => [...prev.slice(-999), { type: "error", message: args.join(" ") }]);
        };
      }
      if (originalInfo) {
        targetWindow.console.info = (...args: any[]) => {
          originalInfo.apply(targetWindow.console, args);
          setConsoleLogs(prev => [...prev.slice(-999), { type: "info", message: args.join(" ") }]);
        };
      }
    } catch (err) {
      console.warn("could not hook into iframe console. check cors/proxy setup.", err);
    }
  };

  const factory = (node: TabNode) => {
    const component = node.getComponent();

    if (component === "sandbox") {
      const currentUsage = memoryUsage.length > 0 ? memoryUsage[memoryUsage.length - 1] : null;

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

          {showDebugInfo && (currentUsage !== null || tickData !== null) && (
            <div className="absolute bottom-4 left-4 z-50 bg-black/40 backdrop-blur-md text-white border border-white/10 shadow-lg rounded-md p-3 text-sm font-mono pointer-events-none flex flex-col gap-1 min-w-[280px]">
              {currentUsage !== null && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-white/70">
                    <RiLineChartLine className="w-4 h-4 mr-2" />
                    <span>Mem:</span>
                  </div>
                  <span>{currentUsage.toFixed(2)} KB ({((currentUsage / 500) * 100).toFixed(1)}%)</span>
                </div>
              )}
              {tickData !== null && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-white/70">
                      <RiTerminalLine className="w-4 h-4 mr-2" />
                      <span>Tick:</span>
                    </div>
                    <span>{tickData.tick} ticks ({(tickData.tick / 30).toFixed(1)}s)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-white/70">
                      <RiGamepadLine className="w-4 h-4 mr-2" />
                      <span>Enemies:</span>
                    </div>
                    <span>{tickData.enemies}/1300 ({((tickData.enemies / 1300) * 100).toFixed(1)}%)</span>
                  </div>
                </>
              )}
            </div>
          )}

          <iframe 
            src={`/play/${gameUrl}_usage/pewpew.html`} 
            onLoad={handleIframeLoad}
            className="w-full h-full border-none relative z-10"
            title="pewpew usage sandbox"
          />
          <iframe 
            src={`/play/${gameUrl}_dump/pewpew.html`} 
            onLoad={handleIframeLoad}
            className="w-full h-full border-none absolute top-0 left-0 opacity-0 pointer-events-none z-0"
            title="pewpew dump sandbox"
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

    if (component === "console") {
      return <ConsoleTab logs={consoleLogs} />;
    }

    if (component === "settings") {
      return <SettingsTab />;
    }

    if (component === "speedhack") {
      return <SpeedhackTab speed={speedhackMultiplier} setSpeed={setSpeedhackMultiplier} />;
    }

    return null;
  };

  const toggleTab = (id: string, name: string, component: string, defaultLocation: DockLocation, isFloat: boolean = false) => {
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

      if (!saved && isFloat) {
        const width = 400;
        const height = 300;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;
        
        model.doAction(Actions.createSubLayout(
          {
            type: "row",
            weight: 100,
            children: [
              {
                type: "tabset",
                weight: 100,
                id: `${id}-tabset`,
                children: [jsonNode],
              }
            ]
          },
          { left, top, x: left, y: top, width, height } as any,
          "float" as any
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
  const hasConsole = !!model.getNodeById("console-tab");
  const hasSettings = !!model.getNodeById("settings-tab");
  const hasSpeedhack = !!model.getNodeById("speedhack-tab");

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
        <TooltipProvider delayDuration={0}>
          <SidebarTooltip title="Sandbox" description="PewPew utils - gameplay">
            <button 
              onClick={() => toggleTab("sandbox-tab", "Sandbox", "sandbox", DockLocation.LEFT)}
              className={`flex flex-col items-center py-2 w-full transition-colors duration-150 border-l-[3px] ${
                hasSandbox 
                  ? "bg-[var(--color-border-tab-selected-background,transparent)]" 
                  : "text-[var(--color-border-tab-unselected,gray)] border-transparent hover:text-[var(--color-text)] hover:bg-white/5"
              }`}
            >
              <RiGamepadLine className="w-5 h-5" />
            </button>
          </SidebarTooltip>

          <SidebarTooltip title="Memory Tree" description="Inspect game variables and state structure">
            <button 
              onClick={() => toggleTab("memory-tab", "Memory Tree", "memory", DockLocation.RIGHT)}
              className={`flex flex-col items-center py-2 w-full transition-colors duration-150 border-l-[3px] mt-2 ${
                hasMemory 
                  ? "bg-[var(--color-border-tab-selected-background,transparent)]" 
                  : "text-[var(--color-border-tab-unselected,gray)] border-transparent hover:text-[var(--color-text)] hover:bg-white/5"
              }`}
            >
              <RiNodeTree className="w-5 h-5" />
            </button>
          </SidebarTooltip>

          <SidebarTooltip title="Memory Usage" description="Monitor memory allocations over time">
            <button 
              onClick={() => toggleTab("usage-tab", "Memory Usage", "usage", DockLocation.RIGHT)}
              className={`flex flex-col items-center py-2 w-full transition-colors duration-150 border-l-[3px] mt-2 ${
                hasUsage 
                  ? "bg-[var(--color-border-tab-selected-background,transparent)]" 
                  : "text-[var(--color-border-tab-unselected,gray)] border-transparent hover:text-[var(--color-text)] hover:bg-white/5"
              }`}
            >
              <RiLineChartLine className="w-5 h-5" />
            </button>
          </SidebarTooltip>

          <SidebarTooltip title="Console" description="View dev tools console output">
            <button 
              onClick={() => toggleTab("console-tab", "Console", "console", DockLocation.RIGHT)}
              className={`flex flex-col items-center py-2 w-full transition-colors duration-150 border-l-[3px] mt-2 ${
                hasConsole 
                  ? "bg-[var(--color-border-tab-selected-background,transparent)]" 
                  : "text-[var(--color-border-tab-unselected,gray)] border-transparent hover:text-[var(--color-text)] hover:bg-white/5"
              }`}
            >
              <RiTerminalLine className="w-5 h-5" />
            </button>
          </SidebarTooltip>

          <div className="flex-1" />

          <SidebarTooltip title="GitHub Repository" description="View source code or report issues">
            <a 
              href="https://github.com/artiekra/pew-debug"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center py-2 w-full transition-colors duration-150 border-l-[3px] border-transparent text-[var(--color-border-tab-unselected,gray)] hover:text-[var(--color-text)] hover:bg-white/5"
            >
              <RiGithubFill className="w-5 h-5 group-hover:hidden" />
              <RiExternalLinkLine className="w-5 h-5 hidden group-hover:block" />
            </a>
          </SidebarTooltip>

          <SidebarTooltip title="Speedhack" description="Control game execution speed">
            <button 
              onClick={() => toggleTab("speedhack-tab", "Speedhack", "speedhack", DockLocation.CENTER, true)}
              className={`flex flex-col items-center py-2 w-full transition-colors duration-150 border-l-[3px] mb-2 ${
                hasSpeedhack 
                  ? "bg-[var(--color-border-tab-selected-background,transparent)]" 
                  : "text-[var(--color-border-tab-unselected,gray)] border-transparent hover:text-[var(--color-text)] hover:bg-white/5"
              }`}
            >
              <RiSpeedUpLine className="w-5 h-5" />
            </button>
          </SidebarTooltip>

          <SidebarTooltip title="Settings" description="Configure app preferences">
            <button 
              onClick={() => toggleTab("settings-tab", "Settings", "settings", DockLocation.CENTER, true)}
              className={`flex flex-col items-center py-2 w-full transition-colors duration-150 border-l-[3px] mb-2 ${
                hasSettings 
                  ? "bg-[var(--color-border-tab-selected-background,transparent)]" 
                  : "text-[var(--color-border-tab-unselected,gray)] border-transparent hover:text-[var(--color-text)] hover:bg-white/5"
              }`}
            >
              <RiSettings3Line className="w-5 h-5" />
            </button>
          </SidebarTooltip>
        </TooltipProvider>
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
