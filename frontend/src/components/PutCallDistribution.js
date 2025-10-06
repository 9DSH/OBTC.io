import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  getRoundedStep,
  generateYTicks,
  formatStrikeLabel,
} from "./utils/chartHelpers";

const COLORS = {
  "Sell Call": "darkorange",
  "Buy Call": "teal",
  "Sell Put": "darkred",
  "Buy Put": "green",
};

const MAX_BAR_HEIGHT = 300;
const MAX_WIDTH = 900;
const Y_AXIS_WIDTH = 30;
const MAX_LABEL_WIDTH = 80;

export default function PutCallDistribution({ data = [], filters, onSegmentSelect }) {
  const containerRef = useRef(null);
  const chartContainerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(MAX_WIDTH);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null });
  const [dragging, setDragging] = useState(false);
  const [yDragging, setYDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [startMin, setStartMin] = useState(0);
  const [startMax, setStartMax] = useState(0);
  const [startYMin, setStartYMin] = useState(0);
  const [startYMax, setStartYMax] = useState(0);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [userYMin, setUserYMin] = useState(0);
  const [userYMax, setUserYMax] = useState(0);

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

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const itemDate = item.Entry_Date ? new Date(item.Entry_Date) : null;
      if (!itemDate || isNaN(itemDate.getTime())) {
        console.warn('PutCallDistribution: Invalid item.Entry_Date:', item.Entry_Date);
        return true;
      }
      return Object.entries(filters).every(([key, value]) => {
        if (key === "BlockTrade" || !value || (Array.isArray(value) && value.length === 0)) {
          return true;
        }
        if (key === "Entry_Date") {
          if (!value || (!value.start && !value.end)) {
            return true;
          }
          const start = value.start ? new Date(value.start) : null;
          const end = value.end ? new Date(value.end) : null;
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
          const passes = !isNaN(val) && val >= min && val <= max;
          if (!passes) {
            console.log(`PutCallDistribution: Trade ${item.Trade_ID} failed filter ${key}=[${min}, ${max}], actual=${val}`);
          }
          return passes;
        }
        const passes = Array.isArray(value) ? value.includes(item[key]) : String(item[key]) === value;
        if (!passes) {
          console.log(`PutCallDistribution: Trade ${item.Trade_ID} failed filter ${key}=${value}, actual=${item[key]}`);
        }
        return passes;
      });
    });
  }, [data, filters]);

  const { autoMin, autoMax, strikePrices, barsData, totalTrades, maxStack } = useMemo(() => {
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
    const buffer = 0.2;
    const minStrike = Math.min(...allStrikes, 1000);
    const maxStrike = Math.max(...allStrikes, 1000);
    const range = maxStrike - minStrike || 1000;
    const maxStack = bars.reduce(
      (max, bar) => Math.max(max, Object.values(bar).reduce((a, b) => a + b, 0)),
      0
    );
    return {
      autoMin: Math.max(1000, Math.floor((minStrike - range * buffer) / 1000) * 1000),
      autoMax: Math.min(400000, Math.ceil((maxStrike + range * buffer) / 1000) * 1000),
      strikePrices: allStrikes,
      barsData: bars,
      totalTrades: filteredData.length || 1,
      maxStack: maxStack || 1,
    };
  }, [data, filteredData]);

  useEffect(() => {
    setMinPrice(autoMin);
    setMaxPrice(autoMax);
    setUserYMin(0);
    setUserYMax(maxStack || 1000);
  }, [autoMin, autoMax, maxStack]);

  const visibleStrikes = useMemo(() => strikePrices.filter(s => s >= minPrice && s <= maxPrice), [strikePrices, minPrice, maxPrice]);
  const visibleBarsData = useMemo(() => visibleStrikes.map(strike => barsData[strikePrices.indexOf(strike)]), [visibleStrikes, barsData, strikePrices]);
  const yTicks = useMemo(() => {
    const range = userYMax - userYMin;
    if (range <= 0) return [0, 250, 500, 750, 1000];
    return generateYTicks(range, MAX_BAR_HEIGHT).map(t => t + userYMin);
  }, [userYMin, userYMax]);

  if (visibleStrikes.length === 0) {
    return <div style={{ color: "white", padding: 20 }}>No data to display.</div>;
  }

  const numBars = visibleStrikes.length;
  const BAR_TO_GAP_RATIO = 3;
  const totalBarWidth = containerWidth * (BAR_TO_GAP_RATIO / (BAR_TO_GAP_RATIO + 1));
  const totalGapWidth = containerWidth - totalBarWidth;
  const BAR_WIDTH = numBars > 0 ? totalBarWidth / numBars : 0;
  const GAP_BETWEEN_BARS = numBars > 1 ? totalGapWidth / (numBars - 1) : 0;

  const minStrike = visibleStrikes[0];
  const maxStrike = visibleStrikes[visibleStrikes.length - 1];
  const scaleFactor =
    (containerWidth - BAR_WIDTH - (visibleStrikes.length - 1) * GAP_BETWEEN_BARS) /
    (maxStrike - minStrike || 1);

  function getBarLeftPosition(strike) {
    const index = visibleStrikes.indexOf(strike);
    return index * (BAR_WIDTH + GAP_BETWEEN_BARS);
  }

  const maxLabels = Math.floor(containerWidth / MAX_LABEL_WIDTH);
  const skipInterval = visibleStrikes.length > maxLabels ? Math.ceil(visibleStrikes.length / maxLabels) : 1;
  const tickPositions = visibleStrikes
    .map((strike, i) => {
      if (i % skipInterval === 0) {
        return { tick: strike, left: getBarLeftPosition(strike) + BAR_WIDTH / 2 };
      }
      return null;
    })
    .filter(Boolean);

  const isBarActive = (i) => hoveredIndex === null || hoveredIndex === i;

  let hoveredTotalLabelTop = null;
  let hoveredTotalValue = null;
  if (hoveredIndex !== null) {
    const barData = visibleBarsData[hoveredIndex];
    hoveredTotalValue = Object.values(barData).reduce((a, b) => a + b, 0);
    hoveredTotalLabelTop = MAX_BAR_HEIGHT - ((hoveredTotalValue - userYMin) / (userYMax - userYMin)) * MAX_BAR_HEIGHT;
  }

  function showTooltip(e, strike, barData, index) {
    const { clientX, clientY } = e;
    const percent = (count) => ((count / totalTrades) * 100).toFixed(2);
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
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          height: MAX_BAR_HEIGHT + 40,
          position: "relative",
          minWidth: "100%",
        }}
      >
        <div
          style={{
            width: 30,
            height: MAX_BAR_HEIGHT,
            display: "flex",
            alignItems: "center",
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
              hoveredIndex !== null && hoveredTotalValue !== null && Math.abs(val - hoveredTotalValue) < 0.01;
            const tickOpacity = hoveredIndex !== null ? (isHoveredTick ? 1 : 0.3) : 1;
            return (
              <div
                key={val}
                style={{
                  height: yTicks.length <= 1 ? MAX_BAR_HEIGHT : MAX_BAR_HEIGHT / (yTicks.length - 1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: 4,
                  pointerEvents: "none",
                  opacity: tickOpacity,
                  transition: "opacity 0.3s ease",
                }}
              >
                {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              </div>
            );
          })}
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
                zIndex: 10,
                fontSize: 12,
                opacity: 1,
              }}
            >
              {hoveredTotalValue}
            </div>
          )}
        </div>
        <div
          ref={chartContainerRef}
          style={{
            position: "relative",
            height: MAX_BAR_HEIGHT,
            width: containerWidth,
            userSelect: "none",
          }}
          onMouseDown={(e) => {
            const rect = chartContainerRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            if (mouseX < 55) {
              setYDragging(true);
              setStartY(e.clientY);
              setStartYMin(userYMin);
              setStartYMax(userYMax);
            } else {
              setDragging(true);
              setStartX(e.clientX);
              setStartMin(minPrice);
              setStartMax(maxPrice);
            }
          }}
          onMouseMove={(e) => {
            if (dragging) {
              const delta = e.clientX - startX;
              const rect = chartContainerRef.current.getBoundingClientRect();
              const chartWidth = rect.width;
              const range = startMax - startMin;
              const shift = (delta / chartWidth) * range * -1;
              let newMin = startMin + shift;
              let newMax = startMax + shift;
              newMin = Math.max(1000, Math.min(newMin, 400000 - range));
              newMax = Math.min(400000, Math.max(newMax, 1000 + range));
              if (newMin < newMax) {
                setMinPrice(newMin);
                setMaxPrice(newMax);
              }
            } else if (yDragging) {
              const deltaY = e.clientY - startY;
              const rect = chartContainerRef.current.getBoundingClientRect();
              const chartHeight = rect.height;
              const rangeY = startYMax - startYMin;
              const shift = -(deltaY / chartHeight) * rangeY;
              let newYMin = Math.max(0, startYMin + shift);
              let newYMax = startYMax + shift;
              if (newYMin < newYMax) {
                setUserYMin(newYMin);
                setUserYMax(newYMax);
              }
            }
          }}
          onMouseUp={() => {
            setDragging(false);
            setYDragging(false);
          }}
          onMouseLeave={() => {
            setDragging(false);
            setYDragging(false);
            hideTooltip();
          }}
          onWheel={(e) => {
            e.preventDefault();
            const rect = chartContainerRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            if (mouseX < 55) {
              const currentRange = userYMax - userYMin;
              const marginTop = 40;
              const marginBottom = 60;
              const plotHeight = rect.height - marginTop - marginBottom;
              const fractionFromTop = Math.max(0, Math.min(1, (mouseY - marginTop) / plotHeight));
              const pos = userYMax - fractionFromTop * currentRange;
              const factor = e.deltaY > 0 ? 1.05 : 1 / 1.05;
              let newRange = currentRange * factor;
              if (newRange < 1) newRange = 1;
              const fractionFromMin = (pos - userYMin) / currentRange;
              let newYMin = Math.max(0, pos - fractionFromMin * newRange);
              let newYMax = pos + (1 - fractionFromMin) * newRange;
              if (newYMin < newYMax) {
                setUserYMin(newYMin);
                setUserYMax(newYMax);
              }
            } else {
              const chartWidth = rect.width;
              const currentRange = maxPrice - minPrice;
              const fraction = mouseX / chartWidth;
              const pos = minPrice + fraction * currentRange;
              const factor = e.deltaY > 0 ? 1.05 : 1 / 1.05;
              const newRange = currentRange * factor;
              const minRange = 1000;
              const maxRange = 400000 - 1000;
              const clampedNewRange = Math.max(minRange, Math.min(newRange, maxRange));
              let newMin = pos - fraction * clampedNewRange;
              let newMax = pos + (1 - fraction) * clampedNewRange;
              newMin = Math.max(1000, newMin);
              newMax = Math.min(400000, newMax);
              if (newMin < newMax) {
                setMinPrice(newMin);
                setMaxPrice(newMax);
              }
            }
          }}
        >
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
          {visibleStrikes.map((strike, i) => {
            const barData = visibleBarsData[i];
            const stackOrder = ["Sell Call", "Buy Call", "Sell Put", "Buy Put"];
            const stackHeights = stackOrder.map(
              (key) => Math.max(0, ((barData[key] - userYMin) / (userYMax - userYMin)) * MAX_BAR_HEIGHT)
            );
            return (
              <div
                key={strike}
                style={{
                  position: "absolute",
                  left: getBarLeftPosition(strike),
                  bottom: 0,
                  width: BAR_WIDTH - 3,
                  display: "flex",
                  flexDirection: "column-reverse",
                  cursor: "pointer",
                  opacity: isBarActive(i) ? 1 : 0.3,
                  transition: "opacity 0.1s ease",
                }}
                onMouseLeave={hideTooltip}
                onMouseMove={(e) => showTooltip(e, strike, barData, i)}
                onClick={() => {
                  const matches = filteredData.filter((t) => t.Strike_Price === strike);
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
      <div
        style={{
          position: "relative",
          marginTop: 5,
          width: containerWidth,
          height: 40,
          userSelect: "none",
          fontSize: 11,
          color: "white",
          marginLeft: Y_AXIS_WIDTH + 25,
          marginRight: "auto",
        }}
      >
        {tickPositions.map(({ tick, left }) => {
          const isHoveredTick = hoveredIndex !== null && tick === visibleStrikes[hoveredIndex];
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
        {hoveredIndex !== null && (
          <div
            style={{
              position: "absolute",
              left: getBarLeftPosition(visibleStrikes[hoveredIndex]) + BAR_WIDTH / 2,
              top: 0,
              transform: "translateX(-50%)",
              backgroundColor: "rgba(255,255,255,0.9)",
              color: "#000",
              fontWeight: "bold",
              padding: "2px 6px",
              borderRadius: 4,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 10,
              opacity: 1,
            }}
          >
            {formatStrikeLabel(visibleStrikes[hoveredIndex])}
          </div>
        )}
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
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          fontSize: 10,
          userSelect: "none",
          backgroundColor: "var(--color-background-bar)",
          padding: "8px 12px",
          borderRadius: 6,
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
          zIndex: 15,
        }}
      >
        {Object.entries(COLORS).map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8}}>
            <div style={{ width: 12, height: 12, backgroundColor: color, borderRadius: 2 }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
      {tooltip.visible && (
        <div
          style={{
            position: "fixed",
            top: tooltip.y,
            left: tooltip.x,
            zIndex: 500,
            pointerEvents: "none",
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}