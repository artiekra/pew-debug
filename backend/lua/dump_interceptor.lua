if not _G.__telemetry_installed then
    _G.__baseline_G = {}
    for k, v in pairs(_G) do
        _G.__baseline_G[k] = true
    end
    _G.__telemetry_installed = true
    local __orig_update = pewpew.add_update_callback
    if __orig_update then
        pewpew.add_update_callback = function(user_callback)
            local __tick_count = 0
            __orig_update(function()
                __tick_count = __tick_count + 1
                local is_report_tick = (__tick_count % 15 == 0)

                user_callback()

                if is_report_tick then
                    local entities = pewpew.get_all_entities()
                    print("__TICK_DATA__", __tick_count, #entities)

                    local seen = {}
                    local function make_snapshot(val)
                        local t = type(val)
                        if t == "string" or t == "number" or t == "boolean" then
                            return val
                        elseif t == "function" or t == "userdata" or t == "thread" then
                            return tostring(val)
                        elseif t == "table" then
                            if seen[val] then
                                return nil
                            end
                            seen[val] = true

                            local res = {}
                            for k, v in pairs(val) do
                                if type(k) == "string" or type(k) == "number" or type(k) == "boolean" then
                                    local key_str = tostring(k)
                                    local sv = make_snapshot(v)
                                    if sv ~= nil then
                                        res[key_str] = sv
                                    end
                                end
                            end
                            return res
                        else
                            return "#UNSUPPORTED#"
                        end
                    end

                    local function compute_delta(old, new)
                        if type(old) ~= "table" or type(new) ~= "table" then
                            if old == new then
                                return nil, false
                            end
                            return new, true
                        end

                        local delta = {}
                        local has_changes = false

                        for k, v in pairs(old) do
                            if new[k] == nil then
                                delta[k] = "__DELETE__"
                                has_changes = true
                            end
                        end

                        for k, v in pairs(new) do
                            local old_v = old[k]
                            if old_v == nil then
                                delta[k] = v
                                has_changes = true
                            else
                                if type(v) == "table" and type(old_v) == "table" then
                                    local sub_delta, sub_changed = compute_delta(old_v, v)
                                    if sub_changed then
                                        delta[k] = sub_delta
                                        has_changes = true
                                    end
                                else
                                    if v ~= old_v then
                                        delta[k] = v
                                        has_changes = true
                                    end
                                end
                            end
                        end

                        return delta, has_changes
                    end

                    local function snapshot_to_json(val)
                        local t = type(val)
                        if t == "string" then
                            local escaped = val:gsub("\\", "\\\\"):gsub('"', '\\"'):gsub("\n", "\\n"):gsub("\r", "")
                            return '"' .. escaped .. '"'
                        elseif t == "number" or t == "boolean" then
                            return tostring(val)
                        elseif t == "table" then
                            local res = {}
                            for k, v in pairs(val) do
                                local key_str = '"'
                                    .. tostring(k):gsub("\\", "\\\\"):gsub('"', '\\"'):gsub("\n", "\\n"):gsub("\r", "")
                                    .. '"'
                                local val_json = snapshot_to_json(v)
                                if val_json ~= nil then
                                    table.insert(res, key_str .. ":" .. val_json)
                                end
                            end
                            return "{" .. table.concat(res, ",") .. "}"
                        else
                            return "null"
                        end
                    end

                    local dump = { Locals = {}, Globals = {} }
                    for k, v in pairs(_G.telemetryState or {}) do
                        if v ~= "#NIL#" then
                            local parts = {}
                            for part in k:gmatch("[^:]+") do
                                table.insert(parts, part)
                            end
                            if #parts >= 4 then
                                parts[4] = parts[4]:gsub("_%d+$", "")
                            end

                            local current = dump.Locals
                            for i = 1, #parts - 1 do
                                local p = parts[i]
                                if type(current[p]) ~= "table" then
                                    current[p] = {}
                                end
                                current = current[p]
                            end
                            current[parts[#parts]] = v
                        end
                    end
                    for k, v in pairs(_G) do
                        if
                            not _G.__baseline_G[k]
                            and k ~= "telemetryState"
                            and type(k) == "string"
                            and not k:match("^__")
                        then
                            if v ~= "#NIL#" then
                                dump.Globals[k] = v
                            end
                        end
                    end

                    local current_snapshot = make_snapshot(dump)
                    local delta_tree

                    if _G.__last_memory_snapshot then
                        local d, changed = compute_delta(_G.__last_memory_snapshot, current_snapshot)
                        if not changed then
                            return
                        end
                        delta_tree = d
                    else
                        delta_tree = current_snapshot
                    end

                    _G.__last_memory_snapshot = current_snapshot

                    local json_str = snapshot_to_json(delta_tree)

                    local chunk_size = 6000
                    if #json_str <= chunk_size then
                        print("__MEM__" .. json_str)
                    else
                        for i = 1, #json_str, chunk_size do
                            local chunk = json_str:sub(i, i + chunk_size - 1)
                            if i == 1 then
                                print("__MEM_START__" .. chunk)
                            elseif i + chunk_size - 1 >= #json_str then
                                print("__MEM_END__" .. chunk)
                            else
                                print("__MEM_PART__" .. chunk)
                            end
                        end
                    end
                end
            end)
        end
    end
end
