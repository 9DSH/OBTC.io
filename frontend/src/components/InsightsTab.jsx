import React, { useState } from "react";
import PutCallDistribution from "./PutCallDistribution";
import PremiumByStrike from './PremiumByStrike';
import TopVolume from './TopVolume';
import MarketExposure from './MarketExposure';

const SUBTABS = [
  { id: "putCall", label: "Options Distribution" },
  { id: "premiumVsStrike", label: "Premium by Strike" },
  { id: "topVolume", label: "Top Volume" },
  { id: "marketExposure", label: "Market Exposure" },
];

export default function InsightsTab({ data = [], 
                                      chains= [], 
                                      filters, 
                                      onSegmentSelect 
                                    }) 
                                    {
  const [activeSubtab, setActiveSubtab] = useState("putCall");
  const [selectedSegment, setSelectedSegment] = useState(null);

  function handleSegmentSelect(segment) {
    setSelectedSegment(segment);
  
    if (onSegmentSelect) {
      const contextId = activeSubtab === "putCall"
        ? "insight/putcalldist"
        : activeSubtab === "premiumVsStrike"
        ? "insight/premiumbystrike"
        : activeSubtab === "topVolume"
        ? "insight/topvolume"
        : null;
  
      const rawSegment = segment.selectedSegment ? segment.selectedSegment : segment;
  
      onSegmentSelect({ selectedSegment: rawSegment, contextId });
      console.log("InsightTab onSegmentSelect details:", rawSegment);
    }
  }

  return (
    <div
      style={{
        color: "white",
        width: "100%",
        fontFamily: "'Roboto', sans-serif, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        overflowX: "hidden",
        padding: "0 clamp(0.6rem, 2vw, 1.5rem)",
        
      }}
    >
      {/* Subtab nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(0.5rem, 3vw, 1rem)",
          width: "100%",
          maxWidth: "clamp(200px, 80vw, 800px)",
          margin: "0 auto clamp(0.5rem, 0.4vw, 1rem) auto",
          padding: "0 clamp(0.5rem, 2vw, 1rem)",

        }}
      >
        {/* Left line */}
        <div
          style={{
            flex: 1,
            height: "1px",
            background: "#999",
            opacity: 0.4,
            maxWidth: "clamp(100px, 30vw, 200px)",
          }}
        />

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: "clamp(0.5rem, 2vw, 1rem)",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {SUBTABS.map(({ id, label }) => {
            const isActive = activeSubtab === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setActiveSubtab(id);
                  setSelectedSegment(null);
                  if (onSegmentSelect) onSegmentSelect({ selectedSegment: null, contextId: null });
                }}
                style={{
                  color: isActive ? "var(--color-primary)" : "#fff",
                  fontSize: isActive
                  ? "clamp(0.7rem, 2vw, 1rem)"
                  : "clamp(0.6rem, 1.5vw, 0.7rem)",
                  fontWeight: isActive ? "bold" : "normal",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  letterSpacing: "clamp(0.8px, 0.2vw, 1.2px)",
                  userSelect: "none",
                  padding: "clamp(0.2rem, 1vw, 0.5rem) clamp(0.5rem, 2vw, 0.8rem)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Right line */}
        <div
          style={{
            flex: 1,
            height: "1px",
            background: "#999",
            opacity: 0.4,
            maxWidth: "clamp(100px, 30vw, 200px)",
          }}
        />
      </nav>

      {/* Subtab content */}
      <div
        style={{
          minHeight: "clamp(300px, 50vh, 400px)",
          width: "100%",
          maxWidth: "clamp(300px, 95vw, 1200px)",
          
        }}
      >
        {activeSubtab === "putCall" && (
          <PutCallDistribution
            data={data}
            filters={filters}
            onSegmentSelect={handleSegmentSelect}
          />
        )}

        {activeSubtab === "premiumVsStrike" && (
          <PremiumByStrike
            data={data}
            filters={filters}
            onSegmentSelect={handleSegmentSelect}
          />
        )}

        {activeSubtab === "topVolume" && (
          <TopVolume
            data={data}
            filters={filters}
            onSegmentSelect={handleSegmentSelect}
          />
        )}

        {activeSubtab === "marketExposure" && (
          <MarketExposure
            data={data}
            chains={chains}
            filters={filters}
            onSegmentSelect={handleSegmentSelect}
          />
        )}
      </div>
    </div>
  );
}