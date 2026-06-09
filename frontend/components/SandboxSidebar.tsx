import React from "react"
import {
  RiTerminalLine,
  RiGamepadLine,
  RiNodeTree,
  RiLineChartLine,
  RiSettings3Line,
  RiGithubFill,
  RiExternalLinkLine,
  RiSpeedUpLine,
} from "@remixicon/react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DockLocation } from "flexlayout-react"

const SidebarTooltip = ({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent
      side="right"
      sideOffset={10}
      className="z-50 flex flex-col gap-1 rounded-md border border-[#333] bg-[#1a1a1a] px-3 py-2 shadow-lg"
    >
      <span className="text-sm font-bold text-white">{title}</span>
      <span className="text-xs text-[#a0a0a0]">{description}</span>
    </TooltipContent>
  </Tooltip>
)

interface SandboxSidebarProps {
  hasSandbox: boolean
  hasMemory: boolean
  hasUsage: boolean
  hasConsole: boolean
  hasSettings: boolean
  hasSpeedhack: boolean
  toggleTab: (
    id: string,
    name: string,
    component: string,
    defaultLocation: DockLocation,
    isFloat?: boolean
  ) => void
}

export const SandboxSidebar: React.FC<SandboxSidebarProps> = ({
  hasSandbox,
  hasMemory,
  hasUsage,
  hasConsole,
  hasSettings,
  hasSpeedhack,
  toggleTab,
}) => {
  return (
    <div
      className="z-20 flex h-full flex-col items-center py-2"
      style={{
        width: "40px",
        backgroundColor: "var(--color-border-background, #1a1a1a)",
        borderRight: "1px solid var(--color-border-divider-line, #333)",
      }}
    >
      <TooltipProvider delayDuration={0}>
        <SidebarTooltip title="Sandbox" description="PewPew utils - gameplay">
          <button
            onClick={() =>
              toggleTab("sandbox-tab", "Sandbox", "sandbox", DockLocation.LEFT)
            }
            className={`flex w-full flex-col items-center border-l-[3px] py-2 transition-colors duration-150 ${
              hasSandbox
                ? "bg-[var(--color-border-tab-selected-background,transparent)]"
                : "border-transparent text-[var(--color-border-tab-unselected,gray)] hover:bg-white/5 hover:text-[var(--color-text)]"
            }`}
          >
            <RiGamepadLine className="h-5 w-5" />
          </button>
        </SidebarTooltip>

        <SidebarTooltip
          title="Memory Tree"
          description="Inspect game variables and state structure"
        >
          <button
            onClick={() =>
              toggleTab(
                "memory-tab",
                "Memory Tree",
                "memory",
                DockLocation.RIGHT
              )
            }
            className={`mt-2 flex w-full flex-col items-center border-l-[3px] py-2 transition-colors duration-150 ${
              hasMemory
                ? "bg-[var(--color-border-tab-selected-background,transparent)]"
                : "border-transparent text-[var(--color-border-tab-unselected,gray)] hover:bg-white/5 hover:text-[var(--color-text)]"
            }`}
          >
            <RiNodeTree className="h-5 w-5" />
          </button>
        </SidebarTooltip>

        <SidebarTooltip
          title="Console"
          description="View dev tools console output"
        >
          <button
            onClick={() =>
              toggleTab("console-tab", "Console", "console", DockLocation.RIGHT)
            }
            className={`mt-2 flex w-full flex-col items-center border-l-[3px] py-2 transition-colors duration-150 ${
              hasConsole
                ? "bg-[var(--color-border-tab-selected-background,transparent)]"
                : "border-transparent text-[var(--color-border-tab-unselected,gray)] hover:bg-white/5 hover:text-[var(--color-text)]"
            }`}
          >
            <RiTerminalLine className="h-5 w-5" />
          </button>
        </SidebarTooltip>

        <SidebarTooltip
          title="Memory Usage"
          description="Monitor memory allocations over time"
        >
          <button
            onClick={() =>
              toggleTab(
                "usage-tab",
                "Memory Usage",
                "usage",
                DockLocation.CENTER
              )
            }
            className={`mt-2 flex w-full flex-col items-center border-l-[3px] py-2 transition-colors duration-150 ${
              hasUsage
                ? "bg-[var(--color-border-tab-selected-background,transparent)]"
                : "border-transparent text-[var(--color-border-tab-unselected,gray)] hover:bg-white/5 hover:text-[var(--color-text)]"
            }`}
          >
            <RiLineChartLine className="h-5 w-5" />
          </button>
        </SidebarTooltip>

        <SidebarTooltip
          title="Speedhack"
          description="Control game execution speed"
        >
          <button
            onClick={() =>
              toggleTab(
                "speedhack-tab",
                "Speedhack",
                "speedhack",
                DockLocation.CENTER,
                true
              )
            }
            className={`mt-2 flex w-full flex-col items-center border-l-[3px] py-2 transition-colors duration-150 ${
              hasSpeedhack
                ? "bg-[var(--color-border-tab-selected-background,transparent)]"
                : "border-transparent text-[var(--color-border-tab-unselected,gray)] hover:bg-white/5 hover:text-[var(--color-text)]"
            }`}
          >
            <RiSpeedUpLine className="h-5 w-5" />
          </button>
        </SidebarTooltip>

        <div className="flex-1" />

        <SidebarTooltip
          title="GitHub Repository"
          description="View source code or report issues"
        >
          <a
            href="https://github.com/artiekra/pew-debug"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex w-full flex-col items-center border-l-[3px] border-transparent py-2 text-[var(--color-border-tab-unselected,gray)] transition-colors duration-150 hover:bg-white/5 hover:text-[var(--color-text)]"
          >
            <RiGithubFill className="h-5 w-5 group-hover:hidden" />
            <RiExternalLinkLine className="hidden h-5 w-5 group-hover:block" />
          </a>
        </SidebarTooltip>

        <SidebarTooltip
          title="Settings"
          description="Configure app preferences"
        >
          <button
            onClick={() =>
              toggleTab(
                "settings-tab",
                "Settings",
                "settings",
                DockLocation.CENTER,
                true
              )
            }
            className={`mb-2 flex w-full flex-col items-center border-l-[3px] py-2 transition-colors duration-150 ${
              hasSettings
                ? "bg-[var(--color-border-tab-selected-background,transparent)]"
                : "border-transparent text-[var(--color-border-tab-unselected,gray)] hover:bg-white/5 hover:text-[var(--color-text)]"
            }`}
          >
            <RiSettings3Line className="h-5 w-5" />
          </button>
        </SidebarTooltip>
      </TooltipProvider>
    </div>
  )
}
