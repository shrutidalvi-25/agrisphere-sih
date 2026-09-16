import io
import base64
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.services.image_service import image_service
from app.tools.agmarknet_tool import fetch_agmarknet_prices
from app.agents.grading_graph import grading_agent_graph
from app.agents.state import GradingAgentState


client = TestClient(app)


def generate_sample_crop_image_bytes(color: str = "red", size: tuple = (200, 200)) -> bytes:
    """Generates a simple synthetic crop image in memory for testing."""
    img = Image.new("RGB", size, color=color)
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG")
    return buffer.getvalue()


def test_health_endpoint():
    """Verify health endpoint returns valid status."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "vision_model" in data


def test_mandi_prices_endpoint():
    """Verify mandi prices endpoint returns structured market records."""
    response = client.get("/api/v1/prices?commodity=Tomato&state=Maharashtra")
    assert response.status_code == 200
    data = response.json()
    assert data["commodity"] == "Tomato"
    assert "avg_modal_price_kg" in data
    assert data["avg_modal_price_kg"] > 0
    assert len(data["records"]) > 0


def test_image_service_processing():
    """Verify image processing and base64 data URI conversion."""
    raw_bytes = generate_sample_crop_image_bytes(color="green")
    data_uri, mime, dimensions = image_service.process_and_encode(raw_bytes)
    assert data_uri.startswith("data:image/jpeg;base64,")
    assert mime == "image/jpeg"
    assert dimensions == (200, 200)


def test_agmarknet_langgraph_tool():
    """Verify LangGraph @tool fetch_agmarknet_prices functions properly."""
    result = fetch_agmarknet_prices.invoke({
        "commodity": "Onion",
        "state": "Maharashtra",
        "district": "Nashik"
    })
    assert result["commodity"] == "Onion"
    assert "avg_modal_price_kg" in result
    assert result["avg_modal_price_kg"] > 0
    assert "sample_markets" in result


def test_langgraph_agent_execution():
    """Verify full end-to-end execution of the LangGraph StateGraph."""
    raw_bytes = generate_sample_crop_image_bytes(color="red")
    data_uri, _, _ = image_service.process_and_encode(raw_bytes)

    state: GradingAgentState = {
        "image_data_uri": data_uri,
        "crop_name": "Tomato",
        "state": "Maharashtra",
        "district": "Nashik",
        "quantity_kg": 250.0,
        "distance_to_mandi_km": 12.0,
        "messages": [],
        "detected_crop": None,
        "visual_assessment": None,
        "market_data": None,
        "final_grade_result": None,
        "error": None
    }

    result_state = grading_agent_graph.invoke(state)
    assert "final_grade_result" in result_state
    final = result_state["final_grade_result"]
    assert final["grade"] in ["A", "B", "C"]
    assert 0.0 <= final["confidence_score"] <= 100.0
    assert "net_realisation" in final
    assert final["net_realisation"]["net_realisation_payout_kg"] > 0


def test_base64_grading_endpoint():
    """Verify POST /api/v1/grade/base64 endpoint with synthetic image payload."""
    raw_bytes = generate_sample_crop_image_bytes(color="red")
    b64_str = base64.b64encode(raw_bytes).decode("utf-8")

    payload = {
        "image_base64": b64_str,
        "crop_name": "Tomato",
        "state": "Maharashtra",
        "district": "Pune",
        "quantity_kg": 500.0,
        "distance_to_mandi_km": 20.0
    }

    response = client.post("/api/v1/grade/base64", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["grade"] in ["A", "B", "C"]
    assert "confidence_score" in data
    assert "visual_assessment" in data
    assert "net_realisation" in data
    assert "sell_or_hold" in data
