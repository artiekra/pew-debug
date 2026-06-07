import React from "react";
import { RiSettings3Line } from "@remixicon/react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/hooks/useSettings";

export const SettingsTab = () => {
  const { showFunctions, formatColors, updateSettings } = useSettings();

  return (
    <div className="w-full h-full flex flex-col bg-black/40 backdrop-blur-xl relative">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-start justify-start w-full">
        <div className="w-full max-w-2xl mx-auto">
          <div className="space-y-8 w-full bg-black/20 p-6 rounded-xl border border-white/5 shadow-inner">
            <div className="flex items-center justify-between gap-6">
              <div className="space-y-1">
                <Label className="text-base font-semibold text-white">Show Functions</Label>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Display function pointers in the memory tree view. You might want to disable this to reduce clutter if you are only interested in data variables.
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
                <Label className="text-base font-semibold text-white">Format Colors</Label>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Automatically format variables containing "color" in their name as visual hex codes with background previews. When disabled, they will appear as raw integers.
                </p>
              </div>
              <Switch 
                checked={formatColors} 
                onCheckedChange={(v) => updateSettings({ formatColors: v })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
