import base64
from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from app.core.logging import logger
from app.schemas.grading import Base64GradingRequest, GradingResponse
from app.services.image_service import image_service, ImageProcessingError
from app.agents.grading_graph import grading_agent_graph
from app.agents.state import GradingAgentState

router = APIRouter()


async def run_grading_pipeline(
    image_data_uri: str,
    crop_name: Optional[str],
    state: Optional[str],
    district: Optional[str],
    quantity_kg: float,
    distance_to_mandi_km: float
) -> GradingResponse:
    """Executes the LangGraph grading agent pipeline and returns validated GradingResponse."""
    initial_state: GradingAgentState = {
        "image_data_uri": image_data_uri,
        "crop_name": crop_name,
        "state": state or "Maharashtra",
        "district": district,
        "quantity_kg": quantity_kg or 100.0,
        "distance_to_mandi_km": distance_to_mandi_km or 15.0,
        "messages": [],
        "detected_crop": None,
        "visual_assessment": None,
        "market_data": None,
        "final_grade_result": None,
        "error": None
    }

    try:
        result_state = grading_agent_graph.invoke(initial_state)
        if result_state.get("error"):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=result_state["error"])
        final_result = result_state.get("final_grade_result")
        if not final_result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Agent pipeline completed without generating a grading decision."
            )
        return GradingResponse(**final_result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during grading pipeline execution: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Grading agent error: {str(e)}"
        )


@router.post(
    "/grade/upload",
    response_model=GradingResponse,
    summary="Grade Crop via Direct Image File Upload (Multipart Form)"
)
async def grade_crop_file_upload(
    file: UploadFile = File(..., description="Crop photograph (JPEG, PNG, WebP)"),
    crop_name: Optional[str] = Form(None, description="Optional crop hint (e.g. Tomato, Onion, Potato)"),
    state: Optional[str] = Form("Maharashtra", description="Indian state for mandi price localization"),
    district: Optional[str] = Form(None, description="District name for nearby APMC mandi"),
    quantity_kg: Optional[float] = Form(100.0, description="Approximate harvest quantity in Kg"),
    distance_to_mandi_km: Optional[float] = Form(15.0, description="Estimated transit distance to mandi in Km")
):
    """
    Upload a crop harvest image directly. The LangGraph agent inspects visual quality via Groq Vision,
    queries live Agmarknet mandi prices via data.gov.in tool, and returns Grade A/B/C, confidence score,
    net payout realization, and sell/hold advice.
    """
    try:
        file_bytes = await file.read()
        data_uri, mime, dimensions = image_service.process_and_encode(file_bytes)
        logger.info(f"Processed uploaded image: mime={mime}, dimensions={dimensions}")
    except ImageProcessingError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Image upload failed: {str(e)}")

    return await run_grading_pipeline(
        image_data_uri=data_uri,
        crop_name=crop_name,
        state=state,
        district=district,
        quantity_kg=quantity_kg or 100.0,
        distance_to_mandi_km=distance_to_mandi_km or 15.0
    )


@router.post(
    "/grade/base64",
    response_model=GradingResponse,
    summary="Grade Crop via Base64 Encoded Image (JSON Payload)"
)
async def grade_crop_base64(payload: Base64GradingRequest):
    """
    Grade a crop by sending a JSON payload containing base64 encoded image data.
    Convenient for PWA/mobile camera capture integrations without multipart handling.
    """
    try:
        raw_b64 = image_service.extract_raw_base64(payload.image_base64)
        image_bytes = base64.b64decode(raw_b64)
        data_uri, mime, dimensions = image_service.process_and_encode(image_bytes)
    except ImageProcessingError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid base64 image data: {str(e)}")

    return await run_grading_pipeline(
        image_data_uri=data_uri,
        crop_name=payload.crop_name,
        state=payload.state,
        district=payload.district,
        quantity_kg=payload.quantity_kg or 100.0,
        distance_to_mandi_km=payload.distance_to_mandi_km or 15.0
    )
