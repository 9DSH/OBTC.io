import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route,  Navigate } from 'react-router-dom';
import MarketWatch from './components/MarketWatch';
import TradeDashboard from './components/TradeDashboard';
import MainMenu from './components/MainMenu';
import './darkTheme.css';

export default function App() {
  const [trades, setTrades] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [btcprice, setBtcPrice] = useState(null);

  const [loading, setLoading] = useState(true); // Unified loading

  const fetchTrades = async () => {
    const tradesResp = await axios.get('http://localhost:8000/public_trades/latest');
    setTrades(tradesResp.data.data || []);
  };

  const fetchAnalytics = async () => {
    const analyticsResp = await axios.get('http://localhost:8000/analysis/technical');
    setAnalytics(analyticsResp.data.data || {});
  };

  const fetchBtcPrice = async () => {
    const priceResp = await axios.get('http://localhost:8000/deribit/btcprice');
    setBtcPrice(priceResp.data.data || {});
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchTrades(),
          fetchAnalytics(),
          fetchBtcPrice(),
        ]);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false); // Data ready
      }
    };

    loadData();

    const tradesInterval = setInterval(fetchTrades, 5 * 60 * 1000);
    const btcInterval = setInterval(fetchBtcPrice, 2 * 60 * 1000);
    const analyticsInterval = setInterval(fetchAnalytics, 4 * 60 * 60 * 1000);

    return () => {
      clearInterval(tradesInterval);
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

        {!loading && (
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
                />
              }
            />
            <Route
              path="/live-option"
              element={
                <TradeDashboard
                  trades={trades}
                  loading={loading}
                  analytics={analytics}
                  analyticsLoading={false}
                  btcprice={btcprice}
                  priceLoading={false}
                />
              }
            />
            {/* Redirect all unknown paths to Market Watch */}
            <Route path="*" element={<Navigate to="/market-watch" replace />} />
          </Routes>
        )}
      </div>
    </BrowserRouter>
  );
}
