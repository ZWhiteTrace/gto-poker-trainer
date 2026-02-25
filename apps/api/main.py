"""
GTO Poker Trainer - FastAPI Backend
"""

import os
import sys
from pathlib import Path

# Add api directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from routers import analyze, drill, evaluate, mtt, postflop, ranges, solver

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

# Initialize Sentry
sentry_dsn = os.getenv("SENTRY_DSN")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[
            StarletteIntegration(),
            FastApiIntegration(),
        ],
        # Performance monitoring
        traces_sample_rate=0.1,
        # Environment
        environment=os.getenv("ENVIRONMENT", "development"),
        # Send PII only if explicitly enabled
        send_default_pii=False,
    )

app = FastAPI(
    title="GTO Poker Trainer API",
    description="Backend API for GTO poker training application",
    version="2.1.0",  # Also update root() below when changing
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev
        "https://grindgto.com",  # Production domain
        "https://www.grindgto.com",  # Production www
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",  # Vercel preview deployments
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
app.include_router(analyze.router, prefix="/api/analyze", tags=["analyze"])
app.include_router(solver.router, prefix="/api/solver", tags=["solver"])


@app.get("/")
def root():
    return {"message": "GTO Poker Trainer API v2.1.0", "status": "ok"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/sentry-debug")
def trigger_error():
    """Debug endpoint to test Sentry integration. Only works in development."""
    if os.getenv("ENVIRONMENT") == "production":
        return {"error": "Not available in production"}
    return {"this": "never happens"}
