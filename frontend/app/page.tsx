"use client";

import React, { useState, useRef, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";


/** recursively renders json nodes for the memory tree. */
const JsonNode = ({ nodeKey, value }: { nodeKey?: string; value: any }) => {
  const isObject = value !== null && typeof value === "object";

  return (
    <div className="ml-4">
      {nodeKey && <span className="font-bold text-[#9cdcfe]">{nodeKey}: </span>}
      
      {isObject ? (
        <div>
          {Object.entries(value).map(([k, v]) => (
            <JsonNode key={k} nodeKey={k} value={v} />
          ))}
        </div>
      ) : typeof value === "string" ? (
        <span className="text-[#ce9178]">"{value}"</span>
      ) : typeof value === "number" ? (
        <span className="text-[#b5cea8]">{value}</span>
      ) : typeof value === "boolean" ? (
        <span className="text-[#569cd6]">{value ? "true" : "false"}</span>
      ) : (
        <span>{String(value)}</span>
      )}
    </div>
  );
};


/** displays the live memory state using our recursive node component. */
const MemoryTree = ({ data }: { data: any }) => {
  if (!data) {
    return <div className="text-gray-400">waiting for game update tick...</div>;
  }

  return (
    <div className="font-mono text-[13px]">
      <JsonNode value={data} />
    </div>
  );
};


/** main sandbox component managing the view state. */
export default function PewPewSandbox() {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [memoryState, setMemoryState] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  /** handles directory upload and hits the inject endpoint. */
  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsUploading(true);

    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      setErrorMsg("please select a folder.");
      setIsUploading(false);
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      formData.append("files", file, file.webkitRelativePath);
    }

    try {
      // hitting the proxy route defined in next.config.js
      const response = await fetch("/inject", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("server responded with an error.");
      }

      const data = await response.json();
      setGameUrl(`/play/${data.id}/pewpew.html`);
    } catch (err: any) {
      console.error("upload failed:", err);
      setErrorMsg("upload failed! make sure your backend is running.");
    } finally {
      setIsUploading(false);
    }
  };


  /** intercepts the iframe console once it loads. */
  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    const iframe = e.currentTarget;
    
    try {
      const targetWindow = iframe.contentWindow;
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


  return (
    <div className={`min-h-screen ${gameUrl ? "bg-[#121212]" : "bg-gray-50"}`}>
      {!gameUrl ? (
        <div className="container mx-auto pt-20 px-4">
          <Card className="max-w-md mx-auto shadow-sm">
            <CardHeader>
              <CardTitle className="text-center text-xl">upload level folder</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="folderInput" className="text-sm text-muted-foreground">
                    select your lua level directory
                  </label>
                  <Input
                    id="folderInput"
                    type="file"
                    ref={fileInputRef}
                    // @ts-expect-error - react types miss directory attributes sometimes
                    webkitdirectory=""
                    directory=""
                    multiple
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isUploading}>
                  {isUploading ? "instrumenting code..." : "upload & launch"}
                </Button>
              </form>

              {errorMsg && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription className="text-center">{errorMsg}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex w-full h-screen overflow-hidden">
          <div className="relative w-[70%] h-full bg-black">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
              className="absolute top-2 left-2 z-50 bg-black/50 text-white hover:bg-black/70 border-gray-600"
            >
              &larr; back
            </Button>
            <iframe 
              src={gameUrl} 
              onLoad={handleIframeLoad}
              className="w-full h-full border-none"
              title="pewpew sandbox"
            />
          </div>

          <div className="w-[30%] h-full overflow-y-auto bg-[#1e1e1e] text-[#d4d4d4] p-4 border-l-2 border-[#333]">
            <h5 className="text-white mb-3 pb-2 border-b border-gray-600 font-semibold">
              live memory tree
            </h5>
            <MemoryTree data={memoryState} />
          </div>
        </div>
      )}
    </div>
  );
}
