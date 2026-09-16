from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/health", summary="Service Health & Configuration Status")
async def health_check():
    """
    Returns the operational status of the AgriSphere AI Grading Agent microservice,
    including configuration readiness for Groq Vision and data.gov.in Agmarknet.
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "groq_configured": bool(settings.GROQ_API_KEY and settings.GROQ_API_KEY != "gsk_your_groq_api_key_here"),
        "agmarknet_configured": bool(settings.effective_agmarknet_api_key and settings.effective_agmarknet_api_key not in ("579b464db66ec23bdd000001your_api_key_here", "your_data_gov_in_api_key_here", "your_agmarknet_api_key_here")),
        "vision_model": settings.GROQ_VISION_MODEL,
        "resource_id": settings.AGMARKNET_RESOURCE_ID,
        "environment": settings.ENVIRONMENT
    }
