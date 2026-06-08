let currentTickState: any = {};

self.addEventListener("message", (e) => {
  const { type, line } = e.data;

  if (type === "parse") {
    try {
      if (line.includes("__MEM_USAGE__")) {
        const usageStr = line.substring(line.indexOf("__MEM_USAGE__") + 13);
        const usageNum = parseFloat(usageStr);
        if (!isNaN(usageNum)) {
          self.postMessage({ type: "usage", value: usageNum });
        }
      } else if (line.includes("__TICK_DATA__")) {
        const tickIdx = line.indexOf("__TICK_DATA__");
        if (tickIdx !== -1) {
          const dataStr = line.substring(tickIdx);
          const parts = dataStr.split(/\s+/);
          if (parts.length >= 3) {
            const tick = parseInt(parts[1]);
            const enemies = parseInt(parts[2]);
            if (!isNaN(tick) && !isNaN(enemies)) {
              self.postMessage({ type: "tick", data: { tick, enemies } });
            }
          }
        }
      } else if (line.includes("__LEVEL_START__")) {
        self.postMessage({ type: "level_start" });
      } else if (line.includes("__MEM_DUMP_END__")) {
        self.postMessage({ type: "memory_state", state: currentTickState });
        currentTickState = {}; // reset for next tick
      } else if (line.includes("[V]")) {
        const vIndex = line.indexOf("[V]");
        const afterV = line.substring(vIndex + 3).trim();
        const firstSpace = afterV.search(/\s/);
        if (firstSpace !== -1) {
          const depthStr = afterV.substring(0, firstSpace);
          const depth = parseInt(depthStr);
          if (!isNaN(depth) && depth >= 1 && depth <= 5) {
            const limit = depth + 1;
            const regex = new RegExp("^" + Array(limit).fill("(\\S+)").join("\\s+") + "(?:\\s+([\\s\\S]*))?$");
            const match = afterV.match(regex);
            if (match) {
              const keys = match.slice(2, limit + 1);
              const valStr = match[limit + 1] || "";
              let val: any = valStr;

              if (valStr === "#NIL#") return;

              if (valStr === "true") val = true;
              else if (valStr === "false") val = false;
              else if (valStr === "nil") val = null;
              else if (!isNaN(Number(valStr)) && valStr.trim() !== "") val = Number(valStr);

              const rootParts = keys[0].split(":");
              if (rootParts.length >= 4) {
                rootParts[3] = rootParts[3].replace(/_\d+$/, "");
              }
              const fullPath = [...rootParts, ...keys.slice(1)];

              let current = currentTickState;
              for (let i = 0; i < fullPath.length - 1; i++) {
                if (!current[fullPath[i]] || typeof current[fullPath[i]] !== "object") {
                  current[fullPath[i]] = {};
                }
                current = current[fullPath[i]];
              }
              current[fullPath[fullPath.length - 1]] = val;
            }
          }
        }
      } else if (line.includes("__MEM__")) {
        try {
          const jsonStartIndex = line.indexOf("__MEM__") + 7;
          let jsonStr = line.substring(jsonStartIndex);

          jsonStr = jsonStr.replace(/"(?:[^"\\]|\\.)*"|(-?\d+(?:\.\d+)?)fx/g, (match: string, fxGroup: string) => {
            if (fxGroup !== undefined) {
              return `{"__fx":"${fxGroup}"}`;
            }
            return match;
          });

          const state = JSON.parse(jsonStr);
          self.postMessage({ type: "memory_state", state });
        } catch (err) {
          self.postMessage({ type: "parse_error", line, error: String(err) });
        }
      }
    } catch (err) {
      self.postMessage({ type: "parse_error", line, error: String(err) });
    }
  }
});
