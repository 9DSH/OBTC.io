import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import MarketWatch from "./components/MarketWatch";
import TradeDashboard from "./components/TradeDashboard";
import MainMenu from "./components/MainMenu";
import "./darkTheme.css";

export default function App({ goToLanding }) {
  const [trades, setTrades] = useState([]);
  const [chains, setChains] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [btcprice, setBtcPrice] = useState(null);
  const [simulateData, setSimulateData] = useState(null);
  const [loading, setLoading] = useState(true);

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const navigate = useNavigate(); // hook to navigate programmatically

  const fetchTrades = async () => {
    try {
      const resp = await axios.get("/backend-static/public_trades.json");
      setTrades(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error("Error fetching trades JSON:", err);
      setTrades([]);
    }
  };

  const fetchChains = async () => {
    try {
      const resp = await axios.get("/backend-static/option_chains.json");
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

  // 🔹 Block mobile access completely
  if (isMobile) {
    return (
      <div style={{ 
        display: "flex", 
        height: "100vh", 
        alignItems: "center", 
        justifyContent: "center", 
        textAlign: "center", 
        fontSize: "1.2rem", 
        padding: "20px" 
      }}>
        Mobile access is disabled. <br />
        Please use a <b>desktop browser</b> to open <b>OptionBTC</b>.
      </div>
    );
  }

  // Use navigate instead of window.history
  const handleGoToLanding = () => {
    if (goToLanding) {
      goToLanding(); // callback to LandingPage
    } else {
      navigate("/home"); // fallback navigation
    }
  };

  return (
    <div className="fill" style={{ padding: "20px", display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", position: "relative" }}>
      <MainMenu loading={loading} goToLanding={handleGoToLanding} />
      {!loading && (
        <Routes>
          <Route
            path="/market-watch"
            element={<MarketWatch
              trades={trades}
              chains={chains}
              loading={loading}
              analytics={analytics}
              analyticsLoading={false}
              btcprice={btcprice}
              priceLoading={false}
              onSimulate={setSimulateData}
            />}
          />
          <Route
            path="/simulation"
            element={<TradeDashboard
              trades={trades}
              chains={chains}
              loading={loading}
              analytics={analytics}
              analyticsLoading={false}
              btcprice={btcprice}
              priceLoading={false}
              simulateData={simulateData}
            />}
          />
          <Route path="*" element={<Navigate to="/market-watch" replace />} />
        </Routes>
      )}
    </div>
  );
}
