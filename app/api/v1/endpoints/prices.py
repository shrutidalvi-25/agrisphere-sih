from typing import Optional
from fastapi import APIRouter, Query
from app.schemas.market import MarketDataSummary
from app.services.market_service import market_service

router = APIRouter()


@router.get("/prices", response_model=MarketDataSummary, summary="Query Real-Time Agmarknet Mandi Prices")
async def get_mandi_prices(
    commodity: str = Query(..., description="Crop name (e.g., Tomato, Onion, Potato, Banana, Grapes, Chilli)"),
    state: Optional[str] = Query("Maharashtra", description="State in India (e.g., Maharashtra, Karnataka, Gujarat)"),
    district: Optional[str] = Query(None, description="District name (e.g., Nashik, Pune, Solapur)"),
    limit: int = Query(10, ge=1, le=50, description="Max number of market records to return")
):
    """
    Retrieves live or recent mandi market price records from data.gov.in (Agmarknet)
    for a specific agricultural commodity, calculating average modal, min, and max rates in INR/Kg.
    """
    return await market_service.fetch_agmarknet_prices(
        commodity=commodity,
        state=state,
        district=district,
        limit=limit
    )
