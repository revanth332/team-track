import os

from fastapi import FastAPI
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
print(f"Serving frontend from: {DIST_DIR}")

assets_path = os.path.join(DIST_DIR, "assets")
if os.path.isdir(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")


@app.get("/{catchall:path}")
def serve_frontend(catchall: str):
    """
    Catch-all route: 
    If the requested file exists in 'dist' (like favicon.ico), serve it.
    Otherwise, serve 'index.html' so frontend routers (like React Router) can take over.
    """
    # Check if the specific file being requested exists in the dist folder
    file_path = os.path.join(DIST_DIR, catchall)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # If file is not found (e.g., user navigated to /dashboard), serve index.html
    index_path = os.path.join(DIST_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
    
    # Fallback if the 'dist' folder doesn't exist yet
    return {"error": "Frontend build not found. Please put your build files in the 'dist' folder."}