import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from routes import router

os.makedirs("storage", exist_ok=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")

app.mount("/api/v1/play", StaticFiles(directory="storage"), name="play")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
