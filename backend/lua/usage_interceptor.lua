if not _G.__telemetry_installed_usage then
    _G.__telemetry_installed_usage = true
    local __orig_update = pewpew.add_update_callback
    if __orig_update then
        pewpew.add_update_callback = function(user_callback)
            local __tick_count = 0
            __orig_update(function()
                __tick_count = __tick_count + 1
                local is_report_tick = (__tick_count % 15 == 0)

                user_callback()

                if is_report_tick then
                    local current_mem = collectgarbage("count")
                    print("__MEM_USAGE__", current_mem)
                end
            end)
        end
    end
end
