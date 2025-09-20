import React, { useEffect, useState } from "react";
import axios from "axios";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MarketWatch from "./components/MarketWatch";
import TradeDashboard from "./components/TradeDashboard";
import MainMenu from "./components/MainMenu";
import "./darkTheme.css";

export default function App() {
  const [trades, setTrades] = useState([]);
  const [chains, setChains] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [btcprice, setBtcPrice] = useState(null);
  const [simulateData, setSimulateData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTrades = async () => {
    try {
      const resp = await axios.get("/static/public_trades.json");
      setTrades(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error("Error fetching trades JSON:", err);
      setTrades([]);
    }
  };

  const fetchChains = async () => {
    try {
      const resp = await axios.get("/static/option_chains.json");
      setChains(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error("Error fetching chains JSON:", err);
      setChains([]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const resp = await axios.get("/analysis/technical");
      setAnalytics(resp.data?.data || {});
    } catch (err) {
      console.error("Error fetching analytics:", err);
    }
  };

  const fetchBtcPrice = async () => {
    try {
      const resp = await axios.get("/deribit/btcprice");
      setBtcPrice(resp.data?.data || {});
    } catch (err) {
      console.error("Error fetching BTC price:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([fetchTrades(), fetchChains(), fetchAnalytics(), fetchBtcPrice()]);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    const tradesInt = setInterval(fetchTrades, 5 * 60 * 1000);
    const chainsInt = setInterval(fetchChains, 5 * 60 * 1000);
    const btcInt = setInterval(fetchBtcPrice, 2 * 60 * 1000);
    const analyticsInt = setInterval(fetchAnalytics, 4 * 60 * 60 * 1000);

    return () => {
      clearInterval(tradesInt);
      clearInterval(chainsInt);
      clearInterval(btcInt);
      clearInterval(analyticsInt);
    };
  }, []);

  return (
    <BrowserRouter>
      <div className="fill" style={{ padding: "20px", display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", position: "relative" }}>
        <MainMenu loading={loading} />
        {!loading && (
          <Routes>
            <Route
              path="/market-watch"
              element={
                <MarketWatch
                  trades={trades}
                  chains={chains}
                  loading={loading}
                  analytics={analytics}
                  analyticsLoading={false}
                  btcprice={btcprice}
                  priceLoading={false}
                  onSimulate={setSimulateData}
                />
              }
            />
            <Route
              path="/simulation"
              element={
                <TradeDashboard
                  trades={trades}
                  chains={chains}
                  loading={loading}
                  analytics={analytics}
                  analyticsLoading={false}
                  btcprice={btcprice}
                  priceLoading={false}
                  simulateData={simulateData}
                />
              }
            />
            <Route path="*" element={<Navigate to="/market-watch" replace />} />
          </Routes>
        )}
      </div>
    </BrowserRouter>
  );
}
