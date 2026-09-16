from fastapi import APIRouter
from app.api.v1.endpoints.grading import router as grading_router
from app.api.v1.endpoints.prices import router as prices_router
from app.api.v1.endpoints.health import router as health_router

api_router = APIRouter()

# Register sub-routers
api_router.include_router(health_router, tags=["Health & Status"])
api_router.include_router(grading_router, tags=["AI Crop Grading"])
api_router.include_router(prices_router, tags=["Agmarknet Mandi Prices"])
