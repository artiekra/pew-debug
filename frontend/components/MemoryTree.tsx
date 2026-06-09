import React, { useState, useEffect } from "react"
import {
  RiArrowRightSLine,
  RiArrowDownSLine,
  RiStarLine,
  RiStarFill,
} from "@remixicon/react"
import { useSettings, Settings } from "@/hooks/useSettings"

/** Helper to get value at path */
const getValueAtPath = (obj: any, path: string[]) => {
  let current = obj
  for (const key of path) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return undefined
    }
    current = current[key]
  }
  return current
}

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
  nodeKey?: string
  value: any
  path?: string[]
  favourites?: string[][]
  onToggleFavourite?: (path: string[]) => void
  isFavouriteNode?: boolean
  settings: Settings
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const isMissing = value === undefined
  const isFxString =
    typeof value === "string" && /^-?\d+(?:\.\d+)?fx$/.test(value)
  const isFxObj =
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    "__fx" in value
  const isFx = isFxString || isFxObj
  const fxDisplayValue = isFxString
    ? value
    : isFxObj
      ? `${String(value.__fx).replace(/fx$/, "")}fx`
      : ""

  const isObject =
    !isMissing && !isFx && value !== null && typeof value === "object"
  const isEmpty = isObject && Object.keys(value).length === 0

  const pathString = JSON.stringify(path)
  const isFavourited = favourites.some((f) => JSON.stringify(f) === pathString)

  const isFunctionString =
    typeof value === "string" && value.startsWith("function: ")
  if (isFunctionString && !settings.showFunctions) return null

  const isColorVariable =
    settings.formatColors &&
    nodeKey !== undefined &&
    nodeKey.toLowerCase().includes("color") &&
    typeof value === "number" &&
    Number.isInteger(value)

  let colorHex = ""
  let textColorClass = ""
  if (isColorVariable) {
    const unsignedValue = value >>> 0
    colorHex = "#" + unsignedValue.toString(16).padStart(8, "0")
    const r = parseInt(colorHex.substring(1, 3), 16)
    const g = parseInt(colorHex.substring(3, 5), 16)
    const b = parseInt(colorHex.substring(5, 7), 16)
    const yiq = (r * 299 + g * 587 + b * 114) / 1000
    textColorClass = yiq >= 128 ? "text-black" : "text-white"
  }

  return (
    <div className="group/node ml-4 flex flex-col font-mono text-[13px] leading-relaxed">
      <div className="group flex items-start">
        {isObject && !isEmpty && !isMissing && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-[2px] mr-1 -ml-4 text-muted-foreground transition-colors hover:text-foreground"
          >
            {isExpanded ? (
              <RiArrowDownSLine className="h-3.5 w-3.5" />
            ) : (
              <RiArrowRightSLine className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        {/* Align the key if there is no expand button to match indentation */}
        <div
          className={`${isObject && !isEmpty && !isMissing ? "" : "ml-0 pl-[2px]"} relative flex w-full flex-wrap items-center`}
        >
          {nodeKey && (
            <span
              className={`mr-2 font-medium ${isFavouriteNode ? "text-yellow-400 drop-shadow-[0_0_2px_rgba(250,204,21,0.4)]" : "text-cyan-400 drop-shadow-[0_0_2px_rgba(34,211,238,0.4)]"}`}
            >
              {isFavouriteNode
                ? path.map((p) => p.replace(/_\d+$/, "")).join(".")
                : nodeKey.replace(/_\d+$/, "")}
              :
            </span>
          )}

          {isMissing ? (
            <span className="text-xs text-muted-foreground/60 italic">
              unavailable
            </span>
          ) : isFx ? (
            <span className="font-medium text-purple-400 drop-shadow-[0_0_2px_rgba(192,132,252,0.4)]">
              {fxDisplayValue as string}
            </span>
          ) : isObject ? (
            isEmpty ? (
              <span className="font-semibold text-muted-foreground">
                {"{}"}
              </span>
            ) : (
              <span
                className="cursor-pointer font-semibold text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? "" : "{ ... }"}
              </span>
            )
          ) : isFunctionString ? (
            <span className="font-medium text-muted-foreground">
              &lt;{value}&gt;
            </span>
          ) : typeof value === "string" ? (
            <span className="break-all text-amber-300">"{value}"</span>
          ) : isColorVariable ? (
            <span
              className={`rounded-sm px-1 ${textColorClass}`}
              style={{ backgroundColor: colorHex }}
            >
              {colorHex}
            </span>
          ) : typeof value === "number" ? (
            <span className="font-medium text-emerald-400 drop-shadow-[0_0_2px_rgba(52,211,153,0.4)]">
              {value}
            </span>
          ) : typeof value === "boolean" ? (
            <span className="text-indigo-400 drop-shadow-[0_0_2px_rgba(129,140,248,0.4)]">
              {value ? "true" : "false"}
            </span>
          ) : (
            <span className="text-rose-400">{String(value)}</span>
          )}

          {nodeKey && path.length > 0 && onToggleFavourite && (
            <button
              onClick={() => onToggleFavourite(path)}
              className={`ml-2 transition-opacity ${isFavourited ? "text-yellow-400 opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-yellow-400"}`}
              title={isFavourited ? "Unfavourite" : "Favourite"}
            >
              {isFavourited ? (
                <RiStarFill className="h-3.5 w-3.5" />
              ) : (
                <RiStarLine className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {isObject && isExpanded && !isEmpty && !isMissing && (
        <div className="my-1 ml-1.5 border-l border-white/10 pl-2">
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
  )
}

/** displays the live memory state using our recursive node component. */
export const MemoryTree = ({
  data,
  levelId,
}: {
  data: any
  levelId: string
}) => {
  const settings = useSettings()
  const [favourites, setFavourites] = useState<string[][]>([])

  useEffect(() => {
    const saved = localStorage.getItem(`pewpew-memory-favourites-${levelId}`)
    if (saved) {
      try {
        setFavourites(JSON.parse(saved))
      } catch (e) {
        // ignore
      }
    } else {
      setFavourites([])
    }
  }, [levelId])

  if (!data) {
    return (
      <div className="flex h-full animate-pulse flex-col items-center justify-center space-y-4 pt-10 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-r-2 border-primary"></div>
        <span className="font-mono text-sm tracking-wider">
          Awaiting Level Connection...
        </span>
      </div>
    )
  }

  const handleToggleFavourite = (path: string[]) => {
    const pathString = JSON.stringify(path)
    setFavourites((prev) => {
      let newFavs
      if (prev.some((p) => JSON.stringify(p) === pathString)) {
        newFavs = prev.filter((p) => JSON.stringify(p) !== pathString)
      } else {
        newFavs = [...prev, path]
      }
      localStorage.setItem(
        `pewpew-memory-favourites-${levelId}`,
        JSON.stringify(newFavs)
      )
      return newFavs
    })
  }

  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-4 shadow-inner">
      <div className="mb-4 border-b border-white/10 pb-4">
        <div className="mb-3 flex items-center gap-1.5 pl-1 text-[11px] font-semibold tracking-widest text-muted-foreground/80">
          <RiStarFill className="h-3 w-3 text-yellow-400/80" />
          FAVOURITES
        </div>

        {favourites.length === 0 ? (
          <div className="text-s px-1 text-muted-foreground/50 italic">
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
  )
}
