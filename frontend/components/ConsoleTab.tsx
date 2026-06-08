import React, { useRef, useEffect } from "react";

export interface ConsoleMessage {
  type: "log" | "warn" | "error" | "info";
  message: string;
}

export const ConsoleTab = ({ logs }: { logs: ConsoleMessage[] }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="w-full h-full flex flex-col bg-black/40 backdrop-blur-xl relative">
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent font-mono text-sm space-y-1">
        {logs.length === 0 ? (
          <div className="text-white/30 italic">No console output...</div>
        ) : (
          logs.map((log, i) => {
            let color = "text-white/80";
            let bg = "";
            let border = "border-white/5";
            
            if (log.type === "error") {
              color = "text-red-400";
              bg = "bg-red-500/10";
              border = "border-red-500/20";
            } else if (log.type === "warn") {
              color = "text-yellow-400";
              bg = "bg-yellow-500/10";
              border = "border-yellow-500/20";
            } else if (log.type === "info") {
              color = "text-blue-400";
            }

            return (
              <div key={i} className={`whitespace-pre-wrap break-words ${color} ${bg} border-b ${border} p-1 rounded-sm`}>
                {log.message}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
