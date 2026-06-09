import shutil
import re
from pathlib import Path
import luaparser.ast as ast
import luaparser.astnodes as astnodes


class Instrumenter:
    def __init__(self, file_id):
        self.file_id = file_id
        self.func_counter = 0
        self.var_counter = 0
        self.all_keys = set()
        
    def get_func_name(self, node):
        func_name = f"anon{self.func_counter}"
        self.func_counter += 1
        if hasattr(node, 'name') and isinstance(node.name, astnodes.Name):
            func_name = node.name.id
        elif hasattr(node, 'name') and isinstance(node.name, astnodes.Index):
            if isinstance(node.name.idx, astnodes.String):
                func_name = node.name.idx.s
            elif isinstance(node.name.idx, astnodes.Name):
                func_name = node.name.idx.id
        elif hasattr(node, 'name') and isinstance(node.name, astnodes.Method):
            func_name = getattr(node.name.name, 'id', 'method')
        return func_name

    def get_new_key(self, func_name_context, var_name):
        self.var_counter += 1
        return f"{self.file_id}:{func_name_context}:{var_name}_{self.var_counter}"

    def process_expressions_for_node(self, node, scope_stack, func_name_context):
        if not isinstance(node, astnodes.Node):
            return
            
        if isinstance(node, (astnodes.Function, astnodes.LocalFunction, astnodes.AnonymousFunction)):
            self.process_function(node, scope_stack)
            return
            
        if isinstance(node, astnodes.Block):
            return
            
        for key in [k for k in node.__dict__.keys() if not k.startswith("_")]:
            val = getattr(node, key)
            if isinstance(val, list):
                for item in val:
                    if isinstance(item, astnodes.Node):
                        self.process_expressions_for_node(item, scope_stack, func_name_context)
            elif isinstance(val, astnodes.Node):
                self.process_expressions_for_node(val, scope_stack, func_name_context)

    def process_function(self, func_node, scope_stack):
        func_name = self.get_func_name(func_node)
        pre_locals = {}
        if hasattr(func_node, 'args'):
            for arg in func_node.args:
                if isinstance(arg, astnodes.Name):
                    key = self.get_new_key(func_name, arg.id)
                    pre_locals[arg.id] = key
                    self.all_keys.add(key)
                    
        func_node.body.body = self.transform_block(func_node.body.body, scope_stack, [], None, func_name, pre_locals)

    def transform_block(self, stmts, scope_stack, active_func_scopes, active_loop_scopes, func_name_context, pre_locals=None):
        current_scope = {}
        if pre_locals:
            current_scope.update(pre_locals)
            
        new_scope_stack = scope_stack + [current_scope]
        new_active_func = active_func_scopes + [current_scope] if active_func_scopes is not None else None
        new_active_loop = active_loop_scopes + [current_scope] if active_loop_scopes is not None else None
        
        new_stmts = []
        
        def escape_key(k):
            return k.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
        
        def add_sever_code(scopes_to_sever):
            return []

        if pre_locals:
            updates = []
            for var_name, key in pre_locals.items():
                updates.append(f'_G.telemetryState["{escape_key(key)}"] = {var_name};')
            if updates:
                new_stmts.extend(ast.parse(" ".join(updates)).body.body)

        for stmt in stmts:
            if isinstance(stmt, astnodes.LocalAssign):
                for target in stmt.targets:
                    if isinstance(target, astnodes.Name):
                        key = self.get_new_key(func_name_context, target.id)
                        current_scope[target.id] = key
                        self.all_keys.add(key)
                
                self.process_expressions_for_node(stmt, new_scope_stack, func_name_context)
                new_stmts.append(stmt)
                
                updates = []
                for target in stmt.targets:
                    if isinstance(target, astnodes.Name):
                        key = current_scope.get(target.id)
                        if key:
                            updates.append(f'_G.telemetryState["{escape_key(key)}"] = {target.id};')
                if updates:
                    new_stmts.extend(ast.parse(" ".join(updates)).body.body)

            elif isinstance(stmt, astnodes.Assign):
                self.process_expressions_for_node(stmt, new_scope_stack, func_name_context)
                new_stmts.append(stmt)
                
                updates = []
                for target in stmt.targets:
                    if isinstance(target, astnodes.Name):
                        key = None
                        for scope in reversed(new_scope_stack):
                            if target.id in scope:
                                key = scope[target.id]
                                break
                        if key:
                            updates.append(f'_G.telemetryState["{escape_key(key)}"] = {target.id};')
                if updates:
                    new_stmts.extend(ast.parse(" ".join(updates)).body.body)

            elif isinstance(stmt, astnodes.LocalFunction):
                key = self.get_new_key(func_name_context, stmt.name.id)
                current_scope[stmt.name.id] = key
                self.all_keys.add(key)
                
                self.process_function(stmt, new_scope_stack)
                new_stmts.append(stmt)
                
                updates = [f'_G.telemetryState["{escape_key(key)}"] = {stmt.name.id};']
                new_stmts.extend(ast.parse(" ".join(updates)).body.body)

            elif isinstance(stmt, astnodes.Function):
                self.process_function(stmt, new_scope_stack)
                new_stmts.append(stmt)

            elif isinstance(stmt, astnodes.Return):
                self.process_expressions_for_node(stmt, new_scope_stack, func_name_context)
                if active_func_scopes is not None:
                    new_stmts.extend(add_sever_code(new_active_func))
                new_stmts.append(stmt)

            elif isinstance(stmt, astnodes.Break):
                if active_loop_scopes is not None:
                    new_stmts.extend(add_sever_code(new_active_loop))
                new_stmts.append(stmt)

            elif isinstance(stmt, astnodes.If):
                self.process_expressions_for_node(stmt.test, new_scope_stack, func_name_context)
                stmt.body.body = self.transform_block(stmt.body.body, new_scope_stack, new_active_func, new_active_loop, func_name_context)
                orelse = stmt.orelse
                while orelse:
                    if isinstance(orelse, astnodes.ElseIf):
                        self.process_expressions_for_node(orelse.test, new_scope_stack, func_name_context)
                        orelse.body.body = self.transform_block(orelse.body.body, new_scope_stack, new_active_func, new_active_loop, func_name_context)
                        orelse = orelse.orelse
                    elif isinstance(orelse, astnodes.Block):
                        orelse.body = self.transform_block(orelse.body, new_scope_stack, new_active_func, new_active_loop, func_name_context)
                        orelse = None
                    else:
                        break
                new_stmts.append(stmt)

            elif isinstance(stmt, astnodes.While):
                self.process_expressions_for_node(stmt.test, new_scope_stack, func_name_context)
                stmt.body.body = self.transform_block(stmt.body.body, new_scope_stack, new_active_func, [], func_name_context)
                new_stmts.append(stmt)

            elif isinstance(stmt, astnodes.Do):
                stmt.body.body = self.transform_block(stmt.body.body, new_scope_stack, new_active_func, new_active_loop, func_name_context)
                new_stmts.append(stmt)

            elif isinstance(stmt, astnodes.Repeat):
                stmt.body.body = self.transform_block(stmt.body.body, new_scope_stack, new_active_func, [], func_name_context)
                self.process_expressions_for_node(stmt.test, new_scope_stack, func_name_context)
                new_stmts.append(stmt)

            elif isinstance(stmt, astnodes.Forin):
                self.process_expressions_for_node(stmt.iter, new_scope_stack, func_name_context)
                pre_locals = {}
                for target in stmt.targets:
                    if isinstance(target, astnodes.Name):
                        key = self.get_new_key(func_name_context, target.id)
                        pre_locals[target.id] = key
                        self.all_keys.add(key)
                stmt.body.body = self.transform_block(stmt.body.body, new_scope_stack, new_active_func, [], func_name_context, pre_locals)
                new_stmts.append(stmt)

            elif isinstance(stmt, astnodes.Fornum):
                self.process_expressions_for_node(stmt.start, new_scope_stack, func_name_context)
                self.process_expressions_for_node(stmt.stop, new_scope_stack, func_name_context)
                if getattr(stmt, 'step', None):
                    self.process_expressions_for_node(stmt.step, new_scope_stack, func_name_context)
                    
                pre_locals = {}
                if isinstance(stmt.target, astnodes.Name):
                    key = self.get_new_key(func_name_context, stmt.target.id)
                    pre_locals[stmt.target.id] = key
                    self.all_keys.add(key)
                stmt.body.body = self.transform_block(stmt.body.body, new_scope_stack, new_active_func, [], func_name_context, pre_locals)
                new_stmts.append(stmt)

            else:
                self.process_expressions_for_node(stmt, new_scope_stack, func_name_context)
                new_stmts.append(stmt)

        if not new_stmts or not isinstance(new_stmts[-1], (astnodes.Return, astnodes.Break)):
            if len(scope_stack) > 0:
                new_stmts.extend(add_sever_code([current_scope]))
        return new_stmts

    def transform(self, tree):
        tree.body.body = self.transform_block(tree.body.body, [], None, None, "global")
        return tree


