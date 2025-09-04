export const generateUniqueId = () => {
  return Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
};

const generateTabName = (comboID, tabs) => {
  const isBlock = typeof comboID === 'string' && comboID.toLowerCase().includes('block');
  const prefix = isBlock ? 'Sim-Block' : 'Sim';
  
  const match = typeof comboID === 'string' ? comboID.match(/\d+/) : null;
  let baseNumber = match ? parseInt(match[0]) : 1;
  
  const usedNumbers = tabs
    .filter(tab => tab.type === 'simulation' && tab.name.startsWith(prefix))
    .map(tab => {
      const numMatch = tab.name.match(/\d+$/);
      return numMatch ? parseInt(numMatch[0]) : 0;
    });
  
  let nextNumber = Math.max(baseNumber, ...usedNumbers, 0) + 1;
  if (usedNumbers.includes(baseNumber)) {
    while (usedNumbers.includes(nextNumber)) {
      nextNumber++;
    }
  }
  
  return `${prefix}-${nextNumber}`;
};

export const processSimulateData = (simulateData, tabs, openedTabs, chains, btcPrice, setTabs, setOpenedTabs, setActiveTabId, setPopoverAnchors, lastProcessedData) => {
  if (!simulateData || !simulateData.trades || simulateData.trades.length === 0) {
    console.log('Skipping empty or invalid simulateData');
    return false;
  }

  let comboID = simulateData.comboID;

  // fallback to first trade's Combo_ID
  if (!comboID && simulateData.trades[0]?.Combo_ID) {
    comboID = simulateData.trades[0].Combo_ID;
    console.log(`Using Combo_ID from trade as comboID: ${comboID}`);
  }
  
  // fallback to first trade's Trade_ID if comboID is still missing
  if (!comboID && simulateData.trades[0]?.Trade_ID) {
    comboID = simulateData.trades[0].Trade_ID.toString();
    console.log(`Combo_ID missing, using first trade's Trade_ID as comboID: ${comboID}`);
  }
  
  // final check
  if (!comboID) {
    console.warn('No valid comboID or Trade_ID found in simulateData:', simulateData);
    return false;
  }

  console.log('Processing simulateData:', { comboID, trades: simulateData.trades });

  const tradeIds = simulateData.trades.map(trade => trade.Trade_ID).sort().join(',');
  const dataKey = JSON.stringify({ comboID, tradeIds });
  if (lastProcessedData.current === dataKey) {
    console.log(`Skipping duplicate simulateData for comboID: ${comboID}`);
    return false;
  }
  lastProcessedData.current = dataKey;

  const existingTabEntry = Object.entries(openedTabs).find(([key, value]) => {
    if (value.type !== 'simulation') return false;
    const existingTradeIds = value.trades.map(trade => trade.Trade_ID).sort().join(',');
    return existingTradeIds === tradeIds;
  });

  if (existingTabEntry) {
    const { tabId } = existingTabEntry[1];
    console.log(`Found existing tab for trade IDs ${tradeIds} with tabId: ${tabId}`);
    setActiveTabId(tabId);
    setPopoverAnchors({});
    return false;
  }

  if (openedTabs[comboID]) {
    const { tabId } = openedTabs[comboID];
    const tabExists = tabs.find(tab => tab.id === tabId);
    if (!tabExists) {
      console.warn(`Tab ID ${tabId} for comboID ${comboID} not found in tabs, cleaning up openedTabs`);
      setOpenedTabs(prev => {
        const newOpened = { ...prev };
        delete newOpened[comboID];
        console.log('Cleaned up openedTabs:', newOpened);
        return newOpened;
      });
    } else {
      console.log(`Switching to existing tab for comboID: ${comboID} with tabId: ${tabId}`);
      setActiveTabId(tabId);
      setPopoverAnchors({});
      return false;
    }
  }

  const tradesWithPricing = simulateData.trades.map(trade => {
    let strike_price = trade.Strike_Price || null;
    let type = trade.Option_Type || null;
    let side = trade.Side || 'Buy';
    let expiration = trade.Expiration_Date || null;

    const matchingChain = chains.find(c =>
      c.Instrument === trade.Instrument && (c.Side || 'Buy') === side
    );

    const priceUSD = matchingChain ? matchingChain.Price_USD : trade.Price_USD || '';
    const ivPercent = matchingChain ? matchingChain.IV_Percent : trade.IV_Percent || '';
    const tradeSize = matchingChain ? matchingChain.Size || trade.Size : trade.Size || 1;
    const underlyingPrice = btcPrice && btcPrice.btcprice ? btcPrice.btcprice.toFixed(2)
      : (trade.Underlying_Price ? trade.Underlying_Price.toFixed(2) : '60000');

    return {
      ...trade,
      strike_price,
      type,
      side,
      expiration_date: expiration,
      price: priceUSD,
      iv_percent: ivPercent,
      size: tradeSize,
      underlying_price: underlyingPrice,
      isSelected: true
    };
  });

  const newTabId = generateUniqueId();
  const newTab = {
    id: newTabId,
    name: generateTabName(comboID, tabs),
    selectedOptions: tradesWithPricing,
    type: 'simulation',
    simulateId: comboID
  };

  setTabs(prevTabs => {
    const existingBySimId = prevTabs.some(tab => tab.type === 'simulation' && tab.simulateId === comboID);
    const existingByTradeIds = prevTabs.some(tab => tab.type === 'simulation' && tab.selectedOptions.map(o => o.Trade_ID).sort().join(',') === tradeIds);
    if (existingBySimId || existingByTradeIds) {
      console.warn(`Simulation tab already exists (by simId: ${existingBySimId}, by tradeIds: ${existingByTradeIds}), skipping add`);
      const existingTab = prevTabs.find(tab => tab.type === 'simulation' && (tab.simulateId === comboID || tab.selectedOptions.map(o => o.Trade_ID).sort().join(',') === tradeIds));
      if (existingTab) {
        setActiveTabId(existingTab.id);
      }
      return prevTabs;
    }
    const uniqueTabs = [...prevTabs, newTab];
    console.log('Added new simulation tab:', uniqueTabs);
    return uniqueTabs;
  });

  setOpenedTabs(prev => {
    if (prev[comboID]) {
      console.warn(`openedTabs with comboID ${comboID} already exists, skipping add`);
      return prev;
    }
    const existingByTradeIds = Object.entries(prev).some(([key, value]) => value.type === 'simulation' && value.trades.map(t => t.Trade_ID).sort().join(',') === tradeIds);
    if (existingByTradeIds) {
      console.warn(`openedTabs with same tradeIds already exists, skipping add`);
      return prev;
    }
    const newOpened = { ...prev, [comboID]: { tabId: newTabId, trades: tradesWithPricing, type: 'simulation' } };
    console.log('Updated openedTabs with new simulation tab:', newOpened);
    return newOpened;
  });

  setActiveTabId(newTabId);
  setPopoverAnchors({});
  return true;
};

