import requests
import logging
from datetime import datetime, date, timezone, timedelta
import numpy as np
import os
import time
from fetch_btc_price import get_btcusd_price
from sqlalchemy import select

from db import SessionLocal, OptionChain, PublicTrade, init_db


# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class Fetching_data:
    def __init__(self):
        init_db()
        self._chains = []  # List of dicts
        self._trades = []  # List of dicts
        self._load_caches()

    def _load_caches(self):
        """
        Load full tables into cached lists of dictionaries.
        """
        session = SessionLocal()
        try:
            # Load option chains
            chains = session.execute(select(OptionChain)).scalars().all()
            self._chains = [{
                'Instrument': c.Instrument,
                'Option_Type': c.Option_Type,
                'Strike_Price': c.Strike_Price,
                'Expiration_Date': c.Expiration_Date,
                'Last_Price_USD': c.Last_Price_USD,
                'Bid_Price_USD': c.Bid_Price_USD,
                'Ask_Price_USD': c.Ask_Price_USD,
                'Bid_IV': c.Bid_IV,
                'Ask_IV': c.Ask_IV,
                'Delta': c.Delta,
                'Gamma': c.Gamma,
                'Theta': c.Theta,
                'Vega': c.Vega,
                'Open_Interest': c.Open_Interest,
                'Total_Traded_Volume': c.Total_Traded_Volume,
                'Monetary_Volume': c.Monetary_Volume,
                'Probability_Percent': c.Probability_Percent,
                'Timestamp': c.Timestamp
            } for c in chains]

            # Load public trades
            trades = session.execute(select(PublicTrade)).scalars().all()
            self._trades = [{
                'Trade_ID': t.Trade_ID,
                'Side': t.Side.upper(),
                'Instrument': t.Instrument,
                'Price_BTC': t.Price_BTC,
                'Price_USD': t.Price_USD,
                'IV_Percent': t.IV_Percent,
                'Size': t.Size,
                'Entry_Value': t.Entry_Value,
                'Underlying_Price': t.Underlying_Price,
                'Expiration_Date': t.Expiration_Date,
                'Strike_Price': t.Strike_Price,
                'Option_Type': t.Option_Type,
                'Entry_Date': t.Entry_Date,
                'BlockTrade_IDs': t.BlockTrade_IDs,
                'BlockTrade_Count': t.BlockTrade_Count,
                'Combo_ID': t.Combo_ID,
                'ComboTrade_IDs': t.ComboTrade_IDs
            } for t in trades]

        finally:
            session.close()

    def get_available_currencies(self):
        """Fetch available currencies for options."""
        return ['BTC', 'ETH']

    def fetch_available_dates(self):
        """
        Returns a sorted list of unique Expiration_Date values.
        """
        if not self._chains:
            return []
        dates = set(item['Expiration_Date'] for item in self._chains if item['Expiration_Date'] is not None)
        return sorted(dates)

    def get_options_for_date(self, expiration_date):
        """
        Returns list of option dicts where Expiration_Date matches.
        """
        if not self._chains:
            return []

        return [item for item in self._chains if item['Expiration_Date'] == expiration_date]

    def fetch_option_chain(self, option_symbol=None):
        """
        Returns list of option dicts detail for given Instrument(s).
        If option_symbol is None, returns full chain list.
        """
        
        self._load_caches() 
        if not self._chains:
            return []

        if option_symbol is None:
            return self._chains.copy()
        elif isinstance(option_symbol, list):
            return [item for item in self._chains if item['Instrument'] in option_symbol]
        else:
            return [item for item in self._chains if item['Instrument'] == option_symbol]

    def get_instrument_probabilities(self):
        """
        Returns list of dicts [{'Instrument': ..., 'Probability_Percent': ...}] 
        sorted descending by Probability_Percent within price range,
        and the top instrument's name.
        """
        current_price, _, _ = get_btcusd_price()
        if current_price is None or current_price == 0:
            current_price = 100000

        price_range = 50000
        lower_bound = current_price - price_range
        upper_bound = current_price + price_range

        options_data = self._chains if self._chains else []

        filtered = [
            {'Instrument': opt['Instrument'], 'Probability_Percent': opt['Probability_Percent']}
            for opt in options_data
            if lower_bound <= opt['Strike_Price'] <= upper_bound
        ]

        filtered.sort(key=lambda x: x['Probability_Percent'], reverse=True)

        top_instrument = filtered[0]['Instrument'] if filtered else None

        return filtered, top_instrument

    def get_all_options_for_strike(self, option_strike=None, option_type=None):
        """
        Returns list of option dicts filtered by Strike_Price and/or Option_Type.
        """
        if not self._chains:
            return []

        filtered = self._chains
        if option_strike is not None:
            filtered = [opt for opt in filtered if opt['Strike_Price'] == option_strike]
        if option_type is not None:
            filtered = [opt for opt in filtered if opt['Option_Type'] == option_type]

        return filtered

    def load_public_trades(self, symbol_filter=None, show_24h_public_trades=False):
        """
        Returns list of public trade dicts.
        
        Filters by Instrument if symbol_filter is provided.
        Limits to last 24h if show_24h_public_trades is True.
        Sorted by Entry_Date descending.
        """

        self._load_caches() 
        if not self._trades:
            logger.warning("load_public_trades: No trade data available.")
            return []

        filtered = self._trades

        if symbol_filter:
            filtered = [t for t in filtered if t.get('Instrument') == symbol_filter]

        if show_24h_public_trades:
            cutoff = datetime.utcnow() - timedelta(hours=24)
            filtered = [t for t in filtered if t.get('Entry_Date') and t['Entry_Date'] >= cutoff]

        # Sort by Entry_Date descending if available
        filtered = sorted(filtered, key=lambda t: t.get('Entry_Date', datetime.min), reverse=True)

        return filtered

    def extract_instrument_info(self, column_name):
        """Extracts instrument name and option side from the column name."""
        parts = column_name.split('-')
        instrument_name = '-'.join(parts[:-1])  # All parts except last
        option_side = parts[-1]
        return instrument_name, option_side
    
    def fetch_available_strike_prices(self):
        """
        Returns a sorted list of unique Strike_Price values (as floats).
        """
        if not self._chains:
            return []

        prices = {item['Strike_Price'] for item in self._chains if item['Strike_Price'] is not None}
        return sorted(prices)