def instrument_lua_file(code: str, file_id: str, mode: str = "dump") -> str:
    """Parse lua code and inject state mirroring code safely."""
    code_for_ast = re.sub(r'(?<![a-zA-Z_])([0-9]*\.?[0-9]+)fx\b', r'__FX__("\1")', code)
    
    if mode == "dump":
        try:
            tree = ast.parse(code_for_ast)
        except Exception as e:
            print(f"Failed to parse lua code: {e}")
            return code

        instrumenter = Instrumenter(file_id)
        tree = instrumenter.transform(tree)

        def escape_key(k):
            return k.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')

        init_lines = [
            "_G.telemetryState = _G.telemetryState or {}",
        ]
        for key in sorted(instrumenter.all_keys):
            init_lines.append(f"_G.telemetryState[\"{escape_key(key)}\"] = \"#NIL#\"")
            
        interceptor_payload = """
if not _G.__telemetry_installed then
    _G.__baseline_G = {}
    for k, v in pairs(_G) do _G.__baseline_G[k] = true end
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
                            local escaped = val:gsub("\\\\", "\\\\\\\\"):gsub('"', '\\\\"'):gsub("\\n", "\\\\n"):gsub("\\r", "")
                            return '"' .. escaped .. '"'
                        elseif t == "number" or t == "boolean" then
                            return tostring(val)
                        elseif t == "nil" then
                            return "null"
                        elseif t == "function" or t == "userdata" or t == "thread" then
                            return '"' .. tostring(val) .. '"'
                        elseif t == "table" then
                            if seen[val] then return nil end
                            seen[val] = true
                            
                            local res = {}
                            for k, v in pairs(val) do
                                if type(k) == "string" or type(k) == "number" or type(k) == "boolean" then
                                    local key_str
                                    if type(k) == "string" then
                                        key_str = '"' .. k:gsub("\\\\", "\\\\\\\\"):gsub('"', '\\\\"'):gsub("\\n", "\\\\n"):gsub("\\r", "") .. '"'
                                    else
                                        key_str = '"' .. tostring(k):gsub('"', '\\\\"') .. '"'
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
                            for part in k:gmatch("[^:]+") do table.insert(parts, part) end
                            if #parts >= 4 then parts[4] = parts[4]:gsub("_%d+$", "") end
                            
                            local current = dump.Locals
                            for i = 1, #parts - 1 do
                                local p = parts[i]
                                if type(current[p]) ~= "table" then current[p] = {} end
                                current = current[p]
                            end
                            current[parts[#parts]] = v
                        end
                    end
                    for k, v in pairs(_G) do
                        if not _G.__baseline_G[k] and k ~= "telemetryState" and type(k) == "string" and not k:match("^__") then
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
"""

        out_code = ast.to_lua_source(tree)
        out_code = re.sub(r'__FX__\("([0-9]*\.?[0-9]+)"\)', r'\1fx', out_code)
        
        init_code = "\n".join(init_lines)
        return init_code + "\n" + interceptor_payload + "\n" + out_code
    
    elif mode == "usage":
        interceptor_payload = """
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
                    local adjusted_mem = current_mem - (_G.__telemetryStaticOffset or 0)
                    print("__MEM_USAGE__", adjusted_mem)
                end
            end)
        end
    end
end
"""
        return interceptor_payload + "\n" + code


def process_file(file_path: Path, destination: Path, file_id: str, name: str, mode: str = "dump") -> None:
    """Instruments a lua file or copies assets directly."""
    try:
        with open(file_path, "r", encoding="utf-8") as f_in:
            original_content = f_in.read()

        if file_path.suffix == ".lua":
            if name == "level.lua":
                original_content = 'print("__LEVEL_START__")\n' + original_content
            original_content = instrument_lua_file(original_content, file_id, mode)

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
