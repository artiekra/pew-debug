import React, { useState, useEffect, useRef } from "react"
import { ConsoleMessage } from "@/components/ConsoleTab"

export const useSandboxEngine = () => {
  const [memoryState, setMemoryState] = useState<any>(null)
  const [memoryUsage, setMemoryUsage] = useState<number[]>([])
  const [tickData, setTickData] = useState<{
    tick: number
    enemies: number
  } | null>(null)
  const [consoleLogs, setConsoleLogs] = useState<ConsoleMessage[]>([])
  const [speedhackMultiplier, setSpeedhackMultiplier] = useState<number>(1)

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

    const tryTick = () => {
      if (cbUsage && cbDump) {
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

        if (speedRef.current === 1) {
          window.requestAnimationFrame(executeTick)
        } else {
          setTimeout(
            () => executeTick(performance.now()),
            1000 / (60 * speedRef.current)
          )
        }
      }
    }

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
  }
}
