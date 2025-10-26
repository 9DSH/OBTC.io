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

const MAX_HEIGHT = 290;
const MAX_WIDTH = 850;
const GAP_X = 10;
const Y_AXIS_WIDTH = 40;
const MAX_LABEL_WIDTH = 80;
const TOP_PADDING = 20;
const MAX_Y = 10000000; // Arbitrary upper bound for y (adjust based on your maxEntry data, e.g., maxEntry * 10)

function formatLargeNumber(value) {
  if (value >= 1e6) return (value / 1e6).toFixed(1) + "M";
  if (value >= 1e3) return (value / 1e3).toFixed(0) + "k";
  if (value <= 1000) return value.toFixed(0);
  return value.toString();
}

function generateTooltipContent(closest, strategyGroup) {
  const formatCategory = (trade) => {
    const { Side, Option_Type } = trade;
    const label = `${Side === "BUY" ? "Buy" : "Sell"} ${Option_Type}`;
    const color = COLORS[label] || "white";
    const triangleUp = label === "Buy Call" || label === "Sell Put";
    const triangle = triangleUp ? "▲" : "▼";
    return `
      <span style="display: inline-flex; align-items: center; gap: 4px; margin-right: 10px;">
        <span style="color:${color}; font-size: 14px;">${triangle}</span>
        <span style="color: white; font-weight: bold;">${label}</span>
      </span>
    `;
  };

  let contentHtml = `<div style="color: white; font-weight: bold; margin-bottom: 6px; font-size: 15px;">
    ${strategyGroup ? `Strategy` : "Single Trade"}
  </div>`;

  if (strategyGroup) {
    const legLabels = strategyGroup.group.map(formatCategory).join("");
    contentHtml += `<div style="display: flex; flex-wrap: wrap;">${legLabels}</div>`;
  } else {
    contentHtml += `<div>${formatCategory(closest)}</div>`;
  }

  return contentHtml;
}

