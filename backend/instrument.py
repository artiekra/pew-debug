import shutil
import re
from pathlib import Path
import luaparser.ast as ast

from instrumenter import Instrumenter


def read_lua_file(filename: str) -> str:
    path = Path(__file__).parent / "lua" / filename
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


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
        # pre-initialize space for all variables
        # for key in sorted(instrumenter.all_keys):
        #     init_lines.append(f"_G.telemetryState[\"{escape_key(key)}\"] = \"#NIL#\"")
            
        interceptor_payload = read_lua_file("dump_interceptor.lua")

        out_code = ast.to_lua_source(tree)
        out_code = re.sub(r'__FX__\("([0-9]*\.?[0-9]+)"\)', r'\1fx', out_code)
        
        init_code = "\n".join(init_lines)
        return init_code + "\n" + interceptor_payload + "\n" + out_code
    
    elif mode == "usage":
        interceptor_payload = read_lua_file("usage_interceptor.lua")
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
            
            if name == "level.lua":
                notice_content = read_lua_file("notice.lua")
                original_content = notice_content + '\n' + original_content

        with open(destination, "w", encoding="utf-8") as f_out:
            f_out.write(original_content)

    except UnicodeDecodeError:
        shutil.copyfile(file_path, destination)


def copy_utils(output_dir: Path, utils_dir: Path) -> None:
    """Copies files from the utils folder directly into the new output folder."""
    if not utils_dir.exists() or not utils_dir.is_dir():
        return

    for item in utils_dir.iterdir():
        if item.is_file():
            destination = output_dir / item.name
            shutil.copy2(item, destination)
