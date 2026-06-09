import React from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useSettings } from "@/hooks/useSettings"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export const SettingsTab = () => {
  const {
    showFunctions,
    formatColors,
    showDebugInfo,
    pauseOnHoverOut,
    updateSettings,
  } = useSettings()

  return (
    <div className="relative flex h-full w-full flex-col bg-black/40 backdrop-blur-xl">
      <div className="flex w-full flex-1 flex-col overflow-y-auto p-2">
        <TooltipProvider delayDuration={0}>
          <div className="flex flex-col space-y-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-white/10">
                  <Label className="pointer-events-none cursor-pointer text-sm font-medium text-white">
                    Show Functions
                  </Label>
                  <Switch
                    checked={showFunctions}
                    onCheckedChange={(v) =>
                      updateSettings({ showFunctions: v })
                    }
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="left"
                sideOffset={10}
                className="z-50 flex max-w-[250px] flex-col gap-1 rounded-md border border-[#333] bg-[#1a1a1a] px-3 py-2 shadow-lg"
              >
                <span className="text-sm font-bold text-white">
                  Show Functions
                </span>
                <span className="text-xs leading-relaxed text-[#a0a0a0]">
                  Display function pointers in the memory tree view. You might
                  want to disable this to reduce clutter if you are only
                  interested in data variables.
                </span>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-white/10">
                  <Label className="pointer-events-none cursor-pointer text-sm font-medium text-white">
                    Format Colors
                  </Label>
                  <Switch
                    checked={formatColors}
                    onCheckedChange={(v) => updateSettings({ formatColors: v })}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="left"
                sideOffset={10}
                className="z-50 flex max-w-[250px] flex-col gap-1 rounded-md border border-[#333] bg-[#1a1a1a] px-3 py-2 shadow-lg"
              >
                <span className="text-sm font-bold text-white">
                  Format Colors
                </span>
                <span className="text-xs leading-relaxed text-[#a0a0a0]">
                  Automatically format variables containing "color" in their
                  name as visual hex codes with background previews. When
                  disabled, they will appear as raw integers.
                </span>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-white/10">
                  <Label className="pointer-events-none cursor-pointer text-sm font-medium text-white">
                    Show Sandbox Debug Info
                  </Label>
                  <Switch
                    checked={showDebugInfo}
                    onCheckedChange={(v) =>
                      updateSettings({ showDebugInfo: v })
                    }
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="left"
                sideOffset={10}
                className="z-50 flex max-w-[250px] flex-col gap-1 rounded-md border border-[#333] bg-[#1a1a1a] px-3 py-2 shadow-lg"
              >
                <span className="text-sm font-bold text-white">
                  Show Sandbox Debug Info
                </span>
                <span className="text-xs leading-relaxed text-[#a0a0a0]">
                  Display the performance and debug information overlay (memory
                  usage, tick count, enemies) in the bottom-left corner of the
                  sandbox view.
                </span>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-white/10">
                  <Label className="pointer-events-none cursor-pointer text-sm font-medium text-white">
                    Pause on Hover Out
                  </Label>
                  <Switch
                    checked={pauseOnHoverOut}
                    onCheckedChange={(v) =>
                      updateSettings({ pauseOnHoverOut: v })
                    }
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="left"
                sideOffset={10}
                className="z-50 flex max-w-[250px] flex-col gap-1 rounded-md border border-[#333] bg-[#1a1a1a] px-3 py-2 shadow-lg"
              >
                <span className="text-sm font-bold text-white">
                  Pause on Hover Out
                </span>
                <span className="text-xs leading-relaxed text-[#a0a0a0]">
                  Automatically pause the game when your mouse leaves the
                  sandbox tab.
                </span>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </div>
  )
}
