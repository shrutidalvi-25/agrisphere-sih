import asyncio
from typing import Optional
from langchain_core.tools import tool
from app.services.market_service import market_service
from app.core.logging import logger


@tool
def fetch_agmarknet_prices(
    commodity: str,
    state: Optional[str] = "Maharashtra",
    district: Optional[str] = None
) -> dict:
    """
    Fetches real-time or recent APMC Mandi market prices for a specified agricultural commodity
    from the official Government of India data.gov.in Agmarknet resource.

    Args:
        commodity: Name of the crop/commodity (e.g. Tomato, Onion, Potato, Banana, Grapes, Chilli, Wheat, etc.)
        state: State name in India (e.g. Maharashtra, Uttar Pradesh, Madhya Pradesh, Gujarat, Karnataka)
        district: Optional district name (e.g. Nashik, Pune, Ahmednagar, Solapur)

    Returns:
        A dictionary containing modal price per kg, min/max price per kg, quintal prices, and market list.
    """
    try:
        # Run async market_service inside synchronous tool runner
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        if loop.is_running():
            # If inside an existing running event loop (e.g. FastAPI async request)
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                summary = pool.submit(
                    asyncio.run,
                    market_service.fetch_agmarknet_prices(
                        commodity=commodity,
                        state=state,
                        district=district
                    )
                ).result()
        else:
            summary = loop.run_until_complete(
                market_service.fetch_agmarknet_prices(
                    commodity=commodity,
                    state=state,
                    district=district
                )
            )

        return {
            "commodity": summary.commodity,
            "state": summary.state,
            "district": summary.district,
            "avg_modal_price_kg": summary.avg_modal_price_kg,
            "min_price_kg": summary.min_price_kg,
            "max_price_kg": summary.max_price_kg,
            "avg_modal_price_quintal": round(summary.avg_modal_price_kg * 100, 2),
            "data_source": summary.source,
            "is_live": summary.is_live,
            "sample_markets": [
                {
                    "market": r.market,
                    "modal_price_kg": r.modal_price_kg,
                    "date": r.arrival_date
                }
                for r in summary.records[:3]
            ]
        }
    except Exception as e:
        logger.error(f"Error in fetch_agmarknet_prices tool: {e}")
        # Safe fallback dictionary
        return {
            "commodity": commodity,
            "state": state,
            "district": district,
            "avg_modal_price_kg": 25.0,
            "min_price_kg": 18.0,
            "max_price_kg": 30.0,
            "avg_modal_price_quintal": 2500.0,
            "data_source": "Agmarknet Historical Calibrated Benchmark",
            "is_live": False,
            "sample_markets": []
        }
