import React, { useState } from "react"
import { MemoryTree } from "./MemoryTree"
import { MemoryUsage } from "./MemoryUsage"
import { ConsoleTab } from "./ConsoleTab"
import {
  Layout,
  Model,
  TabNode,
  IJsonModel,
  Actions,
  DockLocation,
} from "flexlayout-react"
import { SpeedhackTab } from "./SpeedhackTab"
import { SettingsTab } from "./SettingsTab"
import { useSettings } from "@/hooks/useSettings"
import "flexlayout-react/style/alpha_dark.css"
import { SandboxSidebar } from "./SandboxSidebar"
import { SandboxTab } from "./SandboxTab"
import { useSandboxEngine } from "@/hooks/useSandboxEngine"
import { useTour, TourAlertDialog, TourStep } from "@/components/tour"
interface SandboxViewProps {
  gameUrl: string
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
}

export const SandboxView = ({ gameUrl }: SandboxViewProps) => {
  const {
    memoryState,
    memoryUsage,
    tickData,
    consoleLogs,
    clearConsole,
    speedhackMultiplier,
    setSpeedhackMultiplier,
    handleIframeLoad,
    isPaused,
    setIsPaused,
  } = useSandboxEngine()

  const { setSteps, isTourCompleted, setIsTourCompleted } = useTour()
  const [isTourDialogOpen, setIsTourDialogOpen] = React.useState(false)

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const tourDone = localStorage.getItem("sandbox_tour_completed") === "true"
      if (tourDone) {
        setIsTourCompleted(true)
      } else {
        setSteps([
          {
            content: (
              <div>
                <h3 className="mb-1 text-lg font-semibold">
                  Memory Dump & Console
                </h3>
                <p className="text-sm text-muted-foreground">
                  You can switch between viewing the memory dump of the level
                  and the console right here.
                </p>
              </div>
            ),
            selectorId: "#tour-memory-console",
            position: "left",
          },
          {
            content: (
              <div>
                <h3 className="mb-1 text-lg font-semibold">
                  Memory Usage & More
                </h3>
                <p className="text-sm text-muted-foreground">
                  Open memory usage stats on the sidebar. There are more tools
                  here! Also, you can move tabs around or pop them out to float.
                </p>
              </div>
            ),
            selectorId: "#tour-memory-usage",
            position: "right",
          },
          {
            content: (
              <div>
                <h3 className="mb-1 text-lg font-semibold">Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Find your settings button down here.
                </p>
              </div>
            ),
            selectorId: "#tour-settings",
            position: "right",
          },
          {
            content: (
              <div>
                <h3 className="mb-1 text-lg font-semibold">Exit Sandbox</h3>
                <p className="text-sm text-muted-foreground">
                  When you're done, use this exit button to upload another
                  level.
                </p>
              </div>
            ),
            selectorId: "#tour-exit-sandbox",
            position: "bottom",
          },
        ])

        const timer = setTimeout(() => {
          setIsTourDialogOpen(true)
        }, 500)
        return () => clearTimeout(timer)
      }
    }
  }, [setSteps, setIsTourCompleted])

  React.useEffect(() => {
    if (isTourCompleted && typeof window !== "undefined") {
      localStorage.setItem("sandbox_tour_completed", "true")
    }
  }, [isTourCompleted])

  const [model] = useState(() => Model.fromJson(DEFAULT_LAYOUT))
  const [, forceUpdate] = useState({})
  const tabStatesRef = React.useRef<Record<string, any>>({})
  const { showDebugInfo, pauseOnHoverOut } = useSettings()

  // Continuously track the latest state of all known tabs while they are open
  const jsonModel = model.toJson()
  const currentTabIds = [
    "sandbox-tab",
    "memory-tab",
    "usage-tab",
    "console-tab",
    "settings-tab",
    "speedhack-tab",
  ]

  currentTabIds.forEach((id) => {
    const node = model.getNodeById(id)
    if (node) {
      const parent = node.getParent()
      let subLayout: any = undefined

      // Check if this tab's parent is within a floating or popout window
      if (jsonModel.subLayouts) {
        for (const [key, sl] of Object.entries(jsonModel.subLayouts)) {
          if (JSON.stringify(sl).includes(`"id":"${id}"`)) {
            subLayout = sl
            break
          }
        }
      }

      tabStatesRef.current[id] = {
        json: node.toJson(),
        parentId: parent?.getId(),
        // Only restore the subLayout itself if this tab was its only child (otherwise the window stays open without this tab)
        subLayout: parent?.getChildren().length === 1 ? subLayout : undefined,
      }
    }
  })

  const factory = (node: TabNode) => {
    const component = node.getComponent()

    if (component === "sandbox") {
      return (
        <SandboxTab
          gameUrl={gameUrl}
          memoryUsage={memoryUsage}
          tickData={tickData}
          showDebugInfo={showDebugInfo}
          handleIframeLoad={handleIframeLoad}
          isPaused={isPaused}
          setIsPaused={setIsPaused}
          pauseOnHoverOut={pauseOnHoverOut}
        />
      )
    }

    if (component === "memory") {
      return (
        <div
          id="tour-memory-console"
          className="relative flex h-full w-full flex-col bg-black/40 backdrop-blur-xl"
        >
          <div className="flex-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent overflow-y-auto p-6">
            <MemoryTree data={memoryState} levelId={gameUrl} />
          </div>
        </div>
      )
    }

    if (component === "usage") {
      return (
        <div className="relative flex h-full w-full flex-col bg-black/40 backdrop-blur-xl">
          <div className="flex-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent overflow-y-auto p-6">
            <MemoryUsage data={memoryUsage} />
          </div>
        </div>
      )
    }

    if (component === "console") {
      return (
        <div id="tour-memory-console" className="h-full w-full">
          <ConsoleTab logs={consoleLogs} onClear={clearConsole} />
        </div>
      )
    }

    if (component === "settings") {
      return <SettingsTab />
    }

    if (component === "speedhack") {
      return (
        <SpeedhackTab
          speed={speedhackMultiplier}
          setSpeed={setSpeedhackMultiplier}
        />
      )
    }

    return null
  }

  const toggleTab = (
    id: string,
    name: string,
    component: string,
    defaultLocation: DockLocation,
    isFloat: boolean = false
  ) => {
    const node = model.getNodeById(id)
    if (node) {
      model.doAction(Actions.deleteTab(id))
    } else {
      const saved = tabStatesRef.current[id]
      const jsonNode = saved?.json || { type: "tab", id, name, component }

      // If the tab was the only thing in a popout or floating window, recreate the whole window!
      if (saved?.subLayout && saved.subLayout.rect) {
        model.doAction(
          Actions.createSubLayout(
            saved.subLayout.layout,
            saved.subLayout.rect,
            saved.subLayout.type || "float"
          )
        )
        return
      }

      if (!saved && isFloat) {
        const width = 400
        const height = 300
        const left = (window.innerWidth - width) / 2
        const top = (window.innerHeight - height) / 2

        model.doAction(
          Actions.createSubLayout(
            {
              type: "row",
              weight: 100,
              children: [
                {
                  type: "tabset",
                  weight: 100,
                  id: `${id}-tabset`,
                  children: [jsonNode],
                },
              ],
            },
            { left, top, x: left, y: top, width, height } as any,
            "float" as any
          )
        )
        return
      }

      let targetId = "root"
      let location = defaultLocation

      // If the parent tabset is still around, dock it exactly back where it was
      if (saved?.parentId && model.getNodeById(saved.parentId)) {
        targetId = saved.parentId
        location = DockLocation.CENTER
      }

      model.doAction(Actions.addTab(jsonNode, targetId, location, -1, true))
    }
  }

  const hasSandbox = !!model.getNodeById("sandbox-tab")
  const hasMemory = !!model.getNodeById("memory-tab")
  const hasUsage = !!model.getNodeById("usage-tab")
  const hasConsole = !!model.getNodeById("console-tab")
  const hasSettings = !!model.getNodeById("settings-tab")
  const hasSpeedhack = !!model.getNodeById("speedhack-tab")

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-[var(--color-background)] text-[var(--color-text)]">
      <SandboxSidebar
        hasSandbox={hasSandbox}
        hasMemory={hasMemory}
        hasUsage={hasUsage}
        hasConsole={hasConsole}
        hasSettings={hasSettings}
        hasSpeedhack={hasSpeedhack}
        toggleTab={toggleTab}
      />

      <div className="relative h-full flex-1">
        <Layout
          model={model}
          factory={factory}
          onModelChange={() => forceUpdate({})}
        />
      </div>
      <TourAlertDialog
        isOpen={isTourDialogOpen}
        setIsOpen={setIsTourDialogOpen}
      />
    </div>
  )
}
