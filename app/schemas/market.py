from typing import List, Optional
from pydantic import BaseModel, Field

class MandiPriceRecord(BaseModel):
    state: str = Field(..., description="State name")
    district: str = Field(..., description="District name")
    market: str = Field(..., description="APMC Mandi market name")
    commodity: str = Field(..., description="Commodity/Crop name")
    variety: Optional[str] = Field("Standard", description="Commodity variety")
    arrival_date: str = Field(..., description="Reporting date of arrival (DD/MM/YYYY)")
    min_price_quintal: float = Field(..., description="Minimum price per quintal in INR")
    max_price_quintal: float = Field(..., description="Maximum price per quintal in INR")
    modal_price_quintal: float = Field(..., description="Modal (most frequent) price per quintal in INR")
    modal_price_kg: float = Field(..., description="Modal price per kg in INR")


class MarketDataSummary(BaseModel):
    commodity: str
    state: Optional[str] = None
    district: Optional[str] = None
    total_records: int
    avg_modal_price_kg: float
    min_price_kg: float
    max_price_kg: float
    records: List[MandiPriceRecord] = []
    source: str = Field("data.gov.in (Agmarknet)", description="Data source attribution")
    is_live: bool = Field(True, description="Whether live API data or cached/calibrated benchmark")


