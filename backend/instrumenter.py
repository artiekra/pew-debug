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
