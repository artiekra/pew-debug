import React, { useState, useEffect } from "react";
import { RiArrowRightSLine, RiArrowDownSLine, RiStarLine, RiStarFill } from "@remixicon/react";
import { useSettings, Settings } from "@/hooks/useSettings";

/** Helper to get value at path */
const getValueAtPath = (obj: any, path: string[]) => {
  let current = obj;
  for (const key of path) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }
  return current;
};

/** recursively renders json nodes for the memory tree. */
const JsonNode = ({ 
  nodeKey, 
  value, 
  path = [],
  favourites = [],
  onToggleFavourite,
  isFavouriteNode = false,
  settings,
}: { 
  nodeKey?: string; 
  value: any;
  path?: string[];
  favourites?: string[][];
  onToggleFavourite?: (path: string[]) => void;
  isFavouriteNode?: boolean;
  settings: Settings;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const isMissing = value === undefined;
  const isFx = typeof value === "string" && /^-?\d+(?:\.\d+)?fx$/.test(value);
  const isObject = !isMissing && !isFx && value !== null && typeof value === "object";
  const isEmpty = isObject && Object.keys(value).length === 0;

  const pathString = JSON.stringify(path);
  const isFavourited = favourites.some(f => JSON.stringify(f) === pathString);

  const isFunctionString = typeof value === "string" && value.startsWith("function: ");
  if (isFunctionString && !settings.showFunctions) return null;

  const isColorVariable = settings.formatColors && nodeKey !== undefined && nodeKey.toLowerCase().includes("color") && typeof value === "number" && Number.isInteger(value);

  let colorHex = "";
  let textColorClass = "";
  if (isColorVariable) {
    const unsignedValue = value >>> 0;
    colorHex = "#" + unsignedValue.toString(16).padStart(8, "0");
    const r = parseInt(colorHex.substring(1, 3), 16);
    const g = parseInt(colorHex.substring(3, 5), 16);
    const b = parseInt(colorHex.substring(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    textColorClass = yiq >= 128 ? 'text-black' : 'text-white';
  }

  return (
    <div className="ml-4 flex flex-col font-mono text-[13px] leading-relaxed group/node">
      <div className="flex items-start group">
        {isObject && !isEmpty && !isMissing && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-[2px] -ml-4 mr-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? <RiArrowDownSLine className="w-3.5 h-3.5" /> : <RiArrowRightSLine className="w-3.5 h-3.5" />}
          </button>
        )}
        
        {/* Align the key if there is no expand button to match indentation */}
        <div className={`${isObject && !isEmpty && !isMissing ? "" : "ml-0 pl-[2px]"} flex flex-wrap items-center relative w-full`}>
          {nodeKey && (
            <span className={`font-medium mr-2 ${isFavouriteNode ? 'text-yellow-400 drop-shadow-[0_0_2px_rgba(250,204,21,0.4)]' : 'text-cyan-400 drop-shadow-[0_0_2px_rgba(34,211,238,0.4)]'}`}>
              {isFavouriteNode ? path.join('.') : nodeKey}:
            </span>
          )}
          
          {isMissing ? (
            <span className="text-muted-foreground/60 italic text-xs">unavailable</span>
          ) : isFx ? (
            <span className="text-purple-400 font-medium drop-shadow-[0_0_2px_rgba(192,132,252,0.4)]">{value}</span>
          ) : isObject ? (
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
          ) : isFunctionString ? (
            <span className="text-muted-foreground font-medium">&lt;{value}&gt;</span>
          ) : typeof value === "string" ? (
            <span className="text-amber-300 break-all">"{value}"</span>
          ) : isColorVariable ? (
            <span 
              className={`px-1 rounded-sm ${textColorClass}`}
              style={{ backgroundColor: colorHex }}
            >
              {colorHex}
            </span>
          ) : typeof value === "number" ? (
            <span className="text-emerald-400 font-medium drop-shadow-[0_0_2px_rgba(52,211,153,0.4)]">{value}</span>
          ) : typeof value === "boolean" ? (
            <span className="text-indigo-400 drop-shadow-[0_0_2px_rgba(129,140,248,0.4)]">{value ? "true" : "false"}</span>
          ) : (
            <span className="text-rose-400">{String(value)}</span>
          )}

          {nodeKey && path.length > 0 && onToggleFavourite && (
            <button
              onClick={() => onToggleFavourite(path)}
              className={`ml-2 transition-opacity ${isFavourited ? 'opacity-100 text-yellow-400' : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-yellow-400'}`}
              title={isFavourited ? "Unfavourite" : "Favourite"}
            >
              {isFavourited ? <RiStarFill className="w-3.5 h-3.5" /> : <RiStarLine className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
      
      {isObject && isExpanded && !isEmpty && !isMissing && (
        <div className="border-l border-white/10 ml-1.5 pl-2 my-1">
          {Object.entries(value).map(([k, v]) => (
            <JsonNode 
              key={k} 
              nodeKey={k} 
              value={v} 
              path={[...path, k]}
              favourites={favourites}
              onToggleFavourite={onToggleFavourite}
              settings={settings}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/** displays the live memory state using our recursive node component. */
export const MemoryTree = ({ data }: { data: any }) => {
  const settings = useSettings();
  const [favourites, setFavourites] = useState<string[][]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("pewpew-memory-favourites");
    if (saved) {
      try {
        setFavourites(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-pulse space-y-4 pt-10">
        <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-primary animate-spin"></div>
        <span className="font-mono text-sm tracking-wider">Awaiting Level Connection...</span>
      </div>
    );
  }

  const handleToggleFavourite = (path: string[]) => {
    const pathString = JSON.stringify(path);
    setFavourites(prev => {
      let newFavs;
      if (prev.some(p => JSON.stringify(p) === pathString)) {
        newFavs = prev.filter(p => JSON.stringify(p) !== pathString);
      } else {
        newFavs = [...prev, path];
      }
      localStorage.setItem("pewpew-memory-favourites", JSON.stringify(newFavs));
      return newFavs;
    });
  };

  return (
    <div className="bg-black/20 p-4 rounded-xl border border-white/5 shadow-inner">
      <div className="pb-4 border-b border-white/10 mb-4">
        <div className="text-[11px] tracking-widest font-semibold text-muted-foreground/80 mb-3 flex items-center gap-1.5 pl-1">
          <RiStarFill className="w-3 h-3 text-yellow-400/80" />
          FAVOURITES
        </div>
        
        {favourites.length === 0 ? (
          <div className="text-s text-muted-foreground/50 italic px-1">
            Hover over any variable and click the star to pin it here.
          </div>
        ) : (
          <div className="-ml-4">
            {favourites.map((path, idx) => (
              <JsonNode 
                key={idx}
                nodeKey={path[path.length - 1]}
                value={getValueAtPath(data, path)}
                path={path}
                favourites={favourites}
                onToggleFavourite={handleToggleFavourite}
                isFavouriteNode={true}
                settings={settings}
              />
            ))}
          </div>
        )}
      </div>

      <div className="-ml-4">
        <JsonNode 
          value={data} 
          path={[]} 
          favourites={favourites}
          onToggleFavourite={handleToggleFavourite}
          settings={settings}
        />
      </div>
    </div>
  );
};
