from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import asyncio
import threading
import logging
import os
import sys
import json
import time
from datetime import date, datetime

sys.path.append(os.path.dirname(__file__))
from Fetch_data import Fetching_data
from db import init_db
from main_data_stream import main as data_stream_main
from Technical_Analysis import TechnicalAnalysis
from fetch_btc_price import get_btcusd_price

# ------------------- CONFIG -------------------

fetch_data = Fetching_data()
technical_4h = TechnicalAnalysis("BTC-USD", "4h", "technical_analysis_4h.csv")
technical_daily = TechnicalAnalysis("BTC-USD", "1d", "technical_analysis_daily.csv")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Static path for JSONs
STATIC_PATH = os.path.join(BASE_DIR, "static")
os.makedirs(STATIC_PATH, exist_ok=True)

# Backup path
BACKUP_PATH = os.path.join(BASE_DIR, "backup")
os.makedirs(BACKUP_PATH, exist_ok=True)

TRADES_FILE = "public_trades.json"
CHAINS_FILE = "option_chains.json"

# ------------------- FASTAPI APP -------------------

app = FastAPI(
    title="OptionBTC API",
    description="Backend for fetching BTC and Deribit options data.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://optionbtc.io", "https://www.optionbtc.io"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files at /static
app.mount("/static", StaticFiles(directory=STATIC_PATH), name="static")

# ------------------- HELPERS -------------------

class EnhancedJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)

def save_json(data, filename):
    """Save JSON into static folder and keep only the last backup."""
    try:
        filepath = os.path.join(STATIC_PATH, filename)
        backup_file = os.path.join(BACKUP_PATH, filename)

        # keep one backup
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f_old:
                old_data = f_old.read()
            with open(backup_file, "w", encoding="utf-8") as f_backup:
                f_backup.write(old_data)
            logging.info(f"[BACKUP] Updated {backup_file}")

        # write new file
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False, cls=EnhancedJSONEncoder)
        logging.info(f"[EXPORT] Saved {filename}")
    except Exception as e:
        logging.error(f"Failed to save {filename}: {e}")

def update_json_files():
    try:
        trades = fetch_data.load_public_trades() or []
        chains = fetch_data.fetch_option_chain() or []
        save_json(trades, TRADES_FILE)
        save_json(chains, CHAINS_FILE)
    except Exception as e:
        logging.error(f"Error updating JSON files: {e}")

def start_json_loop():
    while True:
        update_json_files()
        time.sleep(120)  # 4 minutes

def start_data_stream_loop():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(data_stream_main())

# ------------------- STARTUP -------------------

data_thread = None
json_thread = None

@app.on_event("startup")
def startup_event():
    global data_thread, json_thread

    init_db()

    if not data_thread or not data_thread.is_alive():
        data_thread = threading.Thread(target=start_data_stream_loop, daemon=True)
        data_thread.start()
        logging.info("Data stream started.")

    if not json_thread or not json_thread.is_alive():
        json_thread = threading.Thread(target=start_json_loop, daemon=True)
        json_thread.start()
        logging.info("JSON export loop started.")

# ------------------- ROUTES -------------------

@app.get("/deribit/btcprice")
async def get_btc_price():
    try:
        btc, high, low = get_btcusd_price()
        return {"data": {"btcprice": btc, "highest": high, "lowest": low}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analysis/technical")
async def get_technical():
    try:
        return {"data": {
            "4h": technical_4h.get_technical_data(),
            "1d": technical_daily.get_technical_data()
        }}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------- ENTRY -------------------

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