export default function PremiumByStrike({
  data = [],
  filters,
  onSegmentSelect,
  strategyData = [],
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(MAX_WIDTH);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    content: null,
  });
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [highlightedGroup, setHighlightedGroup] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [yDragging, setYDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [startMin, setStartMin] = useState(0);
  const [startMax, setStartMax] = useState(0);
  const [startYMin, setStartYMin] = useState(0);
  const [startYMax, setStartYMax] = useState(0);
  const [minPrice, setMinPrice] = useState(1000);
  const [maxPrice, setMaxPrice] = useState(400000);
  const [userYMin, setUserYMin] = useState(0);
  const [userYMax, setUserYMax] = useState(1000);

  // Group trades by ComboTrade_IDs, or Combo_ID with BlockTrade_IDs, or single trades
  const strategyGroups = useMemo(() => {
    const grouped = {};
    const tradeIds = new Set();
    for (const d of data) {
      if (!d.Trade_ID) {
        console.warn("Trade missing Trade_ID:", d);
        continue;
      }
      let groupKey;
      if (d.ComboTrade_IDs && d.ComboTrade_IDs !== "null") {
        groupKey = `combo:${d.ComboTrade_IDs}`;
      } else if (d.Combo_ID && d.Combo_ID !== "null" && d.BlockTrade_IDs && d.BlockTrade_IDs !== "null") {
        groupKey = `combo_id:${d.Combo_ID}:block:${d.BlockTrade_IDs}`;
      } else if (d.Combo_ID && d.Combo_ID !== "null") {
        groupKey = `combo_id:${d.Combo_ID}`;
      } else if (d.BlockTrade_IDs && d.BlockTrade_IDs !== "null") {
        groupKey = `block:${d.BlockTrade_IDs}`;
      } else {
        groupKey = `trade:${d.Trade_ID}`;
      }
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          group: [],
          id: d.ComboTrade_IDs || d.Combo_ID || d.BlockTrade_IDs || d.Trade_ID,
          blockId: d.BlockTrade_IDs,
          comboId: d.Combo_ID,
          comboTradeId: d.ComboTrade_IDs,
        };
      }
      tradeIds.add(d.Trade_ID);
      grouped[groupKey].group.push(d);
    }
    console.debug("Grouped Trades in PremiumByStrike:", {
      groupCount: Object.keys(grouped).length,
      groups: Object.fromEntries(
        Object.entries(grouped).map(([groupKey, { group, id, blockId, comboId, comboTradeId }]) => [
          groupKey,
          { id, blockId, comboId, comboTradeId, count: group.length, tradeIds: group.map((t) => t.Trade_ID) },
        ])
      ),
    });
    return grouped;
  }, [data]);

  // Validate data
  useEffect(() => {
    data.forEach((d, i) => {
      if (!d.Trade_ID) console.warn(`Trade at index ${i} missing Trade_ID`);
      if (!d.Strike_Price) console.warn(`Trade at index ${i} missing Strike_Price`);
      if (!d.Entry_Value) console.warn(`Trade at index ${i} missing Entry_Value`);
    });
  }, [data]);

  // Resize handler
  useEffect(() => {
    function onResize() {
      if (containerRef.current) {
        setContainerWidth(Math.min(containerRef.current.clientWidth, MAX_WIDTH));
      }
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Identify group for a trade based on ComboTrade_IDs, Combo_ID with BlockTrade_IDs, or single trade
  const identifyBlockTradeGroup = (trade) => {
    let groupKey;
    if (trade.ComboTrade_IDs && trade.ComboTrade_IDs !== "null") {
      groupKey = `combo:${trade.ComboTrade_IDs}`;
    } else if (trade.Combo_ID && trade.Combo_ID !== "null" && trade.BlockTrade_IDs && trade.BlockTrade_IDs !== "null") {
      groupKey = `combo_id:${trade.Combo_ID}:block:${trade.BlockTrade_IDs}`;
    } else if (trade.Combo_ID && trade.Combo_ID !== "null") {
      groupKey = `combo_id:${trade.Combo_ID}`;
    } else if (trade.BlockTrade_IDs && trade.BlockTrade_IDs !== "null") {
      groupKey = `block:${trade.BlockTrade_IDs}`;
    } else {
      groupKey = `trade:${trade.Trade_ID}`;
    }
    const groupData = strategyGroups[groupKey];
    // Return null for single trades or groups with only one trade
    if (!groupData || groupData.group.length <= 1) {
      return null;
    }
    return {
      id: groupData.id,
      group: groupData.group,
      blockId: groupData.blockId,
      comboId: groupData.comboId,
      comboTradeId: groupData.comboTradeId,
    };
  };

  // Extract all strikes sorted ascending
  const fullStrikes = useMemo(() => {
    const allStrikes = [...new Set(data.map((d) => d.Strike_Price))];
    return allStrikes.sort((a, b) => a - b);
  }, [data]);

  const { autoMin, autoMax } = useMemo(() => {
    const minStrike = fullStrikes[0] ?? 0;
    const maxStrike = fullStrikes[fullStrikes.length - 1] ?? 0;
    const range = maxStrike - minStrike || 10000;
    const buffer = 5;
    const autoMin = Math.max(1000, Math.floor((minStrike - range * buffer) / 1000) * 1000);
    const autoMax = Math.min(400000, Math.ceil((maxStrike + range * buffer) / 1000) * 1000);
    return { autoMin, autoMax };
  }, [fullStrikes]);

  useEffect(() => {
    setMinPrice(autoMin);
    setMaxPrice(autoMax);
  }, [autoMin, autoMax]);

  // Filter data per filters prop, applying BlockTrade filter explicitly
  const filtered = useMemo(() => {
    const result = data.filter((item) => {
      // Apply BlockTrade filter explicitly
      if (filters?.BlockTrade) {
        const isBlockTrade = item.BlockTrade_IDs && 
                            String(item.BlockTrade_IDs).trim() !== "" &&
                            String(item.BlockTrade_IDs) !== "null" && 
                            String(item.BlockTrade_IDs) !== "-";
        if (!isBlockTrade) {
         return false;
        }
      }

      const itemDate = item.Entry_Date ? new Date(item.Entry_Date) : null;
      if (!itemDate || isNaN(itemDate.getTime())) {
        return true; // Include items with invalid dates to avoid empty dataset
      }

      return Object.entries(filters).every(([k, v]) => {
        if (k === "BlockTrade" || !v || (Array.isArray(v) && v.length === 0)) {
          return true; // Skip redundant BlockTrade check since handled above
        }
        if (k === "Entry_Date") {
          if (!v || (!v.start && !v.end)) {
            console.log('PremiumByStrike No Entry_Date filter applied');
            return true;
          }
          const start = v.start ? new Date(v.start) : null;
          const end = v.end ? new Date(v.end) : null;

          if (start && isNaN(start.getTime())) return true;
          if (end && isNaN(end.getTime())) return true;

          return (
            (!start || itemDate >= start) &&
            (!end || itemDate <= end)
          );
        }
        if ((k === "Size" || k === "Entry_Value") && Array.isArray(v)) {
          const [min, max] = v.map(Number),
            num = Number(item[k]);
          const passes = !isNaN(num) && num >= min && num <= max;

          return passes;
        }
        const passes = Array.isArray(v) ? v.includes(item[k]) : String(item[k]) === v;

        return passes;
      });
    });

    return result;
  }, [data, filters]);

  // Group filtered data by Strike and label, track max entry for scale
  const { groups, maxEntry, yMin, yMax } = useMemo(() => {
    const m = new Map();
    let max = 0;
    filtered.forEach((d) => {
      const s = d.Strike_Price;
      const label = `${d.Side === "BUY" ? "Buy" : "Sell"} ${d.Option_Type}`;
      if (!m.has(s)) m.set(s, []);
      m.get(s).push({ label, value: d.Entry_Value, raw: d });
      max = Math.max(max, d.Entry_Value);
    });
    return { groups: m, maxEntry: max, yMin: 0, yMax: max || 1000 };
  }, [filtered]);

  useEffect(() => {
    setUserYMin(yMin);
    setUserYMax(yMax);
  }, [yMin, yMax]);

  // Fallback safe values for scales
  const safeStrikes = fullStrikes.length > 0 ? fullStrikes : [0];
  const safeMaxEntry = maxEntry || 1;

  // Displayed strikes based on zoom
  const displayedStrikes = useMemo(() => {
    let strikes = fullStrikes.filter((s) => s >= minPrice && s <= maxPrice).sort((a, b) => a - b);
    if (strikes.length === 0) {
      strikes = [...fullStrikes].sort((a, b) => a - b);
    }
    return strikes;
  }, [fullStrikes, minPrice, maxPrice]);

  const minDisplayed = displayedStrikes[0] ?? 0;
  const maxDisplayed = displayedStrikes[displayedStrikes.length - 1] ?? 0;

  // Scales for coordinates
  const xScale =
    (containerWidth - (displayedStrikes.length - 1) * GAP_X) / (maxDisplayed - minDisplayed || 1);
  const getX = (s) => (s - minDisplayed) * xScale + displayedStrikes.indexOf(s) * GAP_X;
  const yRange = userYMax - userYMin || 1;
  const plotHeight = MAX_HEIGHT - TOP_PADDING;
  const getHeight = (v) => ((v - userYMin) / yRange) * plotHeight;
  const getY = (v) => MAX_HEIGHT - getHeight(v);

  // Generate Y ticks
  const yTicks = useMemo(() => {
    const numTicksTarget = 2;
    const tickStep = getRoundedStep((userYMax - userYMin) / numTicksTarget);
    const firstTick = Math.ceil(userYMin / tickStep) * tickStep;
    const ticks = [];
    for (let t = firstTick; t <= userYMax; t += tickStep) {
      ticks.push(t);
    }
    return ticks;
  }, [userYMin, userYMax]);

  // Compute points for canvas drawing
  const points = useMemo(() => {
    let pts = [];
    displayedStrikes.forEach((s) => {
      (groups.get(s) || []).forEach((pt) => {
        const v = pt.value;
        if (v < userYMin || v > userYMax) return;
        const x = getX(s);
        const y = getY(v);
        const color = COLORS[pt.label];
        pts.push({ x, y, color, raw: pt.raw });
      });
    });
    return pts;
  }, [displayedStrikes, groups, userYMin, userYMax, containerWidth, minPrice, maxPrice]);

  // Draw points on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    points.forEach(({ x, y, color, raw }) => {
      const optionLabel = `${raw.Side === "BUY" ? "Buy" : "Sell"} ${raw.Option_Type}`;
      const isUpward = optionLabel === "Buy Call" || optionLabel === "Sell Put";
      const isDim = highlightedGroup && !highlightedGroup.includes(raw.Trade_ID);
      const triangleSize = 5;

      ctx.globalAlpha = isDim ? 0.15 : 1.0;
      ctx.fillStyle = color;
      ctx.beginPath();

      if (isUpward) {
        ctx.moveTo(x, y - triangleSize);
        ctx.lineTo(x - triangleSize, y + triangleSize);
        ctx.lineTo(x + triangleSize, y + triangleSize);
      } else {
        ctx.moveTo(x, y + triangleSize);
        ctx.lineTo(x - triangleSize, y - triangleSize);
        ctx.lineTo(x + triangleSize, y - triangleSize);
      }
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha = 1.0;

      if (highlightedGroup && highlightedGroup.includes(raw.Trade_ID)) {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.beginPath();
        const highlightSize = 6;
        if (isUpward) {
          ctx.moveTo(x, y - highlightSize);
          ctx.lineTo(x - highlightSize, y + highlightSize);
          ctx.lineTo(x + highlightSize, y + highlightSize);
        } else {
          ctx.moveTo(x, y + highlightSize);
          ctx.lineTo(x - highlightSize, y - highlightSize);
          ctx.lineTo(x + highlightSize, y - highlightSize);
        }
        ctx.closePath();
        ctx.stroke();
      }
    });
  }, [points, highlightedGroup, containerWidth]);

  // Mouse move handler for hover detection & tooltip
  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const radius = 8;

    let closest = null;
    let closestDist = Infinity;
    for (const pt of points) {
      const dx = pt.x - mouseX;
      const dy = pt.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius && dist < closestDist) {
        closest = pt;
        closestDist = dist;
      }
    }

    if (closest) {
      setHoveredPoint(closest);
      const strategyGroup = identifyBlockTradeGroup(closest.raw);
      setHighlightedGroup(strategyGroup ? strategyGroup.group.map((t) => t.Trade_ID) : [closest.raw.Trade_ID]);

      const tooltipContent = generateTooltipContent(closest.raw, strategyGroup);

      setTooltip({
        visible: true,
        x: e.clientX + 20,
        y: e.clientY - 10,
        content: tooltipContent,
      });
    } else {
      setHoveredPoint(null);
      setHighlightedGroup(null);
      setTooltip((t) => ({ ...t, visible: false }));
    }

    if (dragging) {
      const delta = e.clientX - startX;
      const plotWidth = rect.width - Y_AXIS_WIDTH;
      const range = startMax - startMin;
      const shift = (delta / plotWidth) * range * -1;
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
      const rangeY = startYMax - startYMin;
      const shift = - (deltaY / plotHeight) * rangeY;
      const newYMin = 0; // Anchor yMin at 0
      let newYMax = startYMax + shift;
      newYMax = Math.min(MAX_Y, Math.max(newYMax, 1)); // Ensure min range of 1
      if (newYMin < newYMax) {
        setUserYMin(newYMin);
        setUserYMax(newYMax);
      }
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setHighlightedGroup(null);
    setTooltip((t) => ({ ...t, visible: false }));
    setDragging(false);
    setYDragging(false);
  };

  // Click handler to send selected group or single trade
  const handleClick = () => {
    if (!hoveredPoint) return;

    const strategyGroup = identifyBlockTradeGroup(hoveredPoint.raw);
    const selectedGroup = strategyGroup ? strategyGroup.group : [hoveredPoint.raw];

    console.debug("Selected Segment:", {
      tradeId: hoveredPoint.raw.Trade_ID,
      id: strategyGroup ? strategyGroup.id : hoveredPoint.raw.Trade_ID,
      blockId: strategyGroup ? strategyGroup.blockId : hoveredPoint.raw.BlockTrade_IDs,
      comboId: strategyGroup ? strategyGroup.comboId : hoveredPoint.raw.Combo_ID,
      comboTradeId: strategyGroup ? strategyGroup.comboTradeId : hoveredPoint.raw.ComboTrade_IDs,
      groupSize: selectedGroup.length,
      trades: selectedGroup.map((t) => ({
        Trade_ID: t.Trade_ID,
        ComboTrade_IDs: t.ComboTrade_IDs,
        Combo_ID: t.Combo_ID,
        BlockTrade_IDs: t.BlockTrade_IDs,
        Strike_Price: t.Strike_Price,
        Option_Type: t.Option_Type,
        Side: t.Side,
      })),
    });

    onSegmentSelect?.({
      selectedSegment: {
        trades: selectedGroup,
      },
      contextId: "insight/premiumbystrike",
    });
  };

  // X axis label skipping to prevent overlap
  const maxLabels = Math.floor(containerWidth / MAX_LABEL_WIDTH);
  const skip = displayedStrikes.length > maxLabels ? Math.ceil(displayedStrikes.length / maxLabels) : 1;

  // Label collision handling for hovered group
  const labelCollisionHandling = () => {
    if (!hoveredPoint) return null;

    const groupPoints = highlightedGroup
      ? points.filter((pt) => highlightedGroup.includes(pt.raw.Trade_ID))
      : [hoveredPoint];

    const sortedByX = [...groupPoints].sort((a, b) => a.x - b.x);
    const sortedByY = [...groupPoints].sort((a, b) => a.y - b.y);

    const strikeOffsets = {};
    const minDistanceX = 40;
    for (let i = 0; i < sortedByX.length; i++) {
      const pt = sortedByX[i];
      let offset = 0;
      if (i > 0) {
        const prevPt = sortedByX[i - 1];
        const gap = pt.x + offset - (prevPt.x + strikeOffsets[prevPt.raw.Trade_ID] || 0);
        if (gap < minDistanceX) {
          offset = (strikeOffsets[prevPt.raw.Trade_ID] || 0) + (minDistanceX - gap);
        }
      }
      strikeOffsets[pt.raw.Trade_ID] = offset;
    }

    const entryOffsets = {};
    const minDistanceY = 25;
    for (let i = 0; i < sortedByY.length; i++) {
      const pt = sortedByY[i];
      let offset = 0;
      if (i > 0) {
        const prevPt = sortedByY[i - 1];
        const gap = pt.y + offset - (prevPt.y + entryOffsets[prevPt.raw.Trade_ID] || 0);
        if (gap < minDistanceY) {
          offset = (entryOffsets[prevPt.raw.Trade_ID] || 0) + (minDistanceY - gap);
        }
      }
      entryOffsets[pt.raw.Trade_ID] = offset;
    }

    return {
      groupPoints,
      strikeOffsets,
      entryOffsets,
    };
  };

  const labelData = labelCollisionHandling();

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        maxWidth: MAX_WIDTH + Y_AXIS_WIDTH,
        margin: "0 auto",
        position: "relative",
        color: "white",
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        paddingBottom: 40,
        userSelect: "none",
        paddingTop: 45,
      }}
    >
      {safeStrikes.length === 0 ? (
        <div style={{ color: "white", padding: 20 }}>No data to display.</div>
      ) : (
        <>
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              background: "var(--color-background-bar)",
              padding: "8px 12px",
              borderRadius: 6,
              fontSize: 10,
              display: "flex",
              flexDirection: "column",
              gap: 1,
              zIndex: 30,
              userSelect: "none",
              opacity: 1,
            }}
          >
            {Object.entries(COLORS).map(([label, color]) => {
              const triangleUp = label === "Buy Call" || label === "Sell Put";
              const triangle = triangleUp ? "▲" : "▼";
              return (
                <div
                  key={label}
                  style={{ display: "flex", alignItems: "center", gap: 8, color: "white" }}
                >
                  <span style={{ color, fontSize: 12 }}>{triangle}</span>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>

          <div
            ref={chartRef}
            style={{ display: "flex", alignItems: "flex-end", position: "relative" }}
            onMouseDown={(e) => {
              const rect = chartRef.current.getBoundingClientRect();
              const mouseX = e.clientX - rect.left;
              setStartX(e.clientX);
              setStartY(e.clientY);
              setStartMin(minPrice);
              setStartMax(maxPrice);
              setStartYMin(userYMin);
              setStartYMax(userYMax);
              if (mouseX < Y_AXIS_WIDTH) {
                setYDragging(true);
              } else {
                setDragging(true);
              }
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={() => {
              setDragging(false);
              setYDragging(false);
            }}
            onMouseLeave={handleMouseLeave}
            onWheel={(e) => {
              e.preventDefault();
              const rect = chartRef.current.getBoundingClientRect();
              const mouseX = e.clientX - rect.left;
              const mouseY = e.clientY - rect.top;
              const yAxisWidth = Y_AXIS_WIDTH;
              if (mouseX < yAxisWidth) {
                // Y zoom, keep yMin at 0
                const currentRange = userYMax - userYMin;
                const marginTop = TOP_PADDING;
                const marginBottom = 0;
                const fractionFromTop = Math.max(0, Math.min(1, (mouseY - marginTop) / plotHeight));
                const pos = userYMax - fractionFromTop * currentRange;
                const factor = e.deltaY > 0 ? 1.1 : 0.9;
                let newRange = currentRange * factor;
                const minRangeY = 1;
                const maxRangeY = MAX_Y;
                newRange = Math.max(minRangeY, Math.min(newRange, maxRangeY));
                const newYMin = 0; // Anchor yMin at 0
                const newYMax = newRange; // Since yMin is 0, yMax is the full range
                if (newYMin < newYMax) {
                  setUserYMin(newYMin);
                  setUserYMax(newYMax);
                }
              } else {
                // X zoom
                const plotWidth = rect.width - yAxisWidth;
                const mousePlotX = mouseX - yAxisWidth;
                const fraction = mousePlotX / plotWidth;
                const currentRange = maxPrice - minPrice;
                const pos = minPrice + fraction * currentRange;
                const factor = e.deltaY > 0 ? 1.1 : 0.9;
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
                width: Y_AXIS_WIDTH,
                height: MAX_HEIGHT,
                position: "relative",
                fontSize: 12,
                boxSizing: "border-box",
                color: "white",
                userSelect: "none",
              }}
            >
              {yTicks.map((t) => (
                <div
                  key={t}
                  style={{
                    position: "absolute",
                    top: `${getY(t)}px`,
                    right: 10,
                    transform: "translateY(-50%)",
                    fontSize: 11,
                    opacity: hoveredPoint ? 0.3 : 1,
                    transition: "opacity 0.1s ease",
                  }}
                >
                  {formatLargeNumber(t)}
                </div>
              ))}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: -60,
                  transform: "translateY(-50%) rotate(-90deg)",
                  fontSize: 12,
                  color: "rgb(149, 149, 149)",
                  fontWeight: 500,
                  letterSpacing: 1,
                  fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                  userSelect: "none",
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                }}
              >
                ENTRY VALUE
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={containerWidth}
              height={MAX_HEIGHT}
              style={{
                cursor: hoveredPoint ? "pointer" : "default",
                display: "block",
                width: "100%",
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={handleClick}
            />

            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: Y_AXIS_WIDTH - 1,
                height: MAX_HEIGHT,
                borderLeft: "1.5px solid rgba(114, 114, 114, 0.3)",
                pointerEvents: "none",
                zIndex: 1,
              }}
            />

            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: Y_AXIS_WIDTH,
                width: containerWidth,
                borderTop: "1.5px solid rgba(114, 114, 114, 0.3)",
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
          </div>

          <div style={{ position: "relative", height: 40, marginLeft: Y_AXIS_WIDTH }}>
            {displayedStrikes.map(
              (s, i) =>
                i % skip === 0 && (
                  <div
                    key={s}
                    style={{
                      position: "absolute",
                      left: getX(s),
                      transform: "translateX(-50%)",
                      fontSize: 11,
                      whiteSpace: "nowrap",
                      marginTop: 10,
                      opacity: hoveredPoint ? 0.3 : 1,
                      transition: "opacity 0.1s ease",
                    }}
                  >
                    {formatStrikeLabel(s)}
                  </div>
                )
            )}
            <div
              style={{
                position: "absolute",
                top: 40,
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

          {labelData &&
            labelData.groupPoints.map((pt) => (
              <React.Fragment key={pt.raw.Trade_ID}>
                <div
                  style={{
                    position: "absolute",
                    left: Y_AXIS_WIDTH + pt.x + (labelData.strikeOffsets[pt.raw.Trade_ID] || 0),
                    top: MAX_HEIGHT + 50,
                    transform: "translateX(-30%)",
                    backgroundColor: "white",
                    color: "black",
                    fontWeight: "600",
                    padding: "2px 6px",
                    borderRadius: 4,
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                    userSelect: "none",
                    fontSize: 12,
                    zIndex: 20,
                    boxShadow: "0 0 8px rgba(46, 46, 46, 0.6)",
                  }}
                >
                  {formatStrikeLabel(pt.raw.Strike_Price)}
                </div>

                <div
                  style={{
                    position: "absolute",
                    left: -10,
                    top: Math.min(
                      pt.y + (labelData.entryOffsets[pt.raw.Trade_ID] || 0),
                      MAX_HEIGHT - 10
                    ),
                    marginTop: 40,
                    backgroundColor: "white",
                    color: "black",
                    fontWeight: "600",
                    padding: "2px 6px",
                    borderRadius: 4,
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                    userSelect: "none",
                    fontSize: 12,
                    zIndex: 20,
                    boxShadow: "0 0 8px rgba(67, 67, 67, 0.6)",
                  }}
                >
                  {formatLargeNumber(Number(pt.raw.Entry_Value))}
                </div>
              </React.Fragment>
            ))}

          {tooltip.visible && (
            <div
              style={{
                position: "fixed",
                left: tooltip.x,
                top: tooltip.y,
                backgroundColor: "var(--color-background-bar)",
                color: "white",
                padding: 8,
                fontSize: 12,
                borderRadius: 6,
                pointerEvents: "none",
                whiteSpace: "nowrap",
                maxWidth: 400,
                zIndex: 50,
              }}
              dangerouslySetInnerHTML={{ __html: tooltip.content }}
            />
          )}
        </>
      )}
    </div>
  );
}