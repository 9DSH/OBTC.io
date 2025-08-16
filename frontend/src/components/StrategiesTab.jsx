import React, { useState, useMemo } from "react";
import { filterStrategies } from "./Strategy/utils/strategiesUtils";
import StrategyOverview from "./Strategy/StrategyOverview";

const SUBTABS = [
  { id: "strategyOverview", label: "Overview" }
];

export default function StrategiesTab({ data, filters, onSegmentSelect }) {
  const [activeSubtab, setActiveSubtab] = useState("strategyOverview");
  const [selectedSegment, setSelectedSegment] = useState(null);

  const strategies = useMemo(() => {
    const filtered = filterStrategies(data);
    return filtered;
  }, [data]);

  function handleSegmentSelect(segment) {
    console.log("StrategiesTab: Received segment in handleSegmentSelect:", segment);
    const { selectedSegment: rawSegment, contextId } = segment;
    console.log("StrategiesTab: Setting selectedSegment:", rawSegment, "with contextId:", contextId);
    setSelectedSegment(rawSegment);

    if (onSegmentSelect) {
      const finalContextId =
        activeSubtab === "strategyOverview"
          ? contextId
          : null;

      if (!finalContextId) {
        console.warn("StrategiesTab: No valid contextId for segment, using null", { contextId, activeSubtab });
      }

      const finalContextId_RightSide =
        activeSubtab === "strategyOverview"
          ? contextId
          : null;

      console.log("StrategiesTab: Sending to onSegmentSelect:", {
        selectedSegment: rawSegment,
        contextId: finalContextId,
        selectedSegment_RightSide: rawSegment,
        contextId_RightSide: finalContextId_RightSide,
      });

      onSegmentSelect({
        selectedSegment: rawSegment,
        contextId: finalContextId,
        selectedSegment_RightSide: rawSegment,
        contextId_RightSide: finalContextId_RightSide,
      });
    } else {
      console.warn("StrategiesTab: onSegmentSelect not provided");
    }
  }

  return (
    <div
      style={{
        color: "white",
        width: "100%",
        fontFamily: "'Roboto', sans-serif, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        overflowX: "hidden",
        padding: "0 1rem",
      }}
    >
      {/* Subtab nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(0.5rem, 3vw, 1rem)",
          width: "90%",
          maxWidth: "clamp(200px, 80vw, 800px)",
          margin: "0 auto clamp(1rem, 2vw, 1.5rem) auto",
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
        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >

           {/* Buttons */}
          {SUBTABS.map(({ id, label }) => {
            const isActive = activeSubtab === id;
            return (
              <button
                key={id}
                onClick={() => {
                  console.log("StrategiesTab: Clicking subtab:", id, "Current activeSubtab:", activeSubtab);
                  if (id !== activeSubtab) {
                    console.log("StrategiesTab: Switching to subtab:", id);
                    setActiveSubtab(id);
                    console.log("StrategiesTab: Clearing selectedSegment due to subtab switch");
                    setSelectedSegment(null);
                    if (onSegmentSelect) {
                      console.log("StrategiesTab: Sending null to onSegmentSelect for subtab switch");
                      onSegmentSelect({
                        selectedSegment: null,
                        contextId: null,
                        selectedSegment_RightSide: null,
                        contextId_RightSide: null,
                      });
                    }
                  } else {
                    console.log("StrategiesTab: Subtab", id, "already active, preserving selectedSegment:", selectedSegment);
                  }
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

      <div style={{ minHeight: 400 }}>
        {activeSubtab === "strategyOverview" && (
          <StrategyOverview
            strategies={strategies}
            filters={filters}
            onSegmentSelect={handleSegmentSelect}
          />
        )}

      </div>
    </div>
  );
}