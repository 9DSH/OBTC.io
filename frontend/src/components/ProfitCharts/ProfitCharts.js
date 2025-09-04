import React, { useMemo, useState, useEffect, useRef } from "react";
import { IconButton } from "@mui/material";
import CustomTooltip from "../CustomTooltip";
import HeatmapChart from "./HeatmapChart";
import LineChartCanvas from "./LineChartCanvas";
import { getRoundedStep } from "../utils/chartHelpers";
import DateAxisSlider from "./utils/DateAxisSlider";
// Debug imports to catch issues
console.debug("ProfitCharts: Imported HeatmapChart", !!HeatmapChart);
console.debug("ProfitCharts: Imported LineChartCanvas", !!LineChartCanvas);

// Helper functions for Black-Scholes
function normCDF(x) {
  return (1.0 + erf(x / Math.sqrt(2))) / 2.0;
}

function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 = 0.254829592,
    a2 = -0.284496736,
    a3 = 1.421413741,
    a4 = -1.453152027,
    a5 = 1.061405429,
    p = 0.3275911;

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);

  return sign * y;
}

function blackScholes(underlyingPrice, strikePrice, timeToExp, riskFreeRate, impliedVol, optionType) {
  if (timeToExp <= 0 || impliedVol <= 0 || underlyingPrice <= 0 || strikePrice <= 0) {
    console.warn("Invalid Black-Scholes inputs:", { underlyingPrice, strikePrice, timeToExp, impliedVol, optionType });
    return 0;
  }
  const sqrtTime = Math.sqrt(timeToExp);
  const d1 =
    (Math.log(underlyingPrice / strikePrice) +
      (riskFreeRate + 0.5 * impliedVol * impliedVol) * timeToExp) /
    (impliedVol * sqrtTime);
  const d2 = d1 - impliedVol * sqrtTime;

  if (optionType === 'call') {
    return (
      underlyingPrice * normCDF(d1) -
      strikePrice * Math.exp(-riskFreeRate * timeToExp) * normCDF(d2)
    );
  } else if (optionType === 'put') {
    return (
      strikePrice * Math.exp(-riskFreeRate * timeToExp) * normCDF(-d2) -
      underlyingPrice * normCDF(-d1)
    );
  }
  console.warn("Invalid optionType:", optionType);
  return 0;
}

function calculateProfit(currentPrice, optionPrice, strikePrice, optionType, quantity, isBuy) {
  const intrinsicValue =
    optionType === 'call'
      ? Math.max(currentPrice - strikePrice, 0)
      : Math.max(strikePrice - currentPrice, 0);
  const profit = isBuy ? intrinsicValue - optionPrice : optionPrice - intrinsicValue;
  return isNaN(profit) ? 0 : profit * quantity;
}

