if not _G.__telemetry_installed then
    _G.__baseline_G = {}
    for k, v in pairs(_G) do
        _G.__baseline_G[k] = true
    end
    _G.__telemetry_installed = true
    local __orig_update = pewpew.add_update_callback
    if __orig_update then
        local __key_cache = {}
        local escape_map = {
            ["\\"] = "\\\\",
            ['"'] = '\\"',
            ["\n"] = "\\n",
            ["\r"] = "",
        }

        pewpew.add_update_callback = function(user_callback)
            local __tick_count = 0

            local __phase = 0
            local __dump = nil
            local __current_snapshot = nil
            local __delta_tree = nil
            local __has_changes = false
            local __json_chunks = nil
            local __print_idx = 1
            local __out_flat = nil

            __orig_update(function()
                __tick_count = __tick_count + 1
                user_callback()

                if __tick_count % 15 == 0 then
                    local entities = pewpew.get_all_entities()
                    print("__TICK_DATA__", __tick_count, #entities)

                    if _G.__invulnerable_ships and _G.__orig_make_player_ship_transparent then
                        for ship_id, _ in pairs(_G.__invulnerable_ships) do
                            pcall(_G.__orig_make_player_ship_transparent, ship_id, 300)
                        end
                    end
                end

                if __phase == 0 then
                    if __tick_count % 15 == 0 then
                        __phase = 1
                    end
                end

                if __phase == 1 then
                    -- Phase 1: Build dump table & snapshot
                    __dump = { Locals = {}, Globals = {} }
                    for k, v in pairs(_G.telemetryState or {}) do
                        if v ~= "#NIL#" then
                            local parts = __key_cache[k]
                            if not parts then
                                parts = {}
                                for part in k:gmatch("[^:]+") do
                                    table.insert(parts, part)
                                end
                                if #parts >= 4 then
                                    parts[4] = parts[4]:gsub("_%d+$", "")
                                end
                                __key_cache[k] = parts
                            end

                            local current = __dump.Locals
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
                                __dump.Globals[k] = v
                            end
                        end
                    end

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
                    __current_snapshot = make_snapshot(__dump)
                    __phase = 2
                elseif __phase == 2 then
                    -- Phase 2: Compute Delta
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

                    if _G.__last_memory_snapshot then
                        __delta_tree, __has_changes = compute_delta(_G.__last_memory_snapshot, __current_snapshot)
                    else
                        __delta_tree = __current_snapshot
                        __has_changes = true
                    end
                    _G.__last_memory_snapshot = __current_snapshot

                    if not __has_changes then
                        __phase = 0
                    else
                        __phase = 3
                    end
                elseif __phase == 3 then
                    -- Phase 3: Flattened JSON Assembly
                    __out_flat = {}

                    local function escape_str(s)
                        return '"' .. tostring(s):gsub('["\\\n\r]', escape_map) .. '"'
                    end

                    local function snapshot_to_json_flat(val)
                        local t = type(val)
                        if t == "string" then
                            table.insert(__out_flat, escape_str(val))
                        elseif t == "number" or t == "boolean" then
                            table.insert(__out_flat, tostring(val))
                        elseif t == "table" then
                            table.insert(__out_flat, "{")
                            local first = true
                            for k, v in pairs(val) do
                                if not first then
                                    table.insert(__out_flat, ",")
                                end
                                first = false
                                table.insert(__out_flat, escape_str(k))
                                table.insert(__out_flat, ":")
                                snapshot_to_json_flat(v)
                            end
                            table.insert(__out_flat, "}")
                        else
                            table.insert(__out_flat, "null")
                        end
                    end

                    snapshot_to_json_flat(__delta_tree)
                    local full_json = table.concat(__out_flat)

                    __json_chunks = {}
                    local chunk_size = 6000
                    if #full_json <= chunk_size then
                        table.insert(__json_chunks, "__MEM__" .. full_json)
                    else
                        for i = 1, #full_json, chunk_size do
                            local chunk = full_json:sub(i, i + chunk_size - 1)
                            if i == 1 then
                                table.insert(__json_chunks, "__MEM_START__" .. chunk)
                            elseif i + chunk_size - 1 >= #full_json then
                                table.insert(__json_chunks, "__MEM_END__" .. chunk)
                            else
                                table.insert(__json_chunks, "__MEM_PART__" .. chunk)
                            end
                        end
                    end

                    __print_idx = 1
                    __phase = 4
                elseif __phase == 4 then
                    -- Phase 4: Sliced Printing
                    if __print_idx <= #__json_chunks then
                        print(__json_chunks[__print_idx])
                        __print_idx = __print_idx + 1
                    else
                        __phase = 0
                    end
                end
            end)
        end
    end
end
