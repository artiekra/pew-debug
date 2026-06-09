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
                    local function to_json(val)
                        local t = type(val)
                        if t == "string" then
                            local escaped = val:gsub("\\", "\\\\"):gsub('"', '\\"'):gsub("\n", "\\n"):gsub("\r", "")
                            return '"' .. escaped .. '"'
                        elseif t == "number" or t == "boolean" then
                            return tostring(val)
                        elseif t == "nil" then
                            return "null"
                        elseif t == "function" or t == "userdata" or t == "thread" then
                            return '"' .. tostring(val) .. '"'
                        elseif t == "table" then
                            if seen[val] then
                                return nil
                            end
                            seen[val] = true

                            local res = {}
                            for k, v in pairs(val) do
                                if type(k) == "string" or type(k) == "number" or type(k) == "boolean" then
                                    local key_str
                                    if type(k) == "string" then
                                        key_str = '"'
                                            .. k:gsub("\\", "\\\\"):gsub('"', '\\"'):gsub("\n", "\\n"):gsub("\r", "")
                                            .. '"'
                                    else
                                        key_str = '"' .. tostring(k):gsub('"', '\\"') .. '"'
                                    end
                                    local val_json = to_json(v)
                                    if val_json ~= nil then
                                        table.insert(res, key_str .. ":" .. val_json)
                                    end
                                end
                            end
                            return "{" .. table.concat(res, ",") .. "}"
                        else
                            return '"#UNSUPPORTED#"'
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

                    local json_str = to_json(dump)

                    local chunk_size = 3000
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
