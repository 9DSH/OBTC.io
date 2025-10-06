import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import App from "./App";
// 🌟 Vertical rising lines
function AnimatedLines() {
  const [lines, setLines] = useState([]);

  useEffect(() => {
    const newLines = [];
    for (let i = 0; i < 35; i++) {
      newLines.push({
        left: Math.random() * 100,
        height: 50 + Math.random() * 350,
        width: 2 + Math.random() * 2,
        delay: Math.random() * 5,
        speed: 8 + Math.random() * 8,
        color: `rgba(89, 97, 152, ${0.3 + Math.random() * 0.5})`,
      });
    }
    setLines(newLines);
  }, []);

  return (
    <>
      {lines.map((line, idx) => (
        <div
          key={idx}
          style={{
            position: "absolute",
            bottom: 0,
            left: `${line.left}vw`,
            width: `${line.width}px`,
            height: `${line.height}px`,
            background: line.color,
            borderRadius: "3px",
            animation: `lineRise ${line.speed}s ease-in-out ${line.delay}s infinite`,
            opacity: 0,
          }}
        />
      ))}
      <style>{`
        @keyframes lineRise {
          0% { transform: scaleY(0); opacity: 0; }
          20% { opacity: 0.4; }
          50% { transform: scaleY(1); opacity: 0.7; }
          80% { opacity: 0.4; }
          100% { transform: scaleY(0); opacity: 0; }
        }
      `}</style>
    </>
  );
}

// 🌟 Dark floating particles
function AnimatedParticles() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const newParticles = [];
    for (let i = 0; i < 40; i++) {
      newParticles.push({
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: 10 + Math.random() * 20,
        delay: Math.random() * 5, // optional, reduce max delay
        color: `rgba(89, 97, 152, ${0.3 + Math.random() * 0.6})`,
        speed: 15 + Math.random() * 20,
      });
    }
    setParticles(newParticles);
  }, []);

  return (
    <>
      {particles.map((p, idx) => (
        <div
          key={idx}
          style={{
            position: "absolute",
            top: `${p.top}vh`,
            left: `${p.left}vw`,
            width: `1px`,
            height: `${p.size}px`,
            background: p.color,
            animation: `particleMove ${p.speed}s linear ${p.delay}s infinite`,
            animationFillMode: "both", // ensures initial styles apply immediately
          }}
        />
      ))}
      <style>{`
        @keyframes particleMove {
          0% { transform: translateY(0); opacity: 0.2; } /* start visible */
          30% { opacity: 0.5; }
          50% { opacity: 0.8; }
          80% { opacity: 0.5; }
          100% { transform: translateY(-300px); opacity: 0.1; }
        }
      `}</style>
    </>
  );
}


// 🌟 Static curved net in background
function CurvedNet() {
  const [lines, setLines] = useState([]);
  const [cols, setCols] = useState(40); // more vertical lines
  const [rows, setRows] = useState(25); // more horizontal lines

  useEffect(() => {
    const newLines = [];
    const width = window.innerWidth;
    const height = window.innerHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const meshRadius = Math.min(centerX, centerY) * 0.5; // radius of visible mesh

    // Horizontal lines
    for (let y = -rows; y <= rows; y++) {
      const py = centerY + (y * meshRadius) / rows;
      newLines.push({ type: "h", y: py, index: y, total: rows });
    }

    // Vertical lines
    for (let x = -cols; x <= cols; x++) {
      const px = centerX + (x * meshRadius) / cols;
      newLines.push({ type: "v", x: px, index: x, total: cols });
    }

    setLines(newLines);
  }, [rows, cols]);

  // Feathered opacity based on distance from center
  const calcOpacity = (index, total) => {
    const distance = Math.abs(index) / total;
    return Math.max(0, 0.25 * (1 - distance * 1)); // dim at edges
  };

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      {lines.map((line, idx) =>
        line.type === "h" ? (
          <line
            key={idx}
            x1={0}
            y1={line.y}
            x2={window.innerWidth}
            y2={line.y}
            stroke={`rgba(89,97,152,${calcOpacity(line.index, line.total)})`}
            strokeWidth="1"
          />
        ) : (
          <line
            key={idx}
            x1={line.x}
            y1={0}
            x2={line.x}
            y2={window.innerHeight}
            stroke={`rgba(89,97,152,${calcOpacity(line.index, line.total)})`}
            strokeWidth="1"
          />
        )
      )}
    </svg>
  );
}


function LandingWrapper({ launchApp, setLaunchApp }) {
  const navigate = useNavigate();

  if (launchApp)
    return <App goToLanding={() => { setLaunchApp(false); navigate("/home"); }} />;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100vw",
        textAlign: "center",
        color: "var(--color-text)",
        background: "linear-gradient(0deg, var(--color-darkPurple) 0%, var(--color-background) 100%)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Curved net below everything */}
      <CurvedNet />
      {/* Vertical lines */}
      <AnimatedLines />
      {/* Darker particles */}
      <AnimatedParticles />

      {/* Centered content */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: "650px", padding: "20px" }}>
        <h1
          style={{
            fontSize: "3rem",
            marginBottom: "1rem",
            fontWeight: "300",
            letterSpacing: '0.2rem',
            color: "var(--color-muted)",
            transition: "all 0.8s ease-in-out",
          }}
        >
          Welcome to OptionBTC
        </h1>
        <p
          style={{
            fontSize: "1.2rem",
            marginBottom: "2rem",
            color: "rgb(118, 127, 183)",
            transition: "all 0.8s ease-in-out",
          }}
        >
          Your advanced options trading dashboard for real-time market insights and risk-free simulations.
        </p>
        <button
          onClick={() => { setLaunchApp(true); navigate("/market-watch"); }}
          style={{
            padding: "16px 32px",
            fontSize: "1.2rem",
            cursor: "pointer",
            borderRadius: "8px",
            border: "none",
            background: "linear-gradient(180deg, var(--color-primary), var(--color-primary-hover))",
            color: "#fff",
            fontWeight: "500",
            boxShadow: "0 6px 15px rgba(0,0,0,0.3)",
            transition: "all 0.5s ease-in-out",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px) scale(1.07)";
            e.currentTarget.style.boxShadow = "0 14px 30px rgba(0,0,0,0.45)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow = "0 6px 15px rgba(0,0,0,0.3)";
          }}
        >
          Launch App
        </button>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [launchApp, setLaunchApp] = useState(false);

  return (
    <Routes>
      <Route
        path="/home"
        element={<LandingWrapper launchApp={launchApp} setLaunchApp={setLaunchApp} />}
      />
      <Route
        path="/*"
        element={<LandingWrapper launchApp={launchApp} setLaunchApp={setLaunchApp} />}
      />
    </Routes>
  );
}

