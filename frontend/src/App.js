import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MarketWatch from './components/MarketWatch';
import TradeDashboard from './components/TradeDashboard';
import MainMenu from './components/MainMenu';
import './darkTheme.css';

export default function App() {
  const [trades, setTrades] = useState([]);
  const [chains, setChains] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [btcprice, setBtcPrice] = useState(null);
  const [simulateData, setSimulateData] = useState(null);
  const [loading, setLoading] = useState(true); // Unified loading

  // Fetch functions
  const fetchTrades = async () => {
    try {
      const tradesResp = await axios.get('/public_trades/latest');
      setTrades(tradesResp.data.data || []);
    } catch (err) {
      console.error('Error fetching trades:', err);
    }
  };

  const fetchChains = async () => {
    try {
      const chainsResp = await axios.get('/option_chains/latest');
      setChains(chainsResp.data.data || []);
    } catch (err) {
      console.error('Error fetching chains:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const analyticsResp = await axios.get('/analysis/technical');
      setAnalytics(analyticsResp.data.data || {});
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const fetchBtcPrice = async () => {
    try {
      const priceResp = await axios.get('/deribit/btcprice');
      setBtcPrice(priceResp.data.data || {});
    } catch (err) {
      console.error('Error fetching BTC price:', err);
    }
  };

  // Initial load and intervals
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([fetchTrades(), fetchChains(), fetchAnalytics(), fetchBtcPrice()]);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    const tradesInterval = setInterval(fetchTrades, 5 * 60 * 1000);
    const chainsInterval = setInterval(fetchChains, 5 * 60 * 1000);
    const btcInterval = setInterval(fetchBtcPrice, 2 * 60 * 1000);
    const analyticsInterval = setInterval(fetchAnalytics, 4 * 60 * 60 * 1000);

    return () => {
      clearInterval(tradesInterval);
      clearInterval(chainsInterval);
      clearInterval(btcInterval);
      clearInterval(analyticsInterval);
    };
  }, []);

  // Log chains only when they update
  useEffect(() => {
    if (chains.length > 0) {
      console.log('App.js: chains updated', chains[0]);
    }
  }, [chains]);

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

        {!loading ? (
          <Routes>
            <Route
              path="/market-watch"
              element={
                <MarketWatch
                  trades={trades}
                  loading={loading}
                  analytics={analytics}
                  analyticsLoading={false}
                  btcprice={btcprice}
                  priceLoading={false}
                  onSimulate={(segmentData) => {
                    console.log('App.js: received simulate data:', segmentData);
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
                  analyticsLoading={false}
                  btcprice={btcprice}
                  priceLoading={false}
                  simulateData={simulateData}
                />
              }
            />
            {/* Redirect all unknown paths to Market Watch */}
            <Route path="*" element={<Navigate to="/market-watch" replace />} />
          </Routes>
        ) : (
          <div style={{ textAlign: 'center' , justifyContent: 'center', marginTop: '50px', fontSize: '18px' }}>
            Loading data...
          </div>
        )}
      </div>
    </BrowserRouter>
  );
}
