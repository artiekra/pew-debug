let memoryBuffer = ""
let lastState: any = null

function processDelta(jsonStr: string) {
  jsonStr = jsonStr.replace(
    /"(?:[^"\\]|\\.)*"|(-?\d+(?:\.\d+)?)fx/g,
    (match: string, fxGroup: string) => {
      if (fxGroup !== undefined) {
        return `{"__fx":"${fxGroup}"}`
      }
      return match
    }
  )

  const delta = JSON.parse(jsonStr)

  if (!lastState) {
    lastState = delta
  } else {
    const mergeDelta = (target: any, patch: any) => {
      if (typeof target !== "object" || target === null) {
        return patch
      }
      for (const key in patch) {
        if (patch[key] === "__DELETE__") {
          delete target[key]
        } else if (
          typeof patch[key] === "object" &&
          patch[key] !== null &&
          !("__fx" in patch[key])
        ) {
          if (
            typeof target[key] !== "object" ||
            target[key] === null ||
            "__fx" in target[key]
          ) {
            target[key] = patch[key]
          } else {
            target[key] = mergeDelta(target[key], patch[key])
          }
        } else {
          target[key] = patch[key]
        }
      }
      return target
    }
    lastState = mergeDelta(lastState, delta)
  }

  self.postMessage({ type: "memory_state", state: lastState })
}

self.addEventListener("message", (e) => {
  const { type, line } = e.data

  if (type === "parse") {
    try {
      if (line.includes("__MEM_USAGE__")) {
        const usageStr = line.substring(line.indexOf("__MEM_USAGE__") + 13)
        const usageNum = parseFloat(usageStr)
        if (!isNaN(usageNum)) {
          self.postMessage({ type: "usage", value: usageNum })
        }
      } else if (line.includes("__TICK_DATA__")) {
        const tickIdx = line.indexOf("__TICK_DATA__")
        if (tickIdx !== -1) {
          const dataStr = line.substring(tickIdx)
          const parts = dataStr.split(/\s+/)
          if (parts.length >= 3) {
            const tick = parseInt(parts[1])
            const enemies = parseInt(parts[2])
            if (!isNaN(tick) && !isNaN(enemies)) {
              self.postMessage({
                type: "tick",
                data: { tick, enemies },
              })
            }
          }
        }
      } else if (line.includes("__LEVEL_START__")) {
        lastState = null
        self.postMessage({ type: "level_start" })
      } else if (line.includes("__MEM_START__")) {
        const jsonStartIndex = line.indexOf("__MEM_START__") + 13
        memoryBuffer = line.substring(jsonStartIndex)
      } else if (line.includes("__MEM_PART__")) {
        const jsonStartIndex = line.indexOf("__MEM_PART__") + 12
        memoryBuffer += line.substring(jsonStartIndex)
      } else if (line.includes("__MEM_END__")) {
        const jsonStartIndex = line.indexOf("__MEM_END__") + 11
        memoryBuffer += line.substring(jsonStartIndex)
        try {
          processDelta(memoryBuffer)
        } catch (err) {
          self.postMessage({
            type: "parse_error",
            line: "buffered_mem",
            error: String(err),
          })
        }
        memoryBuffer = ""
      } else if (line.includes("__MEM__")) {
        try {
          const jsonStartIndex = line.indexOf("__MEM__") + 7
          const jsonStr = line.substring(jsonStartIndex)
          processDelta(jsonStr)
        } catch (err) {
          self.postMessage({
            type: "parse_error",
            line,
            error: String(err),
          })
        }
      }
    } catch (err) {
      self.postMessage({ type: "parse_error", line, error: String(err) })
    }
  }
})
