from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio
import threading
import logging
import os
import sys
sys.path.append(os.path.dirname(__file__))  # Ensure local path
from Fetch_data import Fetching_data
from db import init_db
from main_data_stream import main as data_stream_main
from Technical_Analysis import TechnicalAnalysis
from fetch_btc_price import get_btcusd_price


fetch_data = Fetching_data()
technical_4h = TechnicalAnalysis("BTC-USD", "4h" ,'technical_analysis_4h.csv') 
technical_daily = TechnicalAnalysis("BTC-USD", "1d" ,'technical_analysis_daily.csv') 
technical_w = TechnicalAnalysis("BTC-USD", "1w" ,'technical_analysis_w.csv') 

app = FastAPI(
    title="OptionBTC API",
    description="Backend for fetching BTC and Deribit options data.",
    version="1.0.0"
)

# Enable CORS for your frontend app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://optionbtc.io", "https://www.optionbtc.io"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Thread tracker
data_stream_thread = None

def start_data_fetch_loop():
    """Run the main_data_stream.main() inside a background thread with its own event loop."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(data_stream_main())

@app.on_event("startup")
def startup_event():
    global data_stream_thread

    init_db()

    if data_stream_thread is None or not data_stream_thread.is_alive():
        data_stream_thread = threading.Thread(target=start_data_fetch_loop, daemon=True)
        data_stream_thread.start()
        logging.info("Background data fetcher started.")

@app.get("/deribit/btcprice")
async def get_btc_price_today():
    try:
        btc_price , highest, lowest = get_btcusd_price()
        return {
            "data": {
                "btcprice": btc_price,
                "highest": highest,
                "lowest": lowest
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/option_chains/latest")
async def option_chains():
    try:
        chains = fetch_data.fetch_option_chain()
        return {"data": chains}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/public_trades/latest")
async def public_trades():
    try:
        trades = fetch_data.load_public_trades()
        if not trades:  # empty list check
            return {"data": []}
        return {"data": trades}  # already a list of dicts
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    

@app.get("/analysis/technical")
async def technical_analysis():
    try:
        analytics_insight_4h = technical_4h.get_technical_data()
        analytics_insight_daily = technical_daily.get_technical_data()
        return {
            "data": {
                "4h": analytics_insight_4h,
                "1d": analytics_insight_daily
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