export function formatToTwoDecimals(value) {
    if (value === null || value === undefined || value === '') return '';
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    return num.toFixed(2);
  }
  
  export function formatInstrumentExp(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
    const year = date.getFullYear().toString().slice(2);
    return `${day}${month}${year}`;
  }
  
  export function parseInstrument(inst) {
    if (!inst) return { strike_price: '', type: '' };
    const parts = inst.split('-');
    if (parts.length !== 4) return { strike_price: '', type: '' };
    const strike = parts[2];
    const typeChar = parts[3];
    const fullType = typeChar === 'C' ? 'Call' : typeChar === 'P' ? 'Put' : '';
    return { strike_price: strike, type: fullType };
  }
  
  export function updateTradePricing(trade, chains) {
    if (!trade.expiration_date || !trade.strike_price || !trade.type || !trade.side || !chains) {
      return { ...trade, price: '', iv_percent: '' };
    }
  
    const chainData = chains.find(
      item => {
        const date = new Date(item.Expiration_Date);
        return date.toISOString().split('T')[0] === trade.expiration_date &&
               item.Strike_Price === parseFloat(trade.strike_price) &&
               item.Option_Type.toLowerCase() === trade.type.toLowerCase();
      }
    );
  
    if (!chainData) {
      console.warn(`No chain data found for trade:`, trade);
      return { ...trade, price: '', iv_percent: '' };
    }
  
    const isBuy = trade.side.toLowerCase() === 'buy';
    const price = isBuy ? chainData.Ask_Price_USD || 0 : chainData.Bid_Price_USD || 0;
    const iv = isBuy ? chainData.Ask_IV || 0 : chainData.Bid_IV || 0;
  
    return { ...trade, price: price.toString(), iv_percent: iv.toString() };
  }
  
  export function getSelectedTrades(selectedOptions, chains, btcPrice) {
    if (!chains || !Array.isArray(chains)) {
      console.log('No chains data available for selectedTrades');
      return [];
    }
  
    const now = new Date();
    const selectedTrades = selectedOptions
      .filter(option => option.isSelected)
      .map((option, index) => {
        const chainData = chains.find(
          item => {
            const date = new Date(item.Expiration_Date);
            return date.toISOString().split('T')[0] === option.expiration_date &&
                   item.Strike_Price === parseFloat(option.strike_price) &&
                   item.Option_Type.toLowerCase() === option.type.toLowerCase();
          }
        );
  
        if (!chainData) {
          console.warn(`No chain data found for option:`, option);
          return null;
        }
  
        const expDate = new Date(option.expiration_date + 'T00:00:00Z');
        const timeToExpDays = (expDate - now) / (1000 * 60 * 60 * 24);
        if (timeToExpDays <= 0) {
          return null;
        }
  
        const isBuy = option.side.toLowerCase() === 'buy';
        const priceUSD = parseFloat(option.price) || (isBuy ? chainData.Ask_Price_USD || 0 : chainData.Bid_Price_USD || 0);
        const ivPercent = parseFloat(option.iv_percent) || (isBuy ? chainData.Ask_IV || 0 : chainData.Bid_IV || 0);
        const size = parseFloat(option.size);
        const underlyingPrice = parseFloat(option.underlying_price) ||
          (btcPrice && btcPrice.btcprice && !isNaN(btcPrice.btcprice)
            ? parseFloat(btcPrice.btcprice)
            : 60000);
        const entryValue = priceUSD * size;
        const priceBTC = underlyingPrice ? (priceUSD / underlyingPrice) : 0;
        const instrument = `BTC-${formatInstrumentExp(option.expiration_date)}-${option.strike_price}-${option.type[0]}`;
  
        return {
          BlockTrade_Count: 1,
          BlockTrade_IDs: null,
          ComboTrade_IDs: null,
          Combo_ID: null,
          Entry_Date: new Date().toISOString(),
          Entry_Value: entryValue,
          Expiration_Date: option.expiration_date + 'T00:00:00Z',
          IV_Percent: ivPercent,
          Instrument: instrument,
          Option_Type: option.type,
          Price_BTC: priceBTC,
          Price_USD: parseFloat(formatToTwoDecimals(priceUSD)),
          Side: option.side.toUpperCase(),
          Size: size,
          Strike_Price: parseFloat(option.strike_price),
          Trade_ID: `trade-${index}-${option.expiration_date}-${option.strike_price}`,
          Underlying_Price: parseFloat(formatToTwoDecimals(underlyingPrice))
        };
      })
      .filter(trade => trade !== null);
  
    return selectedTrades;
  }