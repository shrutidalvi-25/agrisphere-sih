from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage


class GradingAgentState(TypedDict):
    """
    LangGraph Agent state containing image data, metadata, intermediate analysis,
    tool call outputs, and synthesized grading response.
    """
    image_data_uri: str
    crop_name: Optional[str]
    state: Optional[str]
    district: Optional[str]
    quantity_kg: float
    distance_to_mandi_km: float
    
    # LangGraph message history
    messages: List[BaseMessage]
    
    # Intermediate reasoning nodes
    detected_crop: Optional[str]
    visual_assessment: Optional[Dict[str, Any]]
    market_data: Optional[Dict[str, Any]]
    
    # Final synthesized output
    final_grade_result: Optional[Dict[str, Any]]
    error: Optional[str]
