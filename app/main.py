from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import logger
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup lifecycle
    logger.info("====================================================")
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Groq Model: {settings.GROQ_VISION_MODEL}")
    logger.info(f"data.gov.in Resource: {settings.AGMARKNET_RESOURCE_ID}")
    logger.info("====================================================")
    yield
    # Shutdown lifecycle
    logger.info("Shutting down AgriSphere AI Grading Agent...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
# AgriSphere — AI Crop Quality Analysis & Grading Microservice

Smart India Hackathon 2026: Multimodal LangGraph Agent for precision crop quality assessment,
live Agmarknet mandi price discovery, and confidence-aware net realization estimation.

## Key Features
- **Multimodal AI Grading**: Visual inspection (ripeness, color uniformity, defect percentage) using Groq Vision.
- **LangGraph `@tool` Integration**: Live Agmarknet APMC mandi prices retrieved directly from `data.gov.in`.
- **Confidence-Aware Grades**: Standardized Grade A (Export/Premium), Grade B (Standard Mandi), or Grade C (Processing).
- **Net Realisation Breakdown**: Payout computation factoring in local mandi transport costs and cess.
- **Sell Now vs Hold Advice**: Decision support to prevent distress selling.
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for Frontend integration (React/Vite/Next.js PWAs)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc),
            "path": request.url.path
        }
    )

# Root endpoint
@app.get("/", summary="Root Health / Info")
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "endpoints": {
            "grade_upload": f"{settings.API_V1_PREFIX}/grade/upload",
            "grade_base64": f"{settings.API_V1_PREFIX}/grade/base64",
            "mandi_prices": f"{settings.API_V1_PREFIX}/prices",
            "health": f"{settings.API_V1_PREFIX}/health"
        }
    }

# Register V1 API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
