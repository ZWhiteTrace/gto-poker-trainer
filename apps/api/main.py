"""
GTO Poker Trainer - FastAPI Backend
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import drill, evaluate, ranges

app = FastAPI(
    title="GTO Poker Trainer API",
    description="Backend API for GTO poker training application",
    version="2.0.0",
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev
        "https://gto-trainer.com",  # Production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(drill.router, prefix="/api/drill", tags=["drill"])
app.include_router(evaluate.router, prefix="/api/evaluate", tags=["evaluate"])
app.include_router(ranges.router, prefix="/api/ranges", tags=["ranges"])


@app.get("/")
def root():
    return {"message": "GTO Poker Trainer API v2.0", "status": "ok"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
