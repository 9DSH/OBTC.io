import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  getRoundedStep,
  generateYTicks,
  formatStrikeLabel,
} from "../utils/chartHelpers";

const COLORS = {
  "Sell Call": "darkorange",
  "Buy Call": "teal",
  "Sell Put": "darkred",
  "Buy Put": "green",
};

const MAX_BAR_HEIGHT = 300;
const MAX_WIDTH = 900;
// const BAR_WIDTH = 7; // Removed fixed width
// const GAP_BETWEEN_BARS = 10; // Removed fixed gap
const Y_AXIS_WIDTH = 30; // width reserved for Y axis labels
const maxLabelWidth = 80; // approx px width needed per label to avoid overlap

export default function PutCallDistribution({ data = [], filters, onSegmentSelect }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(MAX_WIDTH);

  // Hooks must be on top level
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null });

  // Responsive container width adjustment
  useEffect(() => {
    function handleResize() {
      if (containerRef.current) {
        setContainerWidth(Math.min(containerRef.current.clientWidth, MAX_WIDTH));
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  // Filter data based on filters prop
  const filteredData = useMemo(() => {
    const result = data.filter((item) => {
      // Log item.Entry_Date for debugging
      const itemDate = item.Entry_Date ? new Date(item.Entry_Date) : null;
      if (!itemDate || isNaN(itemDate.getTime())) {
        console.warn('Invalid item.Entry_Date:', item.Entry_Date);
        return true; // Include items with invalid dates to avoid empty dataset
      }

      return Object.entries(filters).every(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return true;
        if (key === "Entry_Date") {
          if (!value || (!value.start && !value.end)) {
            console.log('No Entry_Date filter applied');
            return true;
          }
          const start = value.start ? new Date(value.start) : null;
          const end = value.end ? new Date(value.end) : null;

          // Log date comparison
          console.log('Date Filter Comparison:', {
            itemDate: item.Entry_Date,
            start: value.start,
            end: value.end,
            isValidStart: start && !isNaN(start.getTime()),
            isValidEnd: end && !isNaN(end.getTime()),
          });

          // Skip invalid dates to prevent filtering out all data
          if (start && isNaN(start.getTime())) return true;
          if (end && isNaN(end.getTime())) return true;

          return (
            (!start || itemDate >= start) &&
            (!end || itemDate <= end)
          );
        }
        if ((key === "Size" || key === "Entry_Value") && Array.isArray(value)) {
          const [min, max] = value.map(Number);
          const val = Number(item[key]);
          return !isNaN(val) && val >= min && val <= max;
        }
        return Array.isArray(value) ? value.includes(item[key]) : String(item[key]) === value;
      });
    });

    return result;
  }, [data, filters]);

  // Aggregate data for bars and strikes
  const { strikePrices, barsData, totalTrades } = useMemo(() => {
    const allStrikes = Array.from(
      new Set(data.map((item) => item.Strike_Price))
    ).sort((a, b) => a - b);
  
    const map = new Map();
    allStrikes.forEach((strike) => {
      map.set(strike, { "Buy Call": 0, "Sell Call": 0, "Buy Put": 0, "Sell Put": 0 });
    });
  
    filteredData.forEach(({ Strike_Price: strike, Option_Type, Side }) => {
      const sideKey = `${Side === "BUY" ? "Buy" : "Sell"} ${Option_Type}`;
      if (map.has(strike)) {
        map.get(strike)[sideKey]++;
      }
    });
  
    const bars = allStrikes.map((strike) => map.get(strike));
    return {
      strikePrices: allStrikes,
      barsData: bars,
      totalTrades: filteredData.length || 1,
    };
  }, [data, filteredData]);

  if (strikePrices.length === 0) {
    return <div style={{ color: "white", padding: 20 }}>No data to display.</div>;
  }
  
  // NEW: Calculate dynamic bar dimensions here
  const numBars = strikePrices.length;
  // This is the total width available for the bars and gaps
  const availableWidth = containerWidth; 
  // We'll use a fixed ratio for bar-to-gap
  const BAR_TO_GAP_RATIO = 3; 
  const totalBarWidth = availableWidth * (BAR_TO_GAP_RATIO / (BAR_TO_GAP_RATIO + 1));
  const totalGapWidth = availableWidth - totalBarWidth;

  const BAR_WIDTH = numBars > 0 ? totalBarWidth / numBars : 0;
  const GAP_BETWEEN_BARS = numBars > 1 ? totalGapWidth / (numBars - 1) : 0;


  // 3) Compute scales & ticks
  const maxStack = barsData.reduce(
    (max, bar) => Math.max(max, Object.values(bar).reduce((a, b) => a + b, 0)),
    0
  );
  const yTicks = generateYTicks(maxStack);

  const minStrike = strikePrices[0];
  const maxStrike = strikePrices[strikePrices.length - 1];
  const scaleFactor =
    (containerWidth - BAR_WIDTH - (strikePrices.length - 1) * GAP_BETWEEN_BARS) /
    (maxStrike - minStrike);
    
  // Updated bar position calculation
  function getBarLeftPosition(strike) {
    const index = strikePrices.indexOf(strike);
    return index * (BAR_WIDTH + GAP_BETWEEN_BARS);
  }

  // Calculate X-axis tick positions dynamically to avoid label overlap
  const maxLabels = Math.floor(containerWidth / maxLabelWidth);

  let skipInterval = 1;
  if (strikePrices.length > maxLabels) {
    skipInterval = Math.ceil(strikePrices.length / maxLabels);
  }

  const tickPositions = strikePrices
    .map((strike, i) => {
      if (i % skipInterval === 0) {
        return { tick: strike, left: getBarLeftPosition(strike) + BAR_WIDTH / 2 };
      }
      return null;
    })
    .filter(Boolean);

  const isBarActive = (i) => hoveredIndex === null || hoveredIndex === i;

  // Hover/tooltip logic
  let hoveredTotalLabelTop = null;
  let hoveredTotalValue = null;
  if (hoveredIndex !== null) {
    const barData = barsData[hoveredIndex];
    hoveredTotalValue = Object.values(barData).reduce((a, b) => a + b, 0);
    hoveredTotalLabelTop = MAX_BAR_HEIGHT - (hoveredTotalValue / maxStack) * MAX_BAR_HEIGHT;
  }

  function showTooltip(e, strike, barData, index) {
    const { clientX, clientY } = e;
    const percent = (count) => ((count / totalTrades) * 100).toFixed(2);

    // Convert barData to sorted array by count descending
    const sortedEntries = Object.entries(barData).sort((a, b) => b[1] - a[1]);

    setTooltip({
      visible: true,
      x: clientX + 20,
      y: clientY - 10,
      content: (
        <div
          style={{
            backgroundColor: "var(--color-background-bar)",
            padding: 0,
            borderRadius: 10,
            color: "gray",
            fontSize: 12,
            boxShadow: "0 0 10px rgba(0,0,0,0.5)",
            fontFamily: "Roboto, sans-serif",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--color-darkPurple)",
              color: "rgb(188, 188, 188)",
              padding: "12px 10px 6px",
              borderTopLeftRadius: 10,
              borderTopRightRadius: 10,
              marginBottom: 8,
              fontWeight: 600,
              width: "100%",
              display: "block",
              overflow: "hidden",
              letterSpacing: 0.6,
            }}
          >
            Strike Price: {formatStrikeLabel(strike)}
          </div>

          <div style={{ paddingBottom: 8, paddingLeft: 8, paddingRight: 8 }}>
            {sortedEntries.map(([key, value]) => (
              <div key={key} style={{ marginBottom: 4, color: "lightgray" }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: COLORS[key],
                    marginRight: 6,
                  }}
                />
                {key}: <span style={{ color: "white", fontWeight: "bold" }}>{value}</span>
                <span style={{ color: "gray", paddingLeft: 6 }}>{percent(value)} %</span>
              </div>
            ))}
          </div>
        </div>
      ),
    });

    setHoveredIndex(index);
  }

  function hideTooltip() {
    setTooltip({ visible: false });
    setHoveredIndex(null);
  }

  return (
    <div
      ref={containerRef}
      style={{
        color: "white",
        userSelect: "none",
        paddingBottom: 40,
        width: "100%",
        maxWidth: MAX_WIDTH + Y_AXIS_WIDTH,
        margin: "0 auto",
        position: "relative",
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      }}
    >
      {/* Chart container */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          height: MAX_BAR_HEIGHT + 40,
          position: "relative",
          minWidth: "100%", // use full width of containerRef
        }}
      >
        {/* Y Axis Title */}
        <div
          style={{
            width: 30,
            height: MAX_BAR_HEIGHT, // fill full height of Y axis labels container
            display: "flex",
            alignItems: "center", // vertical centering
            justifyContent: "center",
            marginRight: 2,
            userSelect: "none",
          }}
        >
          <div
            style={{
              transform: "rotate(-90deg)",
              whiteSpace: "nowrap",
              fontSize: 12,
              color: "rgb(149, 149, 149)",
              fontWeight: 500,
              letterSpacing: 1,
              fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            }}
          >
            TOTAL TRADES
          </div>
        </div>
        {/* Y Axis */}
        <div
          style={{
            width: Y_AXIS_WIDTH,
            height: MAX_BAR_HEIGHT,
            display: "flex",
            flexDirection: "column-reverse",
            justifyContent: "space-between",
            fontSize: 12,
            color: "white",
            userSelect: "none",
            paddingRight: 8,
            boxSizing: "border-box",
            position: "relative",
          }}
        >
          {yTicks.map((val) => {
            const isHoveredTick =
              hoveredIndex !== null && hoveredTotalValue !== null && val === hoveredTotalValue;
            const tickOpacity = hoveredIndex !== null ? (isHoveredTick ? 1 : 0.3) : 1;

            return (
              <div
                key={val}
                style={{
                  height: yTicks.length === 1 ? MAX_BAR_HEIGHT : MAX_BAR_HEIGHT / (yTicks.length - 1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: 4,
                  pointerEvents: "none",
                  opacity: tickOpacity,
                  transition: "opacity 0.3s ease",
                }}
              >
                {val >= 1000 ? `${val / 1000}k` : val}
              </div>
            );
          })}

          {/* Hovered total label */}
          {hoveredIndex !== null && hoveredTotalLabelTop !== null && (
            <div
              style={{
                position: "absolute",
                right: 5,
                top: hoveredTotalLabelTop,
                transform: "translateY(-50%)",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                color: "#000",
                fontWeight: "bold",
                padding: "2px 6px",
                borderRadius: 4,
                whiteSpace: "nowrap",
                pointerEvents: "none",
                zIndex: 10, // Lower from 20
                fontSize: 12,
                opacity: 1,
              }}
            >
              {hoveredTotalValue}
            </div>
          )}
        </div>

        {/* Bars container */}
        <div
          style={{
            position: "relative",
            height: MAX_BAR_HEIGHT,
            width: containerWidth,
            userSelect: "none",
          }}
        >
          {/* Bottom horizontal grid line */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: containerWidth,
              borderTop: "1.5px solid rgba(114, 114, 114, 0.3)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />

          {/* Vertical gray line for Y axis */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              height: MAX_BAR_HEIGHT,
              borderLeft: "1.5px solid rgba(114, 114, 114, 0.3)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />

          {/* Bars */}
          {strikePrices.map((strike, i) => {
            const barData = barsData[i];
            const stackOrder = ["Sell Call", "Buy Call", "Sell Put", "Buy Put"];
            const stackHeights = stackOrder.map(
              (key) => (barData[key] / maxStack) * MAX_BAR_HEIGHT
            );

            return (
              <div
                key={strike}
                style={{
                  position: "absolute",
                  left: getBarLeftPosition(strike),
                  bottom: 0,
                  width: BAR_WIDTH -3,
                  display: "flex",
                  flexDirection: "column-reverse",
                  cursor: "pointer",
                  opacity: isBarActive(i) ? 1 : 0.3,
                  transition: "opacity 0.1s ease",
                }}
                onMouseLeave={hideTooltip}
                onMouseMove={(e) => showTooltip(e, strike, barData, i)}
                onClick={() => {
                  // Get all matching rows for this strike
                  const matches = filteredData.filter((t) => t.Strike_Price === strike);

                  // Group by 4 segments
                  const grouped = {
                    "Buy Call": [],
                    "Sell Call": [],
                    "Buy Put": [],
                    "Sell Put": [],
                  };

                  matches.forEach((t) => {
                    const label = `${t.Side === "BUY" ? "Buy" : "Sell"} ${t.Option_Type}`;
                    if (grouped[label]) grouped[label].push(t);
                  });

                  onSegmentSelect?.({
                    contextId: "insight/putcalldistribution",
                    strike,
                    groupedData: grouped,
                  });
                }}
              >
                {stackOrder.map((key, idx) =>
                  stackHeights[idx] > 0 ? (
                    <div
                      key={key}
                      style={{
                        height: stackHeights[idx],
                        backgroundColor: COLORS[key],
                        border: "0.1px solid black",
                        borderRadius: 2,
                        marginBottom: 0.5,
                      }}
                    />
                  ) : null
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* X Axis labels */}
      <div
        style={{
          position: "relative",
          marginTop: 5,
          width: containerWidth,
          height: 40, // increased height to make room for title
          userSelect: "none",
          fontSize: 11,
          color: "white",
          marginLeft: Y_AXIS_WIDTH + 25, // align with bars container start
          marginRight: "auto",
        }}
      >
        {tickPositions.map(({ tick, left }) => {
          const isHoveredTick = hoveredIndex !== null && tick === strikePrices[hoveredIndex];
          const tickOpacity = hoveredIndex !== null ? (isHoveredTick ? 1 : 0.3) : 1;

          return (
            <div
              key={tick}
              style={{
                position: "absolute",
                left: left,
                bottom: 20,
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                opacity: tickOpacity,
                transition: "opacity 0.1s ease",
              }}
            >
              {formatStrikeLabel(tick)}
            </div>
          );
        })}

        {/* Hovered bar strike label exactly below hovered bar */}
        {hoveredIndex !== null && (
          <div
            style={{
              position: "absolute",
              left: getBarLeftPosition(strikePrices[hoveredIndex]) + BAR_WIDTH / 2,
              top: 0,
              transform: "translateX(-50%)",
              backgroundColor: "rgba(255,255,255,0.9)",
              color: "#000",
              fontWeight: "bold",
              padding: "2px 6px",
              borderRadius: 4,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 10, // Lower from 20
              opacity: 1,
            }}
          >
            {formatStrikeLabel(strikePrices[hoveredIndex])}
          </div>
        )}

        {/* X axis title */}
        <div
          style={{
            position: "absolute",
            top: 30,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 12,
            fontWeight: 500,
            color: "rgb(149, 149, 149)",
            userSelect: "none",
            letterSpacing: 1,
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
          }}
        >
          STRIKE PRICE
        </div>
      </div>

      {/* Legend at top-right corner */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          display: "flex",
          flexDirection: "column", // Stack vertically
          gap: 4, // Space between lines
          fontSize: 10,
          userSelect: "none",
          backgroundColor: "var(--color-background-bar)",
          padding: "8px 12px",
          borderRadius: 6,
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
          zIndex: 15, // Lower from 30
        }}
      >
        {Object.entries(COLORS).map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8}}>
            <div style={{ width: 12, height: 12, backgroundColor: color, borderRadius: 2 }} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          style={{
            position: "fixed",
            top: tooltip.y,
            left: tooltip.x,
            zIndex: 500, // Lower from 1000
            pointerEvents: "none",
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}