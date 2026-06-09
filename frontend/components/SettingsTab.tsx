import React from "react"
import { RiSettings3Line } from "@remixicon/react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useSettings } from "@/hooks/useSettings"

export const SettingsTab = () => {
  const { showFunctions, formatColors, showDebugInfo, updateSettings } =
    useSettings()

  return (
    <div className="relative flex h-full w-full flex-col bg-black/40 backdrop-blur-xl">
      <div className="flex w-full flex-1 flex-col items-start justify-start overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-2xl">
          <div className="w-full space-y-8 rounded-xl border border-white/5 bg-black/20 p-6 shadow-inner">
            <div className="flex items-center justify-between gap-6">
              <div className="space-y-1">
                <Label className="text-base font-semibold text-white">
                  Show Functions
                </Label>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Display function pointers in the memory tree view. You might
                  want to disable this to reduce clutter if you are only
                  interested in data variables.
                </p>
              </div>
              <Switch
                checked={showFunctions}
                onCheckedChange={(v) => updateSettings({ showFunctions: v })}
              />
            </div>

            <div className="h-px w-full bg-white/5" />

            <div className="flex items-center justify-between gap-6">
              <div className="space-y-1">
                <Label className="text-base font-semibold text-white">
                  Format Colors
                </Label>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Automatically format variables containing "color" in their
                  name as visual hex codes with background previews. When
                  disabled, they will appear as raw integers.
                </p>
              </div>
              <Switch
                checked={formatColors}
                onCheckedChange={(v) => updateSettings({ formatColors: v })}
              />
            </div>

            <div className="h-px w-full bg-white/5" />

            <div className="flex items-center justify-between gap-6">
              <div className="space-y-1">
                <Label className="text-base font-semibold text-white">
                  Show Sandbox Debug Info
                </Label>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Display the performance and debug information overlay (memory
                  usage, tick count, enemies) in the bottom-left corner of the
                  sandbox view.
                </p>
              </div>
              <Switch
                checked={showDebugInfo}
                onCheckedChange={(v) => updateSettings({ showDebugInfo: v })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
