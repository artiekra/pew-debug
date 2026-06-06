import shutil
import re
from pathlib import Path
import luaparser.ast as ast
import luaparser.astnodes as astnodes


def instrument_lua_file(code: str, file_id: str) -> str:
    """Parse lua code and inject state mirroring code safely."""
    code_for_ast = re.sub(r'(?<![a-zA-Z_])([0-9]*\.?[0-9]+)fx\b', r'__FX__("\1")', code)
    try:
        tree = ast.parse(code_for_ast)
    except Exception as e:
        print(f"Failed to parse lua code: {e}")
        return code

    def get_locals(func_node):
        locals_set = set()
        if hasattr(func_node, 'args'):
            for arg in func_node.args:
                if isinstance(arg, astnodes.Name):
                    locals_set.add(arg.id)
                elif isinstance(arg, astnodes.Varargs):
                    locals_set.add('arg')
        
        def visit(node):
            if isinstance(node, (astnodes.Function, astnodes.LocalFunction, astnodes.AnonymousFunction)):
                return
            if isinstance(node, astnodes.LocalAssign):
                for target in node.targets:
                    if isinstance(target, astnodes.Name):
                        locals_set.add(target.id)
            elif isinstance(node, astnodes.Forin):
                for target in node.targets:
                    if isinstance(target, astnodes.Name):
                        locals_set.add(target.id)
            elif isinstance(node, astnodes.Fornum):
                if isinstance(node.target, astnodes.Name):
                    locals_set.add(node.target.id)
            
            if isinstance(node, astnodes.Node):
                for key in [k for k in node.__dict__.keys() if not k.startswith("_")]:
                    val = getattr(node, key)
                    if isinstance(val, list):
                        for item in val:
                            if isinstance(item, astnodes.Node):
                                visit(item)
                    elif isinstance(val, astnodes.Node):
                        visit(val)
                        
        visit(func_node.body)
        return list(locals_set)

    def inject_sync(block_node, inject_cmd_str):
        new_body = []
        for stmt in block_node.body:
            if isinstance(stmt, astnodes.Return):
                new_body.extend(ast.parse(inject_cmd_str).body.body)
                new_body.append(stmt)
            elif isinstance(stmt, astnodes.If):
                inject_sync(stmt.body, inject_cmd_str)
                orelse_node = stmt.orelse
                while orelse_node:
                    if isinstance(orelse_node, astnodes.ElseIf):
                        inject_sync(orelse_node.body, inject_cmd_str)
                        orelse_node = orelse_node.orelse
                    elif isinstance(orelse_node, astnodes.Block):
                        inject_sync(orelse_node, inject_cmd_str)
                        orelse_node = None
                    else:
                        break
                new_body.append(stmt)
            elif isinstance(stmt, (astnodes.While, astnodes.Forin, astnodes.Fornum, astnodes.Do)):
                inject_sync(stmt.body, inject_cmd_str)
                new_body.append(stmt)
            elif isinstance(stmt, astnodes.Repeat):
                inject_sync(stmt.body, inject_cmd_str)
                new_body.append(stmt)
            else:
                new_body.append(stmt)
        block_node.body = new_body

    functions = []
    for node in ast.walk(tree):
        if isinstance(node, (astnodes.Function, astnodes.LocalFunction, astnodes.AnonymousFunction)):
            functions.append(node)

    for node in functions:
        func_name = "anon"
        if hasattr(node, 'name') and isinstance(node.name, astnodes.Name):
            func_name = node.name.id
        elif hasattr(node, 'name') and isinstance(node.name, astnodes.Index):
            if isinstance(node.name.idx, astnodes.String):
                func_name = node.name.idx.s
            elif isinstance(node.name.idx, astnodes.Name):
                func_name = node.name.idx.id
        elif hasattr(node, 'name') and isinstance(node.name, astnodes.Method):
            func_name = getattr(node.name.name, 'id', 'method')
            
        local_vars = get_locals(node)
        if not local_vars:
            continue
            
        sync_parts = [f"{v} = {v}" for v in local_vars]
        sync_str = ", ".join(sync_parts)
        inject_cmd = f"  _G.__live_mem = _G.__live_mem or {{}}; _G.__live_mem[\"{file_id}_{func_name}\"] = {{{sync_str}}}"
        
        inject_sync(node.body, inject_cmd)
        
        if not node.body.body or not isinstance(node.body.body[-1], astnodes.Return):
            node.body.body.extend(ast.parse(inject_cmd).body.body)

    interceptor_payload = """
    local __orig_update = pewpew.add_update_callback
    pewpew.add_update_callback = function(user_callback)
    local __tick_count = 0
    __orig_update(function()
        __tick_count = __tick_count + 1
        local is_report_tick = (__tick_count % 6 == 0)
        
        local mem_usage = nil
        if is_report_tick then
            collectgarbage("collect")
            mem_usage = collectgarbage("count")
        end
        
        user_callback()
        
        if is_report_tick then
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
            print("__MEM_USAGE__" .. tostring(mem_usage))
        end
    end)
    end
    """
    
    out_code = ast.to_lua_source(tree)
    out_code = re.sub(r'__FX__\("([0-9]*\.?[0-9]+)"\)', r'\1fx', out_code)
    return interceptor_payload + "\n" + out_code


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
