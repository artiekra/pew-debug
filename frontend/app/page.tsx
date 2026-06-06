"use client";

import React, { useState } from "react";
import { UploadForm } from "@/components/UploadForm";
import { SandboxView } from "@/components/SandboxView";

/** main sandbox component managing the view state. */
export default function PewPewSandbox() {
  const [gameUrl, setGameUrl] = useState<string | null>(null);

  return (
    <div className={`min-h-screen ${gameUrl ? "bg-[#121212]" : "bg-gray-50"}`}>
      {!gameUrl ? (
        <UploadForm onGameUrlReady={setGameUrl} />
      ) : (
        <SandboxView gameUrl={gameUrl} />
      )}
    </div>
  );
}
