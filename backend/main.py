import re
import shutil
import uuid
from pathlib import Path
import io
import json
import zipfile

import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response, JSONResponse
from fastapi.staticfiles import StaticFiles


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def serve_dashboard() -> FileResponse:
    """serves the main frontend upload dashboard."""
    return FileResponse("index.htm")


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


def extract_folder_id_from_referer(request: Request) -> str:
    """Parses the session context out of the browser HTTP referer header."""
    referer = request.headers.get("referer", "")
    match = re.search(r"/play/([^/]+)", referer)
    if not match:
        raise HTTPException(status_code=400, detail="Missing session context context")
    return match.group(1)


@app.post("/inject/")
async def process_folder(files: list[UploadFile] = File(...)) -> dict[str, str]:
    """Inject debugging code into user level and setup symlinks."""
    folder_id = str(uuid.uuid4())[:8]
    base_dir = Path("storage")
    output_dir = base_dir / folder_id

    levels_dir = output_dir / "levels"
    levels_dir.mkdir(parents=True, exist_ok=True)

    utils_dir = Path("utils")
    copy_utils(output_dir, utils_dir)

    for file in files:
        safe_path = Path(file.filename.lstrip("/"))
        if ".." in safe_path.parts:
            continue

        nested_dir = levels_dir / safe_path.parent
        nested_dir.mkdir(parents=True, exist_ok=True)

        temp_file_path = nested_dir / f"temp_{safe_path.name}"
        destination = nested_dir / safe_path.name

        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_id = str(safe_path.with_suffix("")).replace("/", "_").replace("\\", "_")
        process_file(temp_file_path, destination, file_id)
        temp_file_path.unlink()

    return {"id": folder_id}


@app.api_route("/play/{folder_id}/custom_levels/get_public_levels_v2", methods=["GET", "POST"])
async def list_levels(folder_id: str) -> JSONResponse:
    "Returns the level list formatted identically to the official go server."
    levels_dir = Path("storage") / folder_id / "levels"
    
    if not levels_dir.exists():
        return JSONResponse(content=[])

    levels = []
    
    for manifest_path in levels_dir.rglob("manifest.json"):
        level_dir = manifest_path.parent
        
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception:
            continue
            
        level_uuid = str(level_dir.relative_to(levels_dir)).replace("\\", "/")
        if level_uuid == ".":
            level_uuid = ""
            
        levels.append({
            "name": manifest.get("name", "Unknown"),
            "author": "Anonymous",
            "account_id": "",
            "level_uuid": level_uuid,
            "date": 0,
            "publish_state": 0,
            "experimental": True,
            "leaderboard_kind": 1 if manifest.get("has_score_leaderboard") else 0,
            "v": 0,
            "diff": 0,
            "featured": False
        })

    return JSONResponse(content=levels)


@app.api_route("/play/{folder_id}/custom_levels/get_level_manifest3", methods=["GET", "POST"])
async def get_manifest(folder_id: str, request: Request) -> JSONResponse:
    "Returns the nested manifest structure expected by the engine."
    level_uuid = request.query_params.get("level_uuid")
    if level_uuid is None and request.method == "POST":
        form_data = await request.form()
        level_uuid = form_data.get("level_uuid")

    if level_uuid is None:
        raise HTTPException(status_code=400, detail="Missing level_uuid parameter")

    target_dir = Path("storage") / folder_id / "levels" / level_uuid
    manifest_path = target_dir / "manifest.json"
    
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="manifest not found")
        
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest_content = json.load(f)
        
    extra = {
        "name": "...",
        "author": "Anonymous",
        "account_id": "",
        "level_uuid": "irrelevant",
        "v": 0,
        "date": 0,
        "publish_state": 0,
        "experimental": True,
        "leaderboard_kind": 0,
        "diff": 0,
        "featured": False
    }
    
    return JSONResponse(content={"manifest": manifest_content, "extra": extra})


@app.api_route("/play/{folder_id}/custom_levels/get_level", methods=["GET", "POST"])
async def get_level_data(folder_id: str, request: Request) -> Response:
    "Streams the level lua files packaged perfectly into an in-memory zip archive."
    level_uuid = request.query_params.get("level_uuid")
    if level_uuid is None and request.method == "POST":
        form_data = await request.form()
        level_uuid = form_data.get("level_uuid")

    if level_uuid is None:
        raise HTTPException(status_code=400, detail="Missing level_uuid parameter")

    target_dir = Path("storage") / folder_id / "levels" / level_uuid
    
    if not target_dir.exists() or not target_dir.is_dir():
        raise HTTPException(status_code=404, detail="level directory missing")
        
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for file_path in target_dir.rglob("*"):
            if file_path.is_file() and file_path.suffix == ".lua":
                rel_path = file_path.relative_to(target_dir)
                zip_path = f"level/{rel_path.as_posix()}"
                zip_file.write(file_path, zip_path)
                
    zip_bytes = zip_buffer.getvalue()
    
    return Response(content=zip_bytes, media_type="application/zip")


# mount the static files LAST so it doesn't swallow our dynamic API routes!
app.mount("/play", StaticFiles(directory="storage"), name="play")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
