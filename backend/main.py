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


fetch_data = Fetching_data()

app = FastAPI(
    title="OptionBTC API",
    description="Backend for fetching BTC and Deribit options data.",
    version="1.0.0"
)

# Enable CORS for your frontend app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    
@app.get("/public_trades/available_dates")
async def get_available_dates():
    try:
        dates = fetch_data.fetch_available_dates()
        return {"dates": dates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/public_trades/strike_prices")   
def get_strike_prices():
    try:
        prices = fetch_data.fetch_available_strike_prices()
        return {"strike_prices": prices}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    



if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