const ProfitCharts = ({
  selectedTrades,
  initialMode = "all",
  showModeToggle = true,
  width = "100%",
  height = "100%",
}) => {
  const [chartMode, setChartMode] = useState(initialMode);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [yDragging, setYDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [startMin, setStartMin] = useState(0);
  const [startMax, setStartMax] = useState(0);
  const [startYMin, setStartYMin] = useState(0);
  const [startYMax, setStartYMax] = useState(0);
  const chartContainerRef = useRef(null);

  const {
    autoMin,
    autoMax,
    strikePrices,
    daysToExpiration,
    dateForDay,
    timeRemainingToExpiration,
    currentDayIndex,
    groupedTrades,
    positionLabels,
    now,
  } = useMemo(() => {
    console.log("selectedTrades length:", selectedTrades?.length || 0);
    console.log("selectedTrades:", selectedTrades);

    if (!selectedTrades || selectedTrades.length === 0) {
      console.warn("No selectedTrades provided or empty");
      return {
        autoMin: 1000,
        autoMax: 400000,
        strikePrices: [],
        daysToExpiration: [],
        dateForDay: [],
        timeRemainingToExpiration: 0,
        currentDayIndex: 0,
        groupedTrades: {},
        positionLabels: [],
        now: new Date(),
      };
    }

    // Validate trades
    const validTrades = selectedTrades.filter((t) => {
      if (
        !t.Trade_ID ||
        !t.Strike_Price ||
        isNaN(t.Strike_Price) ||
        t.Strike_Price <= 0 ||
        !t.Option_Type ||
        !['Call', 'Put'].includes(t.Option_Type) ||
        !t.Side ||
        !['BUY', 'SELL'].includes(t.Side) ||
        !t.Price_USD ||
        isNaN(t.Price_USD) ||
        !t.IV_Percent ||
        isNaN(t.IV_Percent) ||
        !t.Size ||
        isNaN(t.Size) ||
        !t.Expiration_Date
      ) {
        console.warn("Invalid trade data:", t);
        return false;
      }
      const expDate = new Date(t.Expiration_Date);
      if (isNaN(expDate.getTime())) {
        console.warn("Invalid Expiration_Date:", t.Expiration_Date);
        return false;
      }
      return true;
    });

    if (validTrades.length === 0) {
      console.warn("No valid trades after filtering");
      return {
        autoMin: 1000,
        autoMax: 400000,
        strikePrices: [],
        daysToExpiration: [],
        dateForDay: [],
        timeRemainingToExpiration: 0,
        currentDayIndex: 0,
        groupedTrades: {},
        positionLabels: [],
        now: new Date(),
      };
    }

    const now = new Date();

    // Group trades by BlockTrade_IDs
    const groupedTrades = {};
    const tradeIds = new Set();
    for (const t of validTrades) {
      const blockId = t.BlockTrade_IDs || "none";
      if (!groupedTrades[blockId]) groupedTrades[blockId] = [];

      tradeIds.add(t.Trade_ID);
      groupedTrades[blockId].push(t);
    }

    // Generate position labels
    const positionLabels = Object.entries(groupedTrades).map(([blockId, trades]) => {
      if (blockId === "none") {
        const t = trades[0];
        const strike = t.Strike_Price;
        const type = t.Option_Type.toUpperCase();
        const side = t.Side.toUpperCase();
        return `${side} ${type} ${strike}`;
      }
      const tradeSummaries = trades.map((t) => {
        const strike = t.Strike_Price;
        const type = t.Option_Type.toUpperCase();
        const side = t.Side.toUpperCase();
        return `${side} ${type} ${strike}`;
      });
      return `Block ${blockId}: ${tradeSummaries.join(" + ")}`;
    });

    // Calculate auto index price range params
    const allStrikes = validTrades.map((t) => t.Strike_Price);
    const strikePrices = [...new Set(allStrikes)]; // Unique strike prices
    const buffer = 5;
    const minStrike = Math.min(...allStrikes);
    const maxStrike = Math.max(...allStrikes);
    const range = maxStrike - minStrike || 10000; // Fallback if all strikes are equal
    const autoMin = Math.max(1000, Math.floor((minStrike - range * buffer) / 1000) * 1000); // Ensure start >= 1000
    const autoMax = Math.min(400000, Math.ceil((maxStrike + range * buffer) / 1000) * 1000); // Cap at 400k

    // Calculate days to expiration
    const expirationDaysList = validTrades.map((pos) => {
      const expDate = new Date(pos.Expiration_Date);
      return Math.max(Math.ceil((expDate - now) / (1000 * 60 * 60 * 24)), 1);
    });
    const timeRemainingToExpiration = Math.max(...expirationDaysList);
    const maxDays = timeRemainingToExpiration;
    const daysToExpiration = Array.from({ length: maxDays }, (_, i) => i);

    // Calculate actual dates for each day
    const dateForDay = daysToExpiration.map((day) => {
      const date = new Date(now.getTime() + day * 86400000);
      const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return day === 0 ? `Today` : formatted;
    });

    // Time passed - assuming starting from day 0 as current
    const currentDayIndex = 0; // Current is day 0

    return {
      autoMin,
      autoMax,
      strikePrices,
      daysToExpiration,
      dateForDay,
      timeRemainingToExpiration,
      currentDayIndex,
      groupedTrades,
      positionLabels,
      now,
    };
  }, [selectedTrades]);

  const [minPrice, setMinPrice] = useState(autoMin);
  const [maxPrice, setMaxPrice] = useState(autoMax);
  const [userYMin, setUserYMin] = useState(-1000);
  const [userYMax, setUserYMax] = useState(1000);

  useEffect(() => {
    setMinPrice(autoMin);
    setMaxPrice(autoMax);
  }, [autoMin, autoMax]);

  const {
    indexPriceRange,
    profitMatrix,
    profitOverDays,
    yMin,
    yMax,
  } = useMemo(() => {
    const effectiveMin = minPrice;
    const effectiveMax = maxPrice;
    const step = getRoundedStep((effectiveMax - effectiveMin) / 60);
    const indexPriceRange = Array.from(
      { length: Math.ceil((effectiveMax - effectiveMin) / step) + 1 },
      (_, i) => effectiveMin + i * step
    ).filter((price) => price > 0 && price <= 400000); // Filter to ensure 0 < price <= 400k

    if (Object.keys(groupedTrades).length === 0) {
      return {
        indexPriceRange: [],
        profitMatrix: [],
        profitOverDays: {},
        yMin: -1000,
        yMax: 1000,
      };
    }

    // Calculate profit matrix for expiration
    const profitMatrix = Object.values(groupedTrades).map((trades) =>
      indexPriceRange.map((price) => {
        return trades.reduce((sum, pos) => {
          const strike = pos.Strike_Price;
          const type = pos.Option_Type.toLowerCase();
          const isBuy = pos.Side.toUpperCase() === "BUY";
          const quantity = pos.Size;
          const optionPrice = pos.Price_USD;
          const profit = calculateProfit(price, optionPrice, strike, type, quantity, isBuy);
          return sum + profit;
        }, 0);
      })
    );

    // Calculate profit over days
    const profitOverDays = {};
    daysToExpiration.forEach((day) => {
      profitOverDays[day] = indexPriceRange.map((price) => {
        return Object.values(groupedTrades).reduce((groupSum, trades) => {
          const groupProfit = trades.reduce((sum, pos) => {
            const expirationDate = new Date(pos.Expiration_Date);
            const timeToExpDays = Math.max((expirationDate - now) / (1000 * 60 * 60 * 24) - day, 0.0001);
            const timeToExpYears = timeToExpDays / 365;
            const strike = pos.Strike_Price;
            const type = pos.Option_Type.toLowerCase();
            const isBuy = pos.Side.toUpperCase() === "BUY";
            const quantity = pos.Size;
            const optionPrice = pos.Price_USD;
            const impliedVol = pos.IV_Percent / 100;
            const riskFreeRate = 0;

            const theoreticalPrice = blackScholes(
              price,
              strike,
              timeToExpYears,
              riskFreeRate,
              impliedVol,
              type
            );
            const profit = (isBuy ? theoreticalPrice - optionPrice : optionPrice - theoreticalPrice) * quantity;
            return sum + (isNaN(profit) ? 0 : profit);
          }, 0);
          return groupSum + groupProfit;
        }, 0);
      });
    });

    // Calculate Y-axis scaling
    const allProfits = profitMatrix.flat().concat(Object.values(profitOverDays).flat());
    const yMin = allProfits.length > 0 ? Math.min(...allProfits) : -1000;
    const yMax = allProfits.length > 0 ? Math.max(...allProfits) : 1000;

    return {
      indexPriceRange,
      profitMatrix,
      profitOverDays,
      yMin,
      yMax,
    };
  }, [minPrice, maxPrice, autoMin, autoMax, groupedTrades, daysToExpiration, now, selectedTrades]);

  useEffect(() => {
    setUserYMin(yMin);
    setUserYMax(yMax);
  }, [yMin, yMax]);

  // Set default selected day to the last day if not set
  useEffect(() => {
    if (chartMode === "expiration" && daysToExpiration.length > 0 && selectedDay === null) {
      setSelectedDay(daysToExpiration[daysToExpiration.length - 1]);
    }
  }, [chartMode, daysToExpiration, selectedDay]);

  // Safeguard rendering
  if (!HeatmapChart || !LineChartCanvas) {
    console.error("ProfitCharts: Component imports failed", { HeatmapChart: !!HeatmapChart, LineChartCanvas: !!LineChartCanvas });
    return <div>Error: Chart components failed to load</div>;
  }

  const handleDaySelect = (day) => {
    setSelectedDay(day);
    setChartMode("expiration");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height,
        width,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexGrow: 1,
          overflow: "hidden",
        }}
      >
        <div
          ref={chartContainerRef}
          style={{
            flexGrow: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            marginTop: '20px',
            height: positionLabels.length > 1 ? "100%" : "clamp(300px, 30vh, 350px)",
          }}
          onMouseDown={(e) => {
            if (chartMode !== "all") return;
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
            if (chartMode !== "all") return;
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
              const shift = - (deltaY / chartHeight) * rangeY;
              let newYMin = startYMin + shift;
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
          }}
          onWheel={(e) => {
            if (chartMode !== "all") return;
            e.preventDefault();
            const rect = chartContainerRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            if (mouseX < 55) {
              // Y zoom
              const currentRange = userYMax - userYMin;
              const marginTop = 40;
              const marginBottom = 60;
              const plotHeight = rect.height - marginTop - marginBottom;
              const fractionFromTop = Math.max(0, Math.min(1, (mouseY - marginTop) / plotHeight));
              const pos = userYMax - fractionFromTop * currentRange;
              const factor = e.deltaY > 0 ? 1.1 : 0.9;
              let newRange = currentRange * factor;
              if (newRange < 1) return;
              const fractionFromMin = (pos - userYMin) / currentRange;
              let newYMin = pos - fractionFromMin * newRange;
              let newYMax = pos + (1 - fractionFromMin) * newRange;
              if (newYMin < newYMax) {
                setUserYMin(newYMin);
                setUserYMax(newYMax);
              }
            } else {
              // X zoom
              const chartWidth = rect.width;
              const currentRange = maxPrice - minPrice;
              const fraction = mouseX / chartWidth;
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
          {chartMode === "expiration" && selectedDay !== null && profitOverDays[selectedDay] && (
            <>
              <div className="flex-grow w-full">
                <HeatmapChart
                  data={[profitOverDays[selectedDay]]}
                  xLabels={indexPriceRange}
                  yLabels={[dateForDay[daysToExpiration.indexOf(selectedDay)] || 'Today']}
                  strikePrices={strikePrices}
                  width="100%"
                  height="100%"
                  zMin={yMin}
                  zMax={yMax}
                  yGap={0}
                  xAxisFormat="k"
                  xAxisTitle="Strike Price"
                  yAxisTitle="Date"
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  onMinPriceChange={setMinPrice}
                  onMaxPriceChange={setMaxPrice}
                />
              </div>
              <DateAxisSlider
                dates={dateForDay}
                days={daysToExpiration}
                selectedDay={selectedDay}
                onChange={handleDaySelect}
              />
            </>
          )}
          {chartMode === "all" && Object.keys(profitOverDays).length > 0 && (
            <LineChartCanvas
              lines={daysToExpiration.map((day, i) => ({
                name: dateForDay[i],
                x: indexPriceRange,
                y: profitOverDays[day],
                color: `hsl(${(i * 360) / daysToExpiration.length}, 70%, 50%)`,
              }))}
              strikePrices={strikePrices}
              width="100%"
              height={positionLabels.length > 1 ? "100%" : "clamp(220px, 28vh, 300px)"}
              yMin={userYMin}
              yMax={userYMax}
              xAxisFormat="k"
              xAxisTitle="Strike Price"
              yAxisTitle="Profit"
            />
          )}
        </div>
        {showModeToggle && (
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              justifyContent: "flex-start",
              flexDirection: "column",
            }}
          >
            <div>
              <IconButton
                aria-label="Show profit for all days"
                onClick={() => setChartMode("all")}
                style={{
                  padding: "6px",
                  borderRadius: 4,
                  opacity: chartMode === "all" ? 1 : 0.5,
                  cursor: "pointer",
                }}
              >
                <CustomTooltip content="Profit for all days">
                  <img
                    src="/profitAllDay.png"
                    alt="Profit all days icon"
                    style={{
                      height: 'clamp(1.1rem, 1.2vw,1.4rem)',
                      width: 'clamp(1.4rem, 1.4vw,1.8rem)',
                      filter: chartMode === "all" ? "brightness(0) invert(1)" : "none" 
                    }}
                  />
                </CustomTooltip>
              </IconButton>
            </div>
            <div>
              <IconButton
                aria-label="Show profit by day"
                onClick={() => setChartMode("expiration")}
                style={{
                  borderRadius: 4,
                  opacity: chartMode === "expiration" ? 1 : 0.5,
                  cursor: "pointer",
                }}
              >
                <CustomTooltip content="Profit for specific day">
                  <img
                    src="/profitByDate.png"
                    alt="Profit by day icon"
                    style={{ 
                      height: 'clamp(1.1rem, 1.4vw,1.4rem)',
                      width: 'clamp(1.2rem, 1.4vw,1.6rem)',
                      filter: chartMode === "expiration" ? "brightness(0) invert(1)" : "none" 
                    }}
                  />
                </CustomTooltip>
              </IconButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfitCharts;