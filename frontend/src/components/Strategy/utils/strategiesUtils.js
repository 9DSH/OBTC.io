// src/utils/strategiesUtils.js
export function formatNumberKM(value) {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `${Math.round(value / 1000000)}M`;
  } else if (absValue >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }
  return `${Math.round(value)}`;
}


export function filterStrategies(trades, filters = {}) {
  const strategyGroups = {};

  // Group trades
  for (const trade of trades) {
    let groupKey;
    if (trade.ComboTrade_IDs && trade.ComboTrade_IDs !== "null") {
      groupKey = `combo:${trade.ComboTrade_IDs}`;
    } else if (
      trade.Combo_ID && trade.Combo_ID !== "null" &&
      trade.BlockTrade_IDs && trade.BlockTrade_IDs !== "null"
    ) {
      groupKey = `combo_id:${trade.Combo_ID}:block:${trade.BlockTrade_IDs}`;
    } else if (trade.Combo_ID && trade.Combo_ID !== "null") {
      groupKey = `combo_id:${trade.Combo_ID}`;
    } else if (trade.BlockTrade_IDs && trade.BlockTrade_IDs !== "null") {
      groupKey = `block:${trade.BlockTrade_IDs}`;
    } else {
      continue; // skip single trades
    }

    if (!strategyGroups[groupKey]) {
      strategyGroups[groupKey] = [];
    }
    strategyGroups[groupKey].push(trade);
  }


  // Apply filters: keep group if ANY trade matches filters
  const filteredGroups = Object.values(strategyGroups).filter(group => {
    const groupMatch = group.some(trade => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return true;

        let result = true;

        switch (key) {
          case "Expiration_Date": {
            result = String(trade.Expiration_Date) === String(value);
            break;
          }

          case "Strike_Price": {
            const strike = Number(trade.Strike_Price);
            result = Array.isArray(value)
              ? value.map(Number).includes(strike)
              : strike === Number(value);
            break;
          }

          case "Entry_Value": {
            const val = Number(trade.Entry_Value);
            if (Array.isArray(value)) {
              const [min, max] = value.map(Number);
              result = !isNaN(val) && val >= min && val <= max;
            } else {
              result = val === Number(value);
            }
            break;
          }

          case "Size": {
            const sizeVal = Number(trade.Size);
            if (Array.isArray(value)) {
              const [min, max] = value.map(Number);
              result = !isNaN(sizeVal) && sizeVal >= min && sizeVal <= max;
            } else {
              result = sizeVal === Number(value);
            }
            break;
          }

          case "Entry_Date": {
            const tradeDate = trade.Entry_Date ? new Date(trade.Entry_Date) : null;
            const start = value.start ? new Date(value.start) : null;
            const end = value.end ? new Date(value.end) : null;
            result =
              tradeDate &&
              (!start || tradeDate >= start) &&
              (!end || tradeDate <= end);

            break;
          }

          case "Side": {
            result = Array.isArray(value)
              ? value.includes(trade.Side)
              : String(trade.Side) === String(value);
            break;
          }

          case "Option_Type": {
            result = Array.isArray(value)
              ? value.includes(trade.Option_Type)
              : String(trade.Option_Type) === String(value);
           break;
          }

          default: {
            result = Array.isArray(value)
              ? value.includes(trade[key])
              : String(trade[key]) === String(value);
          }
        }

        return result;
      });
    });


    return groupMatch;
  });


  // Return only groups with more than one trade
  return filteredGroups.filter(group => group.length > 1);
}

  
export function formatStrategyDisplay(rawName, trades = []) {
    if (!rawName || typeof rawName !== "string" || rawName.startsWith("Custom-")) {
    if (trades.length >= 2) {
            const strikes = [...new Set(trades.map(t => t.Strike_Price))].sort((a, b) => a - b);
            const optionTypes = [...new Set(trades.map(t => t.Option_Type?.toLowerCase()))];
            const sides = [...new Set(trades.map(t => t.Side))];
            // Extract and validate expiration dates
            const expirations = [...new Set(trades
              .map(t => {
                const instrument = t.Instrument;
                if (!instrument || typeof instrument !== 'string') {
                  return null;
                }
                const parts = instrument.split('-');
                if (parts.length < 4) {
                  return null;
                }
                return parts[1]; // Correctly extract expiry, e.g., '26SEP25'
              })
              .filter(exp => exp && /^\d{2}[A-Z]{3}\d{2}$/.test(exp)) // Validate DDMMMYY format
            )];
            let strategyType = "Custom Strategy";
            if (trades.length === 4 && strikes.length >= 4 && optionTypes.includes('call') && optionTypes.includes('put') && sides.includes('BUY') && sides.includes('SELL')) {
              strategyType = "Iron Condor";
            } else if (trades.length === 3 && strikes.length === 3 && optionTypes.length === 1 && sides.includes('BUY') && sides.includes('SELL')) {
              strategyType = "Butterfly";
            } else if (trades.length === 2 && strikes.length === 2 && optionTypes.length === 1 && sides.includes('BUY') && sides.includes('SELL')) {
              strategyType = "Vertical Spread";
            }
            const formattedStrikes = strikes.map(strike => {
              const trade = trades.find(t => t.Strike_Price === strike);
              const optionType = trade?.Option_Type?.toUpperCase() === 'PUT' ? 'P' : 'C';
              return formatStrikeOption(`${strike}${optionType}`);
            }).join(" | ");
            let expiry = "Unknown";
            if (expirations.length === 0) {
            } else if (expirations.length === 1) {
              const exp = expirations[0];
              expiry = `${exp.slice(0, 2)} ${exp.slice(2, 5)} ${exp.slice(5)}`;
            } else if (expirations.length >= 2) {
              const expCounts = expirations.reduce((acc, exp) => {
                acc[exp] = (acc[exp] || 0) + trades.filter(t => t.Instrument?.split('-')[1] === exp).length;
                return acc;
              }, {});
              const topExpirations = Object.entries(expCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 2)
                .map(([exp]) => `${exp.slice(0, 2)} ${exp.slice(2, 5)} ${exp.slice(5)}`);
              expiry = topExpirations.join(" | ");
              if (expirations.length > 2) {
                expiry += " and multiple";
              }
            }
            return [strategyType, formattedStrikes, expiry];
          }
          return ["Custom Strategy", "N/A", "N/A"];
        }
        const parts = rawName.split("-");
        if (parts.length < 4) {
          return ["Custom Strategy", "N/A", "N/A"];
        }
      
        const [, strategyCode, rawDate, strikesRaw] = parts;
      
        // Map strategy code to full name
        let strategyType = "";
        if (strategyCode.includes("ICOND")) strategyType = "Iron Condor";
        else if (strategyCode.includes("IB")) strategyType = "Iron Butterfly";
        else if (strategyCode.includes("VS")) strategyType = "Vertical Spread";
        else if (strategyCode.includes("PLAD")) strategyType = "Put Backspread";
        else if (strategyCode.includes("STD")) strategyType = "Straddle";
        else if (strategyCode.includes("STG")) strategyType = "Strangle";
        else if (strategyCode.includes("CS")) strategyType = "Calendar Spread";
        else if (strategyCode.includes("DS")) strategyType = "Diagonal Spread";
        else if (strategyCode.includes("CDIAG")) strategyType = "Conditional Diagonal Spread";
        else if (strategyCode.includes("PCAL")) strategyType = "Put Calendar Spread";
        else if (strategyCode.includes("PBUT")) strategyType = "Put Butterfly Spread";
        else if (strategyCode.includes("CCAL")) strategyType = "Call Calendar Spread";
        else if (strategyCode.includes("STRD")) strategyType = "Straddle (Same Strike)";
        else if (strategyCode.includes("STRG")) strategyType = "Straddle (Different Strike)";
        else if (strategyCode.includes("PS")) strategyType = "Put Spread";
        else if (strategyCode.includes("RR")) strategyType = "Risk Reversal";
        else if (strategyCode.includes("PDIAG")) strategyType = "Put Diagonal Spread";
        else if (strategyCode.includes("CBUT")) strategyType = "Call Butterfly Spread";
        else if (strategyCode.includes("BF")) strategyType = "Butterfly";
        else strategyType = strategyCode; // fallback
  
    // Helper to format a single strike with color span based on side
    function formatStrikeOption(strikeRaw) {
      // strikeRaw example: "118000C" or "124000P"
      // Extract strike price and option type from strikeRaw
      const strikeNumMatch = strikeRaw.match(/\d+/);
      if (!strikeNumMatch) return strikeRaw;
      const strikeNum = Number(strikeNumMatch[0]);
  
      const strikeK = (strikeNum / 1000).toFixed(0) + "K";
  
      // Option type (C or P) and full name
      const optionType = strikeRaw.toUpperCase().endsWith("P") ? "Put" : "Call";
  
      // Find trade matching this strike and option type to get side (BUY/SELL)
      const trade = trades.find(
        t =>
          t.Strike_Price === strikeNum &&
          t.Option_Type &&
          t.Option_Type.toLowerCase() === optionType.toLowerCase()
      );
  
      const side = trade ? trade.Side : "UNKNOWN";
      const color = side === "BUY" ? "rgb(45, 148, 78)" : side === "SELL" ? "rgb(189, 51, 51)" : "gray";
  
      return `<span style="color:${color}; font-weight:bold;">${strikeK} ${optionType}</span>`;
    }
  
    // Split strikesRaw by "_" and format each with color
    const strikeParts = strikesRaw.split("_").map(formatStrikeOption);
    const formattedStrikes = strikeParts.join(" | ");
  
    // Format date: 29AUG25 => 29 AUG 25
    const formattedDate = `${rawDate.slice(0, 2)} ${rawDate.slice(2, 5)} ${rawDate.slice(5)}`;
    
    return [strategyType, formattedStrikes, formattedDate];
}

export function groupStrategies(trades, allStrategies) {

  const comboGroups = [];
  const blockTradeGroups = [];
  const seenComboIds = new Set();
  const seenBlockTradeIds = new Set();

  // Step 1: Build comboGroups by Combo_ID and ComboTrade_IDs
  for (const trade of trades) {
    const comboId = trade.Combo_ID;
    const comboTradeIds = Array.isArray(trade.ComboTrade_IDs)
      ? trade.ComboTrade_IDs
      : trade.ComboTrade_IDs ? [trade.ComboTrade_IDs] : [];

    if (comboId && !seenComboIds.has(comboId)) {
      const match = allStrategies.find(group =>
        group.some(t => t.Combo_ID === comboId)
      );
      if (match) {
        comboGroups.push(match);
        seenComboIds.add(comboId);

      }
    }

    for (const id of comboTradeIds) {
      if (id && !seenComboIds.has(id)) {
        const match = allStrategies.find(group =>
          group.some(t => {
            const ids = Array.isArray(t.ComboTrade_IDs)
              ? t.ComboTrade_IDs
              : t.ComboTrade_IDs ? [t.ComboTrade_IDs] : [];
            return ids.includes(id);
          })
        );
        if (match) {
          comboGroups.push(match);
          seenComboIds.add(id);

        }
      }
    }
  }

  // Step 2: Build blockTradeGroups from block IDs
  for (const trade of trades) {
    const blockId = trade.BlockTrade_ID || trade.BlockTrade_IDs;
    if (blockId && !seenBlockTradeIds.has(blockId)) {
      const match = allStrategies.find(group =>
        group.some(t => t.BlockTrade_ID === blockId || t.BlockTrade_IDs === blockId)
      );
      if (match) {
        blockTradeGroups.push(match);
        seenBlockTradeIds.add(blockId);
      }
    }
  }

  // Step 3: Deduplicate groups
  function deduplicateGroups(groups) {
    const seenGroups = new Set();
    return groups.filter(group => {
      const key = group
        .map(t => t.Trade_ID)
        .filter(id => id) // Ensure valid Trade_IDs
        .sort()
        .join('|');
      if (!key || seenGroups.has(key)) {
        return false;
      }
      seenGroups.add(key);
      return true;
    });
  }

  const dedupComboGroups = deduplicateGroups(comboGroups);
  const dedupBlockTradeGroups = deduplicateGroups(blockTradeGroups);

  // Step 4: Filter comboGroups to exclude block trade groups
  const blockTradeIdsSet = new Set();
  dedupBlockTradeGroups.forEach(group =>
    group.forEach(trade => trade.Trade_ID && blockTradeIdsSet.add(trade.Trade_ID))
  );

  const filteredComboGroups = dedupComboGroups.filter(group =>
    !group.some(trade => trade.Trade_ID && blockTradeIdsSet.has(trade.Trade_ID))
  );

  // Step 5: Sort groups by Entry_Value
  function sortGroupsByEntryValue(groups) {
    return groups.sort((a, b) => {
      const sumEntryA = a.reduce((sum, t) => sum + (t.Entry_Value || 0), 0);
      const sumEntryB = b.reduce((sum, t) => sum + (t.Entry_Value || 0), 0);
      return sumEntryB - sumEntryA;
    });
  }

  const result = {
    comboGroups: sortGroupsByEntryValue(filteredComboGroups),
    blockTradeGroups: sortGroupsByEntryValue(dedupBlockTradeGroups),
  };



  return result;
}
