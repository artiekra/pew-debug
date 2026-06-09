import uuid
from pathlib import Path
import io
import json
import zipfile
import shutil

from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import Response, JSONResponse

from instrument import process_file, copy_utils

router = APIRouter()


@router.post("/inject/")
async def process_folder(files: list[UploadFile] = File(...)) -> dict[str, str]:
    """Inject debugging code into user level and setup utils."""
    folder_id = str(uuid.uuid4())[:8]
    base_dir = Path("storage")
    
    dump_dir = base_dir / f"{folder_id}_dump"
    usage_dir = base_dir / f"{folder_id}_usage"
    
    utils_dir = Path("utils")
    for d in [dump_dir, usage_dir]:
        levels_dir = d / "levels"
        levels_dir.mkdir(parents=True, exist_ok=True)
        copy_utils(d, utils_dir)

    for file in files:
        safe_path = Path(file.filename.lstrip("/"))
        if ".." in safe_path.parts:
            continue

        temp_file_path = base_dir / f"temp_{uuid.uuid4().hex}_{safe_path.name}"
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_id = str(safe_path.with_suffix("")).replace("/", "_").replace("\\", "_")
        
        # process for dump
        dump_dest = dump_dir / "levels" / safe_path.parent / safe_path.name
        dump_dest.parent.mkdir(parents=True, exist_ok=True)
        process_file(temp_file_path, dump_dest, file_id, safe_path.name, mode="dump")
        
        # process for usage
        usage_dest = usage_dir / "levels" / safe_path.parent / safe_path.name
        usage_dest.parent.mkdir(parents=True, exist_ok=True)
        process_file(temp_file_path, usage_dest, file_id, safe_path.name, mode="usage")
        
        temp_file_path.unlink()

    return {"id": folder_id}


@router.api_route("/play/{folder_id}/custom_levels/get_public_levels_v2", methods=["GET", "POST"])
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


@router.api_route("/play/{folder_id}/custom_levels/get_level_manifest3", methods=["GET", "POST"])
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


@router.api_route("/play/{folder_id}/custom_levels/get_level", methods=["GET", "POST"])
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
        for file_path in sorted(target_dir.rglob("*")):
            if file_path.is_file() and file_path.suffix == ".lua":
                rel_path = file_path.relative_to(target_dir)
                zip_path = f"level/{rel_path.as_posix()}"
                
                zinfo = zipfile.ZipInfo.from_file(file_path, arcname=zip_path)
                zinfo.date_time = (2024, 1, 1, 0, 0, 0)
                zinfo.compress_type = zipfile.ZIP_DEFLATED
                
                with open(file_path, "rb") as f:
                    zip_file.writestr(zinfo, f.read())
                
    zip_bytes = zip_buffer.getvalue()
    
    return Response(content=zip_bytes, media_type="application/zip")
