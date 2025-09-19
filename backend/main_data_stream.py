import asyncio
import logging
from deribit_client import DeribitClient
from config import DERIBIT_CLIENT_ID, DERIBIT_CLIENT_SECRET
from db import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def option_chains_loop(client, interval_seconds=1800):
    """Fetch option chains periodically.every 30 minutes."""
    while True:
        try:
            logger.info("Fetching option chains...")
            await client.fetch_and_store_option_chains()
            logger.info("Option chains fetched successfully.")
        except Exception as e:
            logger.error(f"Error fetching option chains: {e}")
        await asyncio.sleep(interval_seconds)


async def public_trades_loop(client, interval_seconds=1800):
    """Fetch public trades periodically every 30 minutes."""
    while True:
        try:
            logger.info("Fetching public trades...")
            await client.fetch_and_store_public_trades()
            logger.info("Public trades fetched successfully.")
        except Exception as e:
            logger.error(f"Error fetching public trades: {e}")
        await asyncio.sleep(interval_seconds)


async def main():
    init_db()
    client = DeribitClient(DERIBIT_CLIENT_ID, DERIBIT_CLIENT_SECRET)

    # Run both loops concurrently
    option_task = asyncio.create_task(option_chains_loop(client))
    trades_task = asyncio.create_task(public_trades_loop(client))

    await asyncio.gather(option_task, trades_task)


if __name__ == "__main__":
    asyncio.run(main())
