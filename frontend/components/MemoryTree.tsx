import React, { useState } from "react";
import { RiArrowRightSLine, RiArrowDownSLine } from "@remixicon/react";

/** recursively renders json nodes for the memory tree. */
const JsonNode = ({ nodeKey, value }: { nodeKey?: string; value: any }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const isObject = value !== null && typeof value === "object";
  const isEmpty = isObject && Object.keys(value).length === 0;

  return (
    <div className="ml-4 flex flex-col font-mono text-[13px] leading-relaxed">
      <div className="flex items-start group">
        {isObject && !isEmpty && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-[2px] -ml-4 mr-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? <RiArrowDownSLine className="w-3.5 h-3.5" /> : <RiArrowRightSLine className="w-3.5 h-3.5" />}
          </button>
        )}
        
        {/* Align the key if there is no expand button to match indentation */}
        <div className={`${isObject && !isEmpty ? "" : "ml-0 pl-[2px]"} flex flex-wrap items-center`}>
          {nodeKey && <span className="font-medium text-cyan-400 mr-2 drop-shadow-[0_0_2px_rgba(34,211,238,0.4)]">{nodeKey}:</span>}
          
          {isObject ? (
            isEmpty ? (
              <span className="text-muted-foreground font-semibold">{"{}"}</span>
            ) : (
              <span 
                className="text-muted-foreground font-semibold cursor-pointer hover:text-foreground transition-colors" 
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? "" : "{ ... }"}
              </span>
            )
          ) : typeof value === "string" ? (
            <span className="text-amber-300">"{value}"</span>
          ) : typeof value === "number" ? (
            <span className="text-emerald-400 font-medium drop-shadow-[0_0_2px_rgba(52,211,153,0.4)]">{value}</span>
          ) : typeof value === "boolean" ? (
            <span className="text-indigo-400 drop-shadow-[0_0_2px_rgba(129,140,248,0.4)]">{value ? "true" : "false"}</span>
          ) : (
            <span className="text-rose-400">{String(value)}</span>
          )}
        </div>
      </div>
      
      {isObject && isExpanded && !isEmpty && (
        <div className="border-l border-white/10 ml-1.5 pl-2 my-1">
          {Object.entries(value).map(([k, v]) => (
            <JsonNode key={k} nodeKey={k} value={v} />
          ))}
        </div>
      )}
    </div>
  );
};

/** displays the live memory state using our recursive node component. */
export const MemoryTree = ({ data }: { data: any }) => {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-pulse space-y-4 pt-10">
        <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-primary animate-spin"></div>
        <span className="font-mono text-sm tracking-wider">Awaiting Level Connection...</span>
      </div>
    );
  }

  return (
    <div className="bg-black/20 p-4 rounded-xl border border-white/5 shadow-inner">
      <div className="-ml-4">
        <JsonNode value={data} />
      </div>
    </div>
  );
};
