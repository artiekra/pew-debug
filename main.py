import shutil
import uuid
from pathlib import Path

import uvicorn
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def process_file(file_path: Path, target_dir: Path) -> None:
    """prepends custom text to a text file or copies binary files as-is."""
    final_name = file_path.name.replace("temp_", "", 1)
    destination = target_dir / final_name
    
    header_text = "/* this file was automatically processed! */\n\n"
    
    try:
        with open(file_path, "r", encoding="utf-8") as f_in:
            original_content = f_in.read()
            
        with open(destination, "w", encoding="utf-8") as f_out:
            f_out.write(header_text + original_content)
            
    except UnicodeDecodeError:
        shutil.copyfile(file_path, destination)


def create_symlinks(output_dir: Path, utils_dir: Path) -> None:
    """links files from the utils folder directly into the new output folder."""
    if not utils_dir.exists() or not utils_dir.is_dir():
        return
        
    for item in utils_dir.iterdir():
        if item.is_file():
            symlink_path = output_dir / item.name
            symlink_path.symlink_to(item.resolve())


@app.post("/inject/")
async def process_folder(files: list[UploadFile] = File(...)) -> dict[str, str]:
    """inject debugging code into user level and setup symlinks."""
    folder_id = str(uuid.uuid4())
    base_dir = Path("storage")
    output_dir = base_dir / folder_id
    
    levels_dir = output_dir / "levels"
    levels_dir.mkdir(parents=True, exist_ok=True)
    
    utils_dir = Path("utils")
    create_symlinks(output_dir, utils_dir)
    
    for file in files:
        safe_path = Path(file.filename.lstrip("/"))
        
        if ".." in safe_path.parts:
            continue
            
        nested_dir = levels_dir / safe_path.parent
        nested_dir.mkdir(parents=True, exist_ok=True)
        
        temp_file_path = nested_dir / f"temp_{safe_path.name}"
        
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        process_file(temp_file_path, nested_dir)
        temp_file_path.unlink()
        
    return {"id": folder_id}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
