"use client"

import React, { useState } from "react"
import { UploadForm } from "@/components/UploadForm"
import { SandboxView } from "@/components/SandboxView"
import { SettingsProvider } from "@/hooks/useSettings"

/** main sandbox component managing the view state. */
export default function PewPewSandbox() {
  const [gameUrl, setGameUrl] = useState<string | null>(null)

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#0A0A0A]">
      <div className="pointer-events-none absolute inset-0 z-0">
        {/* Grid background */}
        {/* <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:2rem_2rem]"></div> */}
        {/* Background glow */}
        {/* <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/20 blur-[120px] rounded-full opacity-50"></div> */}
      </div>

      {/* Content */}
      <div
        className={`relative z-10 flex flex-1 flex-col ${!gameUrl ? "items-center justify-center px-4 pb-20" : ""}`}
      >
        {!gameUrl ? (
          <div className="w-full max-w-2xl">
            <UploadForm onGameUrlReady={setGameUrl} />
          </div>
        ) : (
          <div className="h-full w-full flex-1 bg-[#0A0A0A]">
            <SettingsProvider>
              <SandboxView gameUrl={gameUrl} />
            </SettingsProvider>
          </div>
        )}
      </div>
    </main>
  )
}
