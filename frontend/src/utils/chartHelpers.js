// Returns a clean, human-friendly step size based on max value and desired number of ticks
export function getRoundedStep(maxValue, desiredSteps = 5) {
  const roughStep = maxValue / desiredSteps;
  const pow = Math.pow(10, Math.floor(Math.log10(roughStep)));

  // More granular options to handle smaller values precisely
  const steps = [1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  const step = steps.find(s => s * pow >= roughStep);
  return step ? step * pow : pow;
}

// Dynamically generates ticks up to the max value + buffer
export function generateYTicks(maxValue, chartHeight = 300) {
  const desiredSteps = Math.max(3, Math.floor(chartHeight / 60)); // approx every 60px
  const step = getRoundedStep(maxValue, desiredSteps);
  const ticks = [];

  for (let v = 0; v <= maxValue + step * 0.6; v += step) {
    ticks.push(Math.round(v));
  }

  return ticks;
}

// Format Y-axis labels like 250 → "250", 1000 → "1k", 1500 → "1.5k"
export function formatStrikeLabel(value) {
  return value >= 1000000
    ? `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`
    : value >= 1000
    ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`
    : value < 1000 && value > 1
    ? `${value.toFixed(0)}`
    : value < 1
    ? `${value.toFixed(1)}`
    : String(value);
}


export function formatExpirationLabel(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "long" }).toUpperCase().slice(0, 3);
  const year = String(d.getFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
}


export function getTextColor(backgroundColor) {
  if (!backgroundColor) return "#000";

  const hex = backgroundColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // YIQ formula: https://en.wikipedia.org/wiki/YIQ
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 160 ? "#000" : "#fff";
}

export const formatDateTimeLabel = (iso) => {
  if (!iso) return "N/A";
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const year = String(d.getFullYear()).slice(-2);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${mon} ${year} ${hours}:${minutes}`;
};



export const getTradeSummary = (trades) => {
  if (!trades || !Array.isArray(trades) || trades.length === 0) {
    console.warn("[getTradeSummary] No trades provided.");
    return [];
  }

  // Handle single trade case
  if (trades.length === 1) {
    const trade = trades[0];
    return [{
      Strategy_ID: trade.Combo_ID || null,
      Block_Trade_ID: trade.BlockTrade_IDs || null,
      Number_of_Legs: 1,
      Total_Size: Number(trade.Size) || 0,
      Entry_Time: trade.Entry_Date ? formatDateTimeLabel(trade.Entry_Date) : "N/A",
      Entry_Value: trade.Entry_Value ? formatStrikeLabel(trade.Entry_Value) : null,
      Underlying_Price: trade.Underlying_Price ? formatStrikeLabel(trade.Underlying_Price) : null,
      IV_Percent: trade.IV_Percent ? Number(parseFloat(trade.IV_Percent).toFixed(1)) : null,
      Strategy_Type: "Single Trade"
    }];
  }

  // Group trades by ComboTrade_IDs or Combo_ID
  const groupedTrades = trades.reduce((acc, trade) => {
    let key;
    if (trade.ComboTrade_IDs && trade.ComboTrade_IDs !== "null") {
      key = `COMBO|${trade.ComboTrade_IDs}`;
    } else if (trade.Combo_ID && trade.Combo_ID !== "null") {
      key = `COMBO_ID|${trade.Combo_ID}`;
    } else if (trade.BlockTrade_IDs && trade.BlockTrade_IDs !== "null") {
      key = `BLOCK|${trade.BlockTrade_IDs}`;
    } else {
      key = `SINGLE|${trade.Trade_ID || Math.random().toString()}`;
    }

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(trade);
    return acc;
  }, {});


  // Process each group to create summary
  const summaries = Object.entries(groupedTrades).map(([key, group]) => {
    const [keyType, keyValue] = key.split("|");
    let strategyType = "Complex";
    let strategyId = keyType === "COMBO_ID" || keyType === "COMBO" ? keyValue : null;
    let blockTradeId = keyType === "BLOCK" ? keyValue : group[0].BlockTrade_IDs || null;

    // Always try to use Combo_ID first for strategy detection
    let idToCheck = null;
    if (group[0].Combo_ID && group[0].Combo_ID !== "null") {
      idToCheck = group[0].Combo_ID;
    } else {
      idToCheck = keyValue;
    }



    if (idToCheck && typeof idToCheck === "string") {
      if (idToCheck.includes("ICOND")) strategyType = "Iron Condor";
      else if (idToCheck.includes("IB")) strategyType = "Iron Butterfly";
      else if (idToCheck.includes("VS")) strategyType = "Vertical Spread";
      else if (idToCheck.includes("STD")) strategyType = "Straddle";
      else if (idToCheck.includes("STG")) strategyType = "Strangle";
      else if (idToCheck.includes("CS")) strategyType = "Calendar Spread";
      else if (idToCheck.includes("DS")) strategyType = "Diagonal Spread";
      else if (idToCheck.includes("CDIAG")) strategyType = "Conditional Diagonal Spread";
      else if (idToCheck.includes("PCAL")) strategyType = "Put Calendar Spread";
      else if (idToCheck.includes("PBUT")) strategyType = "Put Butterfly Spread";
      else if (idToCheck.includes("CCAL")) strategyType = "Call Calendar Spread";
      else if (idToCheck.includes("STRD")) strategyType = "Straddle (same strike)";
      else if (idToCheck.includes("STRG")) strategyType = "Straddle (different strike)";
      else if (idToCheck.includes("PS")) strategyType = "Put Spread";
      else if (idToCheck.includes("RR")) strategyType = "Risk Reversal";
      else if (idToCheck.includes("PDIAG")) strategyType = "Put Diagonal Spread";
      else if (idToCheck.includes("CBUT")) strategyType = "Call Butterfly Spread";
      else if (idToCheck.includes("BF")) strategyType = "Butterfly";
    } else if (keyType === "SINGLE" || keyType === "BLOCK") {
      strategyType = "Custom Strategy";
    }

    const totalSize = group.reduce((sum, trade) => sum + (Number(trade.Size) || 0), 0);
    const totalValue = group.reduce((sum, trade) => sum + (Number(trade.Entry_Value) || 0), 0);   

    const entryTime = group.reduce((minDate, trade) => {
      const currentDate = trade.Entry_Date ? new Date(trade.Entry_Date) : null;
      if (!currentDate) return minDate;
      if (!minDate || currentDate < new Date(minDate)) return trade.Entry_Date;
      return minDate;
    }, null);

    const validPrices = group
      .map(trade => parseFloat(trade.Underlying_Price))
      .filter(p => !isNaN(p));

    const avgUnderlyingPrice = validPrices.length > 0
      ? validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length
      : null;

    const validIV = group
      .map(trade => parseFloat(trade.IV_Percent))
      .filter(p => !isNaN(p));

    const avgIV = validIV.length > 0
      ? validIV.reduce((sum, price) => sum + price, 0) / validIV.length
      : null;



    return {
      Strategy_ID: strategyId,
      Block_Trade_ID: blockTradeId,
      Number_of_Legs: group.length,
      Total_Size: totalSize ? formatStrikeLabel(totalSize) : null,
      Entry_Time: entryTime ? formatDateTimeLabel(entryTime) : "N/A",
      Entry_Value: totalValue ? formatStrikeLabel(totalValue) : null,
      Underlying_Price: avgUnderlyingPrice ? formatStrikeLabel(avgUnderlyingPrice) : null,
      IV_Percent: avgIV !== null ? Number(avgIV.toFixed(1)) : null,
      Strategy_Type: strategyType
    };
  });

  return summaries;
};


export const generateCustomGradientColors = (startHex, endHex, values) => {
  const hexToRgb = (hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  ];
  
  const rgbToHex = (r, g, b) =>
    `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;

  const lerp = (a, b, t) => a + (b - a) * t;

  const startRGB = hexToRgb(startHex);
  const endRGB = hexToRgb(endHex);

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  // Unique sorted values to assign color steps
  const sortedValues = [...new Set(values)].sort((a, b) => a - b);
  const numSteps = sortedValues.length - 1; // Step count between min and max
  
    // If all values are the same, return startHex for all
  if (sortedValues.length === 1) {
      return values.map(() => startHex);
    }
  return values.map(v => {
    // Position between min and max, 0 for min, 1 for max
    let t = (v - minVal) / (maxVal - minVal);
    
    // Apply a power curve to make differences more visible
    t = Math.pow(t, 0.6); // Lower exponent = more spread in darker tones

    const r = Math.round(lerp(startRGB[0], endRGB[0], t));
    const g = Math.round(lerp(startRGB[1], endRGB[1], t));
    const b = Math.round(lerp(startRGB[2], endRGB[2], t));

    return rgbToHex(r, g, b);
  });
};
