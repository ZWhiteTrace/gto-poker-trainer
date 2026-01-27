"""
GTO Poker Trainer - FastAPI Backend
"""
import sys
from pathlib import Path

# Add api directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import drill, evaluate, ranges, mtt, postflop

app = FastAPI(
    title="GTO Poker Trainer API",
    description="Backend API for GTO poker training application",
    version="2.1.0",
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev
        "https://gto-trainer.com",  # Production domain
        "https://*.vercel.app",  # Vercel preview deployments
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",  # Allow all Vercel subdomains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(drill.router, prefix="/api/drill", tags=["drill"])
app.include_router(evaluate.router, prefix="/api/evaluate", tags=["evaluate"])
app.include_router(ranges.router, prefix="/api/ranges", tags=["ranges"])
app.include_router(mtt.router, prefix="/api/mtt", tags=["mtt"])
app.include_router(postflop.router, prefix="/api/postflop", tags=["postflop"])


@app.get("/")
def root():
    return {"message": "GTO Poker Trainer API v2.0", "status": "ok"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
