import sys
import os
import json

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from app.services.image_service import image_service
from app.agents.grading_graph import grading_agent_graph
from app.agents.state import GradingAgentState

def main():
    print("=" * 60)
    print("Testing AgriSphere AI Grading Agent on tests/image_sample.webp")
    print("=" * 60)

    image_path = "tests/image_sample.webp"
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    # Step 1: Process and optimize image to Base64 Data URI
    data_uri, mime, dimensions = image_service.process_and_encode(image_bytes)
    print(f"Image processed: {mime}, dimensions: {dimensions}")

    # Step 2: Initialize Agent State
    state: GradingAgentState = {
        "image_data_uri": data_uri,
        "crop_name": None,  # Let the computer vision engine detect the crop
        "state": "Maharashtra",
        "district": "Nashik",
        "quantity_kg": 500.0,
        "distance_to_mandi_km": 15.0,
        "messages": [],
        "detected_crop": None,
        "visual_assessment": None,
        "market_data": None,
        "final_grade_result": None,
        "error": None
    }

    # Step 3: Run LangGraph Agent workflow
    print("\nExecuting LangGraph workflow...")
    result_state = grading_agent_graph.invoke(state)

    final_result = result_state.get("final_grade_result")
    print("\n" + "=" * 60)
    print("AGENT GRADING DECISION:")
    print("=" * 60)
    print(json.dumps(final_result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
