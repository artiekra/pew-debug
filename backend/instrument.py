import re
import shutil
from pathlib import Path

def find_locals(lines: list[str]) -> list[str]:
    """Extract unique local variable names from lua source lines."""
    locals_list = []
    for line in lines:
        match = re.search(r"\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*(\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)", line)
        if match:
            vars_str = match.group(1)
            for v in vars_str.split(","):
                name = v.strip()
                if name and name not in ["function"]:
                    locals_list.append(name)

    return list(set(locals_list))


def instrument_lua_file(code: str, file_id: str) -> str:
    """Parse lua code and inject state mirroring code safely."""
    lines = code.splitlines()
    processed_lines = []
    idx = 0

    while idx < len(lines):
        line = lines[idx]

        func_match = re.search(r"\bfunction\s+([a-zA-Z_][a-zA-Z0-9_]*)", line)
        if func_match:
            processed_lines.append(line)
            func_name = func_match.group(1)
            func_lines = []
            depth = 1
            idx += 1

            while idx < len(lines) and depth > 0:
                sub_line = lines[idx]
                func_lines.append(sub_line)
                if re.search(r"\b(if|while|for|do|function)\b", sub_line) and not re.search(r"\bend\b", sub_line):
                    depth += 1
                if re.search(r"\bend\b",  sub_line) and not re.search(r"\b(if|while|for|do|function)\b", sub_line):
                    depth -= 1
                idx += 1

            local_vars = find_locals(func_lines)
            if local_vars:
                sync_parts = [f"{v} = {v}" for v in local_vars]
                sync_str = ", ".join(sync_parts)
                inject_cmd = f"  _G.__live_mem = _G.__live_mem or {{}}; _G.__live_mem[\"{file_id}_{func_name}\"] = {{{sync_str}}}"

                instrumented_body = []
                body_lines = func_lines[:-1]
                closing_end = func_lines[-1]

                for f_line in body_lines:
                    if re.search(r"\breturn\b", f_line):
                        instrumented_body.append(inject_cmd)
                    instrumented_body.append(f_line)

                has_trailing_return = False
                if body_lines:
                    last_line = ""
                    for l in reversed(body_lines):
                        if l.strip():
                            last_line = l
                            break
                    if re.search(r"\breturn\b", last_line):
                        has_trailing_return = True

                if not has_trailing_return:
                    instrumented_body.append(inject_cmd)

                instrumented_body.append(closing_end)
                processed_lines.extend(instrumented_body)
            else:
                processed_lines.extend(func_lines)
            continue
        else:
            processed_lines.append(line)
            idx += 1

    interceptor_payload = """
    local __orig_update = pewpew.add_update_callback
    pewpew.add_update_callback = function(user_callback)
    __orig_update(function()
        local function serialize(val, seen)
        seen = seen or {}
        if type(val) == "string" then return string.format("%q", val) end
        if type(val) == "number" or type(val) == "boolean" then return tostring(val) end
        if type(val) == "table" then
            if seen[val] then return '"<circular>"' end
            seen[val] = true
            local parts = {}
            for k, v in pairs(val) do
            if k ~= "_G" and k ~= "pewpew" and type(v) ~= "function" then
                local k_str = type(k) == "string" and string.format("%q", k) or '"' .. tostring(k) .. '"'
                local v_str = serialize(v, seen)
                if v_str then table.insert(parts, k_str .. ":" .. v_str) end
            end
            end
            seen[val] = nil
            return "{" .. table.concat(parts, ",") .. "}"
        end
        return "null"
        end
        
        local state = { locals = _G.__live_mem or {}, globals = {} }
        for k, v in pairs(_G) do
        if type(v) == "number" or type(v) == "string" or type(v) == "boolean" then
            state.globals[k] = v
        end
        end
        
        print("__MEM__" .. serialize(state))
        print("__MEM_USAGE__" .. tostring(collectgarbage("count")))
        user_callback()
    end)
    end
    """

    return interceptor_payload + "\n".join(processed_lines)


def process_file(file_path: Path, destination: Path, file_id: str) -> None:
    """Instruments a lua file or copies assets directly."""
    try:
        with open(file_path, "r", encoding="utf-8") as f_in:
            original_content = f_in.read()

        if file_path.suffix == ".lua":
            original_content = instrument_lua_file(original_content, file_id)

        with open(destination, "w", encoding="utf-8") as f_out:
            f_out.write(original_content)

    except UnicodeDecodeError:
        shutil.copyfile(file_path, destination)


def copy_utils(output_dir: Path, utils_dir: Path) -> None:
    "copies files from the utils folder directly into the new output folder."
    if not utils_dir.exists() or not utils_dir.is_dir():
        return

    for item in utils_dir.iterdir():
        if item.is_file():
            destination = output_dir / item.name
            shutil.copy2(item, destination)
