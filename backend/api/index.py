import sys
import os

# Add parent directory to path so we can import server
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from server import app
except Exception as e:
    # If server import fails, create a minimal app that shows the error
    from fastapi import FastAPI
    app = FastAPI()

    error_msg = str(e)

    @app.get("/")
    async def root():
        return {"error": "Server import failed", "detail": error_msg}

    @app.get("/{path:path}")
    async def catch_all(path: str):
        return {"error": "Server import failed", "detail": error_msg}
