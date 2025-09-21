import asyncio
import logging
import requests
import aiohttp
from datetime import datetime, timedelta, time
from concurrent.futures import ThreadPoolExecutor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import VotingClassifier
import xgboost as xgb
import lightgbm as lgb
from skopt import BayesSearchCV
from sklearn.utils import resample
import pandas as pd
import re
from sqlalchemy import or_ , and_, func

from db import SessionLocal, OptionChain, PublicTrade, SystemState
from config import DERIBIT_CLIENT_ID, DERIBIT_CLIENT_SECRET, MAX_CONCURRENT_REQUESTS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DeribitClient:
    def __init__(self, client_id=DERIBIT_CLIENT_ID, client_secret=DERIBIT_CLIENT_SECRET):
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None
        self.session = requests.Session()
        self.executor = ThreadPoolExecutor(max_workers=5)
        self.semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
        self.aiohttp_session = None  # Persistent session

    def authenticate(self):
        if self.access_token:
            return self.access_token
        url = 'https://www.deribit.com/api/v2/public/auth'
        params = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'grant_type': 'client_credentials'
        }
        try:
            resp = self.session.get(url, params=params)
            resp.raise_for_status()
            self.access_token = resp.json().get('result', {}).get('access_token')
            if not self.access_token:
                logger.error("Authentication failed: No access token received")
            return self.access_token
        except requests.RequestException as e:
            logger.error(f"Authentication error: {e}")
            return None

    def clean_trade_id(self, block_trade_id):
        if not block_trade_id:
            return None
        cleaned = re.sub(r"[,\s]", "", block_trade_id).upper()
        cleaned = re.sub(r"-{2,}", "-", cleaned)
        return cleaned

    async def _get_aiohttp_session(self):
        if self.aiohttp_session is None:
            token = self.authenticate()
            headers = {'Authorization': f'Bearer {token}'} if token else {}
            self.aiohttp_session = aiohttp.ClientSession(headers=headers)
        return self.aiohttp_session

    async def fetch_option_instruments(self, currency='BTC'):
        session_http = await self._get_aiohttp_session()
        url = 'https://www.deribit.com/api/v2/public/get_instruments'
        params = {'currency': currency, 'kind': 'option', 'expired': 'false'}
        try:
            async with session_http.get(url, params=params) as resp:
                resp.raise_for_status()
                result = await resp.json()
                instruments = result.get('result', [])
                logger.info(f"Fetched {len(instruments)} option instruments.")
                return instruments
        except Exception as e:
            logger.error(f"Error fetching option instruments: {e}")
            return []

    async def fetch_order_book(self, instrument_name):
        session_http = await self._get_aiohttp_session()
        url = 'https://www.deribit.com/api/v2/public/get_order_book'
        params = {'instrument_name': instrument_name}

        async with self.semaphore:
            for attempt in range(3):
                try:
                    async with session_http.get(url, params=params) as resp:
                        if resp.status == 429:
                            await asyncio.sleep(5)
                            continue
                        resp.raise_for_status()
                        data = await resp.json()
                        return data.get('result', {})
                except Exception as e:
                    logger.error(f"Fetch order book error for {instrument_name}: {e}")
                    await asyncio.sleep(2)
            logger.error(f"Failed to fetch order book for {instrument_name} after 3 attempts")
            return {}

    async def fetch_and_store_option_chains(self):
        instruments = await self.fetch_option_instruments()
        btc_usd_price = self.fetch_btc_to_usd()
        if not instruments:
            return

        chunk_size = 2  # smaller chunk to reduce CPU/RAM spikes
        sleep_between_chunks = 3  # throttle between chunks

        for i in range(0, len(instruments), chunk_size):
            chunk = instruments[i:i + chunk_size]
            tasks = [self.fetch_order_book(inst['instrument_name']) for inst in chunk]
            results = await asyncio.gather(*tasks)

            # Save chunk immediately in executor
            def db_save_chunk(chunk_data, order_books):
                session = SessionLocal()
                count = 0
                try:
                    self.remove_expired_option_chains_from_db(session, force = True)
                    for inst, ob in zip(chunk_data, order_books):
                        if not ob:
                            continue
                        expiration = datetime.utcfromtimestamp(inst['expiration_timestamp'] / 1000).date()
                        data = {
                            "Instrument": inst['instrument_name'],
                            "Option_Type": inst.get('option_type'),
                            "Strike_Price": inst.get('strike', 0),
                            "Expiration_Date": expiration,
                            "Last_Price_USD": ob.get('last_price', 0.0) * btc_usd_price if ob.get('last_price') else 0.0,
                            "Bid_Price_USD": ob.get('best_bid_price', 0.0) * btc_usd_price if ob.get('best_bid_price') else 0.0,
                            "Ask_Price_USD": ob.get('best_ask_price', 0.0) * btc_usd_price if ob.get('best_ask_price') else 0.0,
                            "Bid_IV": ob.get('bid_iv', 0.0),
                            "Ask_IV": ob.get('ask_iv', 0.0),
                            "Delta": ob.get('greeks', {}).get('delta'),
                            "Gamma": ob.get('greeks', {}).get('gamma'),
                            "Theta": ob.get('greeks', {}).get('theta'),
                            "Vega": ob.get('greeks', {}).get('vega'),
                            "Open_Interest": ob.get('open_interest', 0.0),
                            "Total_Traded_Volume": ob.get('stats', {}).get('volume', 0.0),
                            "Monetary_Volume": ob.get('stats', {}).get('volume_usd', 0.0),
                            "Probability_Percent": 0.0,
                            "Timestamp": datetime.utcnow()
                        }
                        session.add(OptionChain(**data))
                        count += 1
                    session.commit()
                    logger.info(f"Saved {count} option chains for this chunk.")
                except Exception as e:
                    logger.error(f"Error saving option chains chunk: {e}")
                    session.rollback()
                finally:
                    session.close()

            await asyncio.get_running_loop().run_in_executor(self.executor, db_save_chunk, chunk, results)

            results.clear()  # free memory immediately
            if i + chunk_size < len(instruments):
                await asyncio.sleep(sleep_between_chunks)

    async def fetch_public_trades_for_instrument(self, instrument, start_ts, end_ts):
        session_http = await self._get_aiohttp_session()
        url = 'https://www.deribit.com/api/v2/public/get_last_trades_by_instrument_and_time'
        trades_list = []
        last_ts = start_ts

        async with self.semaphore:
            while last_ts < end_ts:
                params = {
                    'instrument_name': instrument,
                    'start_timestamp': last_ts,
                    'end_timestamp': end_ts,
                    'count': 1000
                }
                try:
                    async with session_http.get(url, params=params) as resp:
                        if resp.status == 429:
                            await asyncio.sleep(1)
                            continue
                        resp.raise_for_status()
                        data = await resp.json()
                        trades = data.get('result', {}).get('trades', [])
                        if not trades:
                            break
                        trades_list.extend(trades)
                        last_ts = max(t['timestamp'] for t in trades) + 1
                except Exception as e:
                    logger.error(f"[{instrument}] Fetch error: {e}")
                    break
        logger.info(f"[{instrument}] Fetched {len(trades_list)} trades.")
        return trades_list


    async def fetch_and_store_public_trades(self):
        try:
            session_db = SessionLocal()
            instruments = list(set(i.Instrument for i in session_db.query(OptionChain.Instrument).all()))
            session_db.close()
            logger.info(f"Processing {len(instruments)} instruments for trades.")

            end = datetime.utcnow()
            start = end - timedelta(hours=1)
            start_ts = int(start.timestamp() * 1000)
            end_ts = int(end.timestamp() * 1000)

            chunk_size = 2  # smaller chunk
            sleep_between_chunks = 3

            for i in range(0, len(instruments), chunk_size):
                chunk = instruments[i:i + chunk_size]
                tasks = [self.fetch_public_trades_for_instrument(inst, start_ts, end_ts) for inst in chunk]
                results = await asyncio.gather(*tasks)

                # Save trades per instrument
                for trades_list in results:
                    if not trades_list:
                        continue

                    def db_save_trades(trades):
                        session = SessionLocal()
                        try:
                            self.remove_expired_trades_from_db(session)
                            for t in trades:
                                trade_id = str(t.get('trade_id'))
                                if not trade_id or session.query(PublicTrade).filter_by(Trade_ID=trade_id).first():
                                    continue
                                expiration_date, strike_price, option_type = self.parse_instrument_metadata(t.get('instrument_name'))
                                if not expiration_date:
                                    continue
                                raw_block_id = ','.join(t.get('block_trade_id', [])) if 'block_trade_id' in t else None
                                raw_combo_id = ','.join(t.get('combo_trade_id', [])) if 'combo_trade_id' in t else None

                                session.add(PublicTrade(
                                    Trade_ID=trade_id,
                                    Side=t.get('direction'),
                                    Instrument=t.get('instrument_name'),
                                    Price_BTC=t.get('price'),
                                    Price_USD=t.get('price', 0) * t.get('index_price', 0),
                                    IV_Percent=t.get('iv'),
                                    Size=t.get('amount'),
                                    Entry_Value=t.get('amount', 0) * t.get('price', 0) * t.get('index_price', 0),
                                    Underlying_Price=t.get('index_price'),
                                    Expiration_Date=expiration_date,
                                    Strike_Price=strike_price,
                                    Option_Type=option_type,
                                    Entry_Date=datetime.utcfromtimestamp(t['timestamp'] / 1000),
                                    BlockTrade_IDs=self.clean_trade_id(raw_block_id),
                                    BlockTrade_Count=len(t.get('block_trade_id', [])) if 'block_trade_id' in t else None,
                                    Combo_ID=t.get('combo_id'),
                                    ComboTrade_IDs=self.clean_trade_id(raw_combo_id)
                                ))
                            session.commit()
                        except Exception as e:
                            logger.error(f"Error saving public trades: {e}")
                            session.rollback()
                        finally:
                            session.close()

                    await asyncio.get_running_loop().run_in_executor(self.executor, db_save_trades, trades_list)
                    trades_list.clear()  # free memory immediately

                if i + chunk_size < len(instruments):
                    await asyncio.sleep(sleep_between_chunks)

        except Exception as e:
            logger.error(f"Unexpected error in fetch_and_store_public_trades: {e}")

    # ----------------- Utility Functions -----------------
    def parse_instrument_metadata(self, instrument_name):
        try:
            parts = instrument_name.split('-')
            if len(parts) != 4:
                return None, None, None
            _, date_str, strike, option_type_code = parts
            expiration_date = datetime.strptime(date_str, "%d%b%y").date()
            strike_price = float(strike)
            option_type = 'Call' if option_type_code.upper() == 'C' else 'Put'
            return expiration_date, strike_price, option_type
        except Exception:
            return None, None, None





    def remove_expired_option_chains_from_db(self, session, force: bool = False):
        try:
            now = datetime.utcnow()
            today = now.date()
            cleanup_time = time(8, 0)
            this_cycle = today if now.hour >= cleanup_time.hour else today - timedelta(days=7)

            meta = session.query(SystemState).filter_by(key="last_option_chain_cleanup").first()
            already_cleaned = (meta.value_date == this_cycle) if meta else False

            if not already_cleaned or force:
                logger.info("Running option chain cleanup...")

                # Group by instrument + date, keep only MIN and MAX Timestamp, delete the rest
                subq = (
                    session.query(
                        OptionChain.Instrument,
                        func.date(OptionChain.Timestamp).label("chain_date"),
                        func.min(OptionChain.Timestamp).label("min_ts"),
                        func.max(OptionChain.Timestamp).label("max_ts"),
                    )
                    .group_by(OptionChain.Instrument, func.date(OptionChain.Timestamp))
                    .subquery()
                )

                # Delete everything that is not min_ts or max_ts for each instrument/day
                num_deleted = (
                    session.query(OptionChain)
                    .filter(
                        ~OptionChain.Timestamp.in_(
                            session.query(subq.c.min_ts).union(session.query(subq.c.max_ts))
                        )
                    )
                    .delete(synchronize_session=False)
                )

                logger.info(f"Removed {num_deleted} old option chain rows (kept only 2 per instrument/day).")

                # Update or create cleanup meta state
                if meta:
                    meta.value_date = this_cycle
                else:
                    session.add(SystemState(key="last_option_chain_cleanup", value_date=this_cycle))

                session.commit()
            else:
                logger.info("Skipping cleanup because it already ran this cycle.")

        except Exception as exc:
            logger.exception("Unexpected error in remove_expired_option_chains_from_db: %s", exc)
            try:
                session.rollback()
            except Exception:
                logger.exception("Rollback failed")



    def remove_expired_trades_from_db(self, session):
        now = datetime.utcnow()
        today = now.date()
        cleanup_time = time(8, 0)
        this_cycle = today if now.hour >= 8 else today - timedelta(days=1)
        meta = session.query(SystemState).filter_by(key="last_public_trade_cleanup").first()
        already_cleaned = (meta.value_date == this_cycle) if meta else False
        if not already_cleaned and now >= datetime.combine(this_cycle, cleanup_time):
            cutoff_datetime = datetime.combine(this_cycle, datetime.min.time())
            num_deleted = session.query(PublicTrade).filter(PublicTrade.Expiration_Date < cutoff_datetime).delete(synchronize_session=False)
            logger.info(f"Removed {num_deleted} expired public trades.")
            if meta:
                meta.value_date = this_cycle
            else:
                session.add(SystemState(key="last_public_trade_cleanup", value_date=this_cycle))
            session.commit()

    # ----------------- Price & Analytics -----------------
    def fetch_btc_to_usd(self):
        url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
        try:
            response = self.session.get(url)
            response.raise_for_status()
            data = response.json()
            self.btc_usd_price = data.get('bitcoin', {}).get('usd', 0)
            return self.btc_usd_price
        except requests.RequestException as e:
            logging.error(f"Error fetching BTC price: {e}")
            return 0
        
    def fetch_today_high_low(self):
        url = "https://www.deribit.com/api/v2/public/get_book_summary_by_currency"
        params = {
            'currency': 'BTC',
            'kind': 'future'
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if not data.get('result'):
                print("Error: No results in getting highest and lowest price response")
                return None, None
                
            for instrument in data['result']:
                if instrument['instrument_name'] == 'BTC-PERPETUAL':
                    highest_price = int(float(instrument['high']))
                    lowest_price = int(float(instrument['low']))
                    return highest_price, lowest_price
            
            return None, None
            
        except requests.exceptions.RequestException as e:
            print(f"API Request Failed: {e}")
            return None, None
        except (KeyError, ValueError) as e:
            print(f"Data Parsing Error: {e}")
            return None, None
