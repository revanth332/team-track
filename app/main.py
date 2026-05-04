import os

from fastapi import FastAPI, HTTPException
from app.api.v1.router import api_router
from app.core.config import settings
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION
)

# Set up CORS (Important for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

DIST_DIR = os.path.join(os.path.dirname(__file__), "dist")

assets_path = os.path.join(DIST_DIR, "assets")
if os.path.isdir(assets_path):
    # StaticFiles handles caching for assets automatically (which is good)
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

@app.get("/{catchall:path}")
def serve_frontend(catchall: str):
    # 1. If the specific file being requested exists, serve it
    file_path = os.path.join(DIST_DIR, catchall)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # 2. Prevent serving index.html for missing static files (.js, .css, .png, etc.)
    # If the URL has an extension, it was likely an old asset request. 
    # Returning a 404 prevents the browser from trying to parse HTML as JavaScript.
    if "." in catchall.split("/")[-1]:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # 3. Serve index.html with NO CACHE headers
    index_path = os.path.join(DIST_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(
            index_path,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            }
        )
    
    # Fallback
    return {"error": "Frontend build not found. Please put your build files in the 'dist' folder."}