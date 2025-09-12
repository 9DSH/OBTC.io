import asyncio
import logging
from aiohttp import ClientError # Import specific exception for better handling
from deribit_client import DeribitClient
from config import DERIBIT_CLIENT_ID, DERIBIT_CLIENT_SECRET
from db import init_db

# Configure logging at a higher level to avoid excessive output from other libraries
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("main_data_stream")

async def fetch_option_chains_task(client):
    """Fetches and stores option chains, handling its own exceptions."""
    try:
        logger.info("Starting option chains fetch & store...")
        await client.fetch_and_store_option_chains()
        logger.info("Option chains fetched and stored.")
    except ClientError as e:
        logger.error(f"Connection error for option chains: {e}")
    except Exception as e:
        logger.error(f"Unexpected error fetching option chains: {e}")

async def fetch_public_trades_task(client):
    """Fetches and stores public trades, handling its own exceptions."""
    try:
        logger.info("Starting public trades fetch & store...")
        await client.fetch_and_store_public_trades()
        logger.info("Public trades fetched and stored.")
    except ClientError as e:
        logger.error(f"Connection error for public trades: {e}")
    except Exception as e:
        logger.error(f"Unexpected error fetching public trades: {e}")

async def run_continuous(client, interval_seconds=200):
    """Runs data fetching tasks concurrently in a continuous loop."""
    while True:
        logger.info(f"Starting new data fetch cycle. Next cycle in {interval_seconds} seconds.")
        
        # Use asyncio.gather to run tasks concurrently
        tasks_to_run = [
            fetch_option_chains_task(client),
            fetch_public_trades_task(client)
        ]
        
        # The return_exceptions=True is crucial. If a task fails, its exception is returned as a result
        # instead of stopping the entire asyncio.gather call.
        await asyncio.gather(*tasks_to_run, return_exceptions=True)
        
        await asyncio.sleep(interval_seconds)

async def main():
    """Main entry point for the application."""
    init_db()
    client = DeribitClient(DERIBIT_CLIENT_ID, DERIBIT_CLIENT_SECRET)
    await run_continuous(client)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Application shut down by user.")
    except Exception as e:
        logger.error(f"An unhandled error occurred in the main loop: {e}")