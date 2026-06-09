import React, { useState, useEffect, useRef } from "react"
import { ConsoleMessage } from "@/components/ConsoleTab"

export interface Snapshot {
  id: string
  name: string
  timestamp: number
  usage: Uint8Array
  dump: Uint8Array
  usageVirtualTime: number
  usagePerfTime: number
  dumpVirtualTime: number
  dumpPerfTime: number
}

export const useSandboxEngine = () => {
  const [memoryState, setMemoryState] = useState<any>(null)
  const [memoryUsage, setMemoryUsage] = useState<number[]>([])
  const [tickData, setTickData] = useState<{
    tick: number
    enemies: number
  } | null>(null)
  const [consoleLogs, setConsoleLogs] = useState<ConsoleMessage[]>([])
  const [speedhackMultiplier, setSpeedhackMultiplier] = useState<number>(1)

  const [isPaused, setIsPaused] = useState(false)
  const isPausedRef = useRef(false)
  const forceTickRef = useRef<((force?: boolean) => void) | null>(null)
  const usageWinRef = useRef<any>(null)
  const dumpWinRef = useRef<any>(null)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])

  const takeSnapshot = (name?: string) => {
    const uWin = usageWinRef.current
    const dWin = dumpWinRef.current
    const uHeap = uWin?.Module?.HEAPU8 || (uWin?.Module?.wasmMemory ? new Uint8Array(uWin.Module.wasmMemory.buffer) : null)
    const dHeap = dWin?.Module?.HEAPU8 || (dWin?.Module?.wasmMemory ? new Uint8Array(dWin.Module.wasmMemory.buffer) : null)

    if (uHeap && dHeap) {
      // Create a stable random ID fallback
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)
      
      const newSnapshot: Snapshot = {
        id,
        name: name || `Snapshot ${snapshots.length + 1}`,
        timestamp: Date.now(),
        usage: new Uint8Array(uHeap),
        dump: new Uint8Array(dHeap),
        usageVirtualTime: uWin.virtualTime,
        usagePerfTime: uWin.perfTime,
        dumpVirtualTime: dWin.virtualTime,
        dumpPerfTime: dWin.perfTime
      }
      setSnapshots(prev => [...prev, newSnapshot])
      console.log("Snapshot taken:", newSnapshot.name)
    } else {
      console.warn("Could not take snapshot: missing heap")
    }
  }

  const restoreSnapshot = (id?: string) => {
    const snap = id ? snapshots.find(s => s.id === id) : snapshots[snapshots.length - 1]
    const uWin = usageWinRef.current
    const dWin = dumpWinRef.current
    if (!snap || !uWin || !dWin) {
      console.warn("Could not restore snapshot: missing snap or windows")
      return
    }

    const uHeap = uWin.Module?.HEAPU8 || (uWin.Module?.wasmMemory ? new Uint8Array(uWin.Module.wasmMemory.buffer) : null)
    const dHeap = dWin.Module?.HEAPU8 || (dWin.Module?.wasmMemory ? new Uint8Array(dWin.Module.wasmMemory.buffer) : null)

    if (uHeap && dHeap) {
      uHeap.set(snap.usage)
      dHeap.set(snap.dump)
      uWin.virtualTime = snap.usageVirtualTime
      uWin.perfTime = snap.usagePerfTime
      dWin.virtualTime = snap.dumpVirtualTime
      dWin.perfTime = snap.dumpPerfTime
      console.log("Snapshot restored:", snap.name)

      // Force exactly one frame to render so the visual state updates
      if (isPausedRef.current) {
        forceTickRef.current?.(true)
      }
    } else {
      console.warn("Could not restore snapshot: missing heap")
    }
  }

  const renameSnapshot = (id: string, newName: string) => {
    setSnapshots(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s))
  }

  const deleteSnapshot = (id: string) => {
    setSnapshots(prev => prev.filter(s => s.id !== id))
  }

  useEffect(() => {
    isPausedRef.current = isPaused
    if (!isPaused && forceTickRef.current) {
      forceTickRef.current()
    }
  }, [isPaused])

  const workerRef = useRef<Worker | null>(null)
  const speedRef = useRef(1)

  useEffect(() => {
    speedRef.current = speedhackMultiplier
  }, [speedhackMultiplier])

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/logParser.worker.ts", import.meta.url)
    )
    workerRef.current.onmessage = (e) => {
      const { type, value, data, state, line, error } = e.data
      if (type === "usage") {
        setMemoryUsage((prev) => [...prev, value])
      } else if (type === "tick") {
        setTickData(data)
      } else if (type === "level_start") {
        setMemoryUsage([])
        setTickData(null)
      } else if (type === "memory_state") {
        setMemoryState(state)
      } else if (type === "parse_error") {
        console.warn("Worker parse error for line:", line, error)
      }
    }

    let cbUsage: any = null
    let cbDump: any = null
    let usageWin: any = null
    let dumpWin: any = null
    let usageCanvas: any = null
    let dumpCanvas: any = null

    const updateWinRefs = () => {
      usageWinRef.current = usageWin
      dumpWinRef.current = dumpWin
    }

    const tryTick = (force = false) => {
      if (cbUsage && cbDump) {
        if (isPausedRef.current && !force) {
          return
        }

        const u = cbUsage
        const d = cbDump
        cbUsage = null
        cbDump = null

        const executeTick = (now: number) => {
          const dt = 1000 / 60
          if (usageWin) {
            usageWin.virtualTime += dt
            usageWin.perfTime += dt
          }
          if (dumpWin) {
            dumpWin.virtualTime += dt
            dumpWin.perfTime += dt
          }
          u(usageWin ? usageWin.perfTime : now)
          d(dumpWin ? dumpWin.perfTime : now)
        }

        if (speedRef.current === 1 && !force) {
          window.requestAnimationFrame(executeTick)
        } else {
          setTimeout(
            () => executeTick(performance.now()),
            force ? 0 : 1000 / (60 * speedRef.current)
          )
        }
      }
    }

    forceTickRef.current = tryTick
    ;(window as any).registerIframe = (win: any, canvas: any) => {
      const isUsage = win.location.href.includes("_usage")
      if (isUsage) {
        usageWin = win
        usageCanvas = canvas

        win.requestAnimationFrame = (cb: any) => {
          cbUsage = cb
          tryTick()
          return 1
        }
        updateWinRefs()

        const events = [
          "keydown",
          "keyup",
          "keypress",
          "mousedown",
          "mouseup",
          "mousemove",
          "mouseenter",
          "mouseleave",
          "mouseover",
          "mouseout",
          "contextmenu",
          "wheel",
          "touchstart",
          "touchend",
          "touchmove",
          "touchcancel",
          "pointerdown",
          "pointerup",
          "pointermove",
          "pointerenter",
          "pointerleave",
          "pointerover",
          "pointerout",
          "pointercancel",
          "blur",
          "focus",
        ]
        events.forEach((type) => {
          win.addEventListener(
            type,
            (e: any) => {
              if (type === "pointerdown") {
                try {
                  e.target.setPointerCapture(e.pointerId)
                } catch (err) {}
              }
              if (type === "pointerup" || type === "pointercancel") {
                try {
                  if (e.target.hasPointerCapture(e.pointerId)) {
                    e.target.releasePointerCapture(e.pointerId)
                  }
                } catch (err) {}
              }

              if (dumpWin) {
                const targetMap = new Map<any, any>([
                  [usageWin, dumpWin],
                  [usageCanvas, dumpCanvas],
                  [usageWin.document, dumpWin.document],
                  [usageWin.document.body, dumpWin.document.body],
                  [
                    usageWin.document.documentElement,
                    dumpWin.document.documentElement,
                  ],
                ])

                const dumpEvent = new dumpWin[e.constructor.name](e.type, e)

                let currentObj = e
                const props = new Set<string>()
                while (currentObj && currentObj !== Object.prototype) {
                  Object.getOwnPropertyNames(currentObj).forEach((p) =>
                    props.add(p)
                  )
                  currentObj = Object.getPrototypeOf(currentObj)
                }

                props.forEach((key) => {
                  if (
                    key === "target" ||
                    key === "currentTarget" ||
                    key === "srcElement" ||
                    key === "path" ||
                    key === "composedPath"
                  )
                    return
                  if (typeof e[key] !== "function") {
                    try {
                      Object.defineProperty(dumpEvent, key, {
                        get: () => {
                          let val = e[key]
                          return targetMap.has(val) ? targetMap.get(val) : val
                        },
                      })
                    } catch (err) {}
                  }
                })

                let dispatchTarget = targetMap.get(e.target) || dumpWin
                dispatchTarget.dispatchEvent(dumpEvent)
              }
            },
            true
          )
        })
      } else {
        dumpWin = win
        dumpCanvas = canvas

        win.requestAnimationFrame = (cb: any) => {
          cbDump = cb
          tryTick()
          return 1
        }
        updateWinRefs()
      }
    }

    return () => {
      delete (window as any).registerIframe
      workerRef.current?.terminate()
    }
  }, [])

  /** intercepts the iframe console once it loads. */
  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    const iframe = e.currentTarget

    try {
      const targetWindow = iframe.contentWindow as any
      if (!targetWindow) return

      const isUsageFrame = iframe.src.includes("_usage")

      const originalLog = targetWindow.console.log
      const originalWarn = targetWindow.console.warn
      const originalError = targetWindow.console.error
      const originalInfo = targetWindow.console.info

      // overwrite the sandbox's console
      targetWindow.console.log = (...args: any[]) => {
        const logLine = args.join(" ")

        const isInternal =
          logLine.includes("__MEM_USAGE__") ||
          logLine.includes("__TICK_DATA__") ||
          logLine.includes("__LEVEL_START__") ||
          logLine.includes("__MEM_START__") ||
          logLine.includes("__MEM_PART__") ||
          logLine.includes("__MEM_END__") ||
          logLine.includes("__MEM__")

        if (isInternal) {
          workerRef.current?.postMessage({ type: "parse", line: logLine })
        } else {
          // pass normal logs through
          originalLog.apply(targetWindow.console, args)
          if (isUsageFrame) {
            setConsoleLogs((prev) => [
              ...prev.slice(-999),
              { type: "log", message: logLine },
            ])
          }
        }
      }

      if (originalWarn) {
        targetWindow.console.warn = (...args: any[]) => {
          originalWarn.apply(targetWindow.console, args)
          if (isUsageFrame) {
            setConsoleLogs((prev) => [
              ...prev.slice(-999),
              { type: "warn", message: args.join(" ") },
            ])
          }
        }
      }
      if (originalError) {
        targetWindow.console.error = (...args: any[]) => {
          originalError.apply(targetWindow.console, args)
          if (isUsageFrame) {
            setConsoleLogs((prev) => [
              ...prev.slice(-999),
              { type: "error", message: args.join(" ") },
            ])
          }
        }
      }
      if (originalInfo) {
        targetWindow.console.info = (...args: any[]) => {
          originalInfo.apply(targetWindow.console, args)
          if (isUsageFrame) {
            setConsoleLogs((prev) => [
              ...prev.slice(-999),
              { type: "info", message: args.join(" ") },
            ])
          }
        }
      }
    } catch (err) {
      console.warn(
        "could not hook into iframe console. check cors/proxy setup.",
        err
      )
    }
  }

  const clearConsole = () => {
    setConsoleLogs([])
  }

  return {
    memoryState,
    memoryUsage,
    tickData,
    consoleLogs,
    clearConsole,
    speedhackMultiplier,
    setSpeedhackMultiplier,
    handleIframeLoad,
    isPaused,
    setIsPaused,
    takeSnapshot,
    restoreSnapshot,
    snapshots,
    renameSnapshot,
    deleteSnapshot,
  }
}
