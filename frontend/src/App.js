import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MarketWatch from './components/MarketWatch';
import TradeDashboard from './components/TradeDashboard';
import MainMenu from './components/MainMenu';
import './darkTheme.css';

// Helper function to handle fetching and caching
// This function attempts to fetch data from the API.
// If successful, it updates the component state and localStorage.
// If it fails, it tries to load data from localStorage to prevent a blank screen.
const fetchDataAndCache = async (endpoint, stateSetter, cacheKey) => {
  try {
    const resp = await axios.get(endpoint);
    const data = resp.data.data || (Array.isArray(resp.data.data) ? [] : null);
    if (data) {
      stateSetter(data);
      localStorage.setItem(cacheKey, JSON.stringify(data));
    }
  } catch (err) {
    console.error(`Error fetching data from ${endpoint}. Loading from cache if available.`, err);
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      stateSetter(JSON.parse(cachedData));
    }
  }
};

export default function App() {
  const [trades, setTrades] = useState([]);
  const [chains, setChains] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [btcprice, setBtcPrice] = useState(null);
  const [simulateData, setSimulateData] = useState(null);
  const [loading, setLoading] = useState(true);

  // The `useEffect` hook runs once when the component mounts.
  useEffect(() => {
    // 1. Immediately load any previously cached data from localStorage.
    // This ensures the page is not blank while we wait for new data.
    const cachedTrades = localStorage.getItem('trades');
    const cachedChains = localStorage.getItem('chains');
    const cachedAnalytics = localStorage.getItem('analytics');
    const cachedBtcPrice = localStorage.getItem('btcprice');

    if (cachedTrades) setTrades(JSON.parse(cachedTrades));
    if (cachedChains) setChains(JSON.parse(cachedChains));
    if (cachedAnalytics) setAnalytics(JSON.parse(cachedAnalytics));
    if (cachedBtcPrice) setBtcPrice(JSON.parse(cachedBtcPrice));

    // 2. Define the initial data loading process.
    const loadData = async () => {
      // Use Promise.all to fetch all data simultaneously for efficiency.
      // This will use our new `fetchDataAndCache` helper.
      await Promise.all([
        fetchDataAndCache('/public_trades/latest', setTrades, 'trades'),
        fetchDataAndCache('/option_chains/latest', setChains, 'chains'),
        fetchDataAndCache('/analysis/technical', setAnalytics, 'analytics'),
        fetchDataAndCache('/deribit/btcprice', setBtcPrice, 'btcprice'),
      ]);
      setLoading(false); // Set loading to false once the initial attempts are made.
    };

    loadData();

    // 3. Set up intervals for periodic data refreshes.
    // These will also use the caching helper, updating localStorage with fresh data.
    const tradesInterval = setInterval(() => fetchDataAndCache('/public_trades/latest', setTrades, 'trades'), 5 * 60 * 1000);
    const chainsInterval = setInterval(() => fetchDataAndCache('/option_chains/latest', setChains, 'chains'), 5 * 60 * 1000);
    const btcInterval = setInterval(() => fetchDataAndCache('/deribit/btcprice', setBtcPrice, 'btcprice'), 2 * 60 * 1000);
    const analyticsInterval = setInterval(() => fetchDataAndCache('/analysis/technical', setAnalytics, 'analytics'), 4 * 60 * 60 * 1000);

    // 4. Clean up intervals when the component unmounts.
    return () => {
      clearInterval(tradesInterval);
      clearInterval(chainsInterval);
      clearInterval(btcInterval);
      clearInterval(analyticsInterval);
    };
  }, []);

  return (
    <BrowserRouter>
      <div
        className="fill"
        style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <MainMenu loading={loading} />

        <Routes>
          <Route
            path="/market-watch"
            element={
              <MarketWatch
                trades={trades}
                chains={chains}
                loading={loading}
                analytics={analytics}
                btcprice={btcprice}
                onSimulate={(segmentData) => {
                  console.log("App.js: received simulate data:", segmentData);
                  setSimulateData(segmentData);
                }}
              />
            }
          />
          <Route
            path="/simulation"
            element={
              <TradeDashboard
                chains={chains}
                trades={trades}
                loading={loading}
                analytics={analytics}
                btcprice={btcprice}
                simulateData={simulateData}
              />
            }
          />
          {/* Redirect all unknown paths to Market Watch */}
          <Route path="*" element={<Navigate to="/market-watch" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}