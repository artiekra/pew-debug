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

                    if _G.__invulnerable_ships and _G.__orig_make_player_ship_transparent then
                        for ship_id, _ in pairs(_G.__invulnerable_ships) do
                            pcall(_G.__orig_make_player_ship_transparent, ship_id, 300)
                        end
                    end
                end
            end)
        end
    end
end
