from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class GradeCategory(str, Enum):
    A = "A"  # High Quality - Premium / Export / Modern Retail
    B = "B"  # Medium Quality - Standard Mandi Wholesale
    C = "C"  # Low Quality - Local Processing / Distress Risk


class SellAdvice(str, Enum):
    SELL_NOW = "SELL_NOW"
    HOLD_HARVEST = "HOLD_HARVEST"
    IMMEDIATE_LIQUIDATION = "IMMEDIATE_LIQUIDATION"


class VisualQualityFactors(BaseModel):
    ripeness_stage: str = Field(..., description="E.g., Unripe, Optimal Ripe, Overripe")
    color_uniformity: str = Field(..., description="Uniformity of color across surface")
    surface_defects: List[str] = Field(default_factory=list, description="Observed blemishes, spots, bruising, cuts")
    estimated_defect_area_pct: float = Field(..., description="Estimated percentage of surface area with defects (0-100%)")
    size_uniformity: str = Field(..., description="E.g., High, Medium, Irregular")
    freshness_score: float = Field(..., description="Freshness assessment from 1 to 10")


class NetRealisationBreakdown(BaseModel):
    base_modal_price_kg: float = Field(..., description="Live benchmark market modal price in INR/Kg")
    quality_adjusted_price_kg: float = Field(..., description="Price adjusted for Grade A (+15-25%), B (0%), C (-25-40%)")
    est_transport_cost_kg: float = Field(0.0, description="Estimated freight per kg based on distance")
    est_mandi_cess_kg: float = Field(0.0, description="APMC mandi cess / handling charge per kg")
    net_realisation_payout_kg: float = Field(..., description="Actual estimated in-hand payout per kg to farmer")
    net_realisation_quintal: float = Field(..., description="Net payout scaled to 1 Quintal (100 kg)")


class GradingResponse(BaseModel):
    crop_name: str = Field(..., description="Detected or verified crop name (e.g., Tomato, Onion)")
    grade: GradeCategory = Field(..., description="Quality Grade: A, B, or C")
    grade_title: str = Field(..., description="Descriptive title: e.g. Grade A - Premium Quality")
    confidence_score: float = Field(..., description="Confidence percentage of the grading (0 - 100%)")
    visual_assessment: VisualQualityFactors
    market_context: Optional[dict] = Field(None, description="Summary of live data.gov.in Agmarknet prices used")
    net_realisation: NetRealisationBreakdown
    sell_or_hold: SellAdvice
    advice_summary: str = Field(..., description="Actionable rationale for the farmer (sell window, buyer matching advice)")
    actionable_recommendations: List[str] = Field(default_factory=list, description="Step-by-step practical tips for the farmer/FPO")
    fpo_pooling_suggested: bool = Field(True, description="Whether this lot should be pooled with nearby lots for bulk buyer bargaining")


class Base64GradingRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded string of the crop image (JPEG/PNG/WebP)")
    crop_name: Optional[str] = Field(None, description="Optional crop name hint (e.g. Tomato, Onion, Potato)")
    state: Optional[str] = Field("Maharashtra", description="State name for mandi price lookup")
    district: Optional[str] = Field(None, description="District name for local mandi price lookup")
    quantity_kg: Optional[float] = Field(100.0, description="Approximate quantity in Kg")
    distance_to_mandi_km: Optional[float] = Field(15.0, description="Approximate distance to nearest mandi in Km")
