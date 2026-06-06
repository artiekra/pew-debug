import React from "react";

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
export const MemoryTree = ({ data }: { data: any }) => {
  if (!data) {
    return <div className="text-gray-400">waiting for game update tick...</div>;
  }

  return (
    <div className="font-mono text-[13px]">
      <JsonNode value={data} />
    </div>
  );
};
