import React, { useMemo, useState, useEffect } from 'react';
import { Chart as ChartJS, 
         CategoryScale, 
         LinearScale, 
         BarElement, 
         Title, 
         Tooltip, 
         Legend, 
         LineElement, 
         PointElement,
         LineController } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement, LineController);

const COLORS = {
  Call: 'green',
  Put: 'darkred',
  NDE: 'gold',
  NGE: 'rgb(37, 134, 132)',
};

const MAX_WIDTH = 1200;
const CHART_WIDTH = 900;
const HEIGHT = 400;

// Helper function to format the filter date
const formatFilterDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = date.getUTCDate().toString().padStart(2, '0');
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const month = monthNames[date.getUTCMonth()];
  const year = date.getUTCFullYear().toString().slice(-2);
  return `${day}${month}${year}`;
};

// Helper function to format dates for display
const formatDateForDisplay = (date) => {
  if (!date) return '';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

const parseInstrument = (instrument) => {
  const regex = /^BTC-(\d{1,2})([A-Z]{3})(\d{2})-(\d+)-([CP])$/;
  const match = instrument.match(regex);
  
  if (!match) {
    console.warn('Invalid instrument format:', instrument);
    return null;
  }
  
  const [, day, monthAbbr, year, strikePrice, optionType] = match;
  
  const months = {
    JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
    JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
  };
  
  const month = months[monthAbbr];
  
  if (!month) {
    console.warn('Invalid month in expiration date:', instrument);
    return null;
  }
  
  const expirationDate = `20${year}-${month}-${day.padStart(2, '0')}`;
  const expirationDateFilterFormat = `${day.padStart(2, '0')}${monthAbbr}${year}`;
  
  return {
    Expiration_Date: expirationDate,
    Expiration_Date_Filter: expirationDateFilterFormat,
    Strike_Price: parseInt(strikePrice),
    Option_Type: optionType === 'C' ? 'Call' : 'Put',
  };
};

const calculate_oi_change = (chains, timeframe) => {
  if (!Array.isArray(chains)) {
    console.error("Error: 'chains' is not an array in calculate_oi_change.", { received: chains });
    return { oiChanges: [], dateRange: null };
  }
  let effectiveStartDate = null;
  let effectiveEndDate = null;
  const oiChanges = [];
  const instruments = new Set(chains.map(c => c.Instrument));

  instruments.forEach(instrument => {
    const instrumentRecords = chains
      .filter(chain => chain.Instrument === instrument)
      .sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));

    if (instrumentRecords.length < 2) {
      return;
    }
    
    let relevantRecords;

    if (timeframe === 'all') {
      relevantRecords = instrumentRecords;
    } else {
      const now = new Date();
      let startDateThreshold = new Date(now);
      startDateThreshold.setHours(0, 0, 0, 0);
      
      switch (timeframe) {
        case '1': startDateThreshold.setDate(startDateThreshold.getDate() - 1); break;
        case '2': startDateThreshold.setDate(startDateThreshold.getDate() - 2); break;
        case '3': startDateThreshold.setDate(startDateThreshold.getDate() - 3); break;
        case '4': startDateThreshold.setDate(startDateThreshold.getDate() - 4); break;
        case '5': startDateThreshold.setDate(startDateThreshold.getDate() - 5); break;
        case '6': startDateThreshold.setDate(startDateThreshold.getDate() - 6); break;
        case '7': startDateThreshold.setDate(startDateThreshold.getDate() - 7); break;
        case 'today': default: break;
      }
      
      relevantRecords = instrumentRecords.filter(rec => new Date(rec.Timestamp) >= startDateThreshold);
      
      if (relevantRecords.length < 2) {
        relevantRecords = instrumentRecords;
      }
    }
    
    const startRecord = relevantRecords[0];
    const latestRecord = relevantRecords[relevantRecords.length - 1];
    
    if (latestRecord && startRecord && latestRecord.Timestamp !== startRecord.Timestamp) {
      const oi_change = latestRecord.Open_Interest - startRecord.Open_Interest;
      
      if (Number.isFinite(oi_change)) {
        oiChanges.push({ Instrument: instrument, oi_change, Option_Type: parseInstrument(instrument)?.Option_Type });
      }

      const recordStartDate = new Date(startRecord.Timestamp);
      const recordEndDate = new Date(latestRecord.Timestamp);
      if (!effectiveStartDate || recordStartDate < effectiveStartDate) {
        effectiveStartDate = recordStartDate;
      }
      if (!effectiveEndDate || recordEndDate > effectiveEndDate) {
        effectiveEndDate = recordEndDate;
      }
    }
  });

  return {
    oiChanges,
    dateRange: effectiveStartDate && effectiveEndDate ? { start: effectiveStartDate, end: effectiveEndDate } : null
  };
};

const calculate_trades_nde_change = (trades, chains, timeframe) => {
  if (!Array.isArray(trades) || !Array.isArray(chains)) {
    console.error("Error: 'trades' or 'chains' is not an array in calculate_trades_nde_change.");
    return [];
  }
  const ndeChanges = new Map();
  
  const latestDeltas = new Map();
  chains.forEach(chain => {
    if (!latestDeltas.has(chain.Instrument) || new Date(chain.Timestamp) > new Date(latestDeltas.get(chain.Instrument).Timestamp)) {
      latestDeltas.set(chain.Instrument, chain);
    }
  });

  const now = new Date();
  let startDateThreshold = new Date(now);
  startDateThreshold.setHours(0, 0, 0, 0);

  switch (timeframe) {
    case '1': startDateThreshold.setDate(startDateThreshold.getDate() - 1); break;
    case '2': startDateThreshold.setDate(startDateThreshold.getDate() - 2); break;
    case '3': startDateThreshold.setDate(startDateThreshold.getDate() - 3); break;
    case '4': startDateThreshold.setDate(startDateThreshold.getDate() - 4); break;
    case '5': startDateThreshold.setDate(startDateThreshold.getDate() - 5); break;
    case '6': startDateThreshold.setDate(startDateThreshold.getDate() - 6); break;
    case '7': startDateThreshold.setDate(startDateThreshold.getDate() - 7); break;
    case 'today': default: break;
  }
  
  const relevantTrades = timeframe === 'all' 
    ? trades
    : trades.filter(trade => new Date(trade.Entry_Date) >= startDateThreshold);

  relevantTrades.forEach(trade => {
    const contractSize = trade.Size;
    const instrumentKey = trade.Instrument;
    const side = trade.Side;

    const latestChainData = latestDeltas.get(instrumentKey);
    
    if (!latestChainData || latestChainData.Delta === undefined) {
      return;
    }

    const delta = latestChainData.Delta;
    let nde_change_amount = 0;

    if (side === 'BUY') {
      nde_change_amount = -contractSize * delta;
    } else if (side === 'SELL') {
      nde_change_amount = contractSize * delta;
    }

    if (!ndeChanges.has(instrumentKey)) {
      ndeChanges.set(instrumentKey, 0);
    }
    ndeChanges.set(instrumentKey, ndeChanges.get(instrumentKey) + nde_change_amount);
  });
  
  return Array.from(ndeChanges, ([Instrument, nde_change]) => ({
    Instrument,
    nde_change
  }));
};

const calculate_nge_change = (trades, chains, timeframe) => {
  if (!Array.isArray(trades) || !Array.isArray(chains)) {
    return [];
  }
  const ngeChanges = new Map();
  
  const chainDataByInstrument = new Map();
  chains.forEach(chain => {
    if (!chainDataByInstrument.has(chain.Instrument)) {
      chainDataByInstrument.set(chain.Instrument, []);
    }
    chainDataByInstrument.get(chain.Instrument).push(chain);
  });

  const now = new Date();
  let startDateThreshold = new Date(now);
  startDateThreshold.setHours(0, 0, 0, 0);

  switch (timeframe) {
    case '1': startDateThreshold.setDate(startDateThreshold.getDate() - 1); break;
    case '2': startDateThreshold.setDate(startDateThreshold.getDate() - 2); break;
    case '3': startDateThreshold.setDate(startDateThreshold.getDate() - 3); break;
    case '4': startDateThreshold.setDate(startDateThreshold.getDate() - 4); break;
    case '5': startDateThreshold.setDate(startDateThreshold.getDate() - 5); break;
    case '6': startDateThreshold.setDate(startDateThreshold.getDate() - 6); break;
    case '7': startDateThreshold.setDate(startDateThreshold.getDate() - 7); break;
    case 'today': default: break;
  }

  const relevantTrades = timeframe === 'all' 
    ? trades 
    : trades.filter(trade => new Date(trade.Entry_Date) >= startDateThreshold);

  relevantTrades.forEach(trade => {
    const instrumentKey = trade.Instrument;
    const tradeSize = trade.Size;
    const tradeSide = trade.Side;

    const instrumentRecords = chainDataByInstrument.get(instrumentKey);
    
    if (!instrumentRecords || instrumentRecords.length < 2) {
      return;
    }

    const sortedRecords = instrumentRecords.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));
    const startRecord = sortedRecords[0];
    const latestRecord = sortedRecords[sortedRecords.length - 1];
    
    if (trade.Underlying_Price === undefined || startRecord.Gamma === undefined || latestRecord.Gamma === undefined) {
      return;
    }

    const gamma_start = startRecord.Gamma;
    const gamma_end = latestRecord.Gamma;
    const underlyingPrice = trade.Underlying_Price;

    const nge_start = gamma_start * tradeSize * underlyingPrice;
    const nge_end = gamma_end * tradeSize * underlyingPrice;
    let nge_change_amount = nge_end - nge_start;

    if (tradeSide === 'SELL') {
      nge_change_amount *= -1;
    }
    
    if (Number.isFinite(nge_change_amount)) {
      if (!ngeChanges.has(instrumentKey)) {
        ngeChanges.set(instrumentKey, 0);
      }
      ngeChanges.set(instrumentKey, ngeChanges.get(instrumentKey) + nge_change_amount);
    }
  });

  return Array.from(ngeChanges, ([Instrument, nge_change]) => ({
    Instrument,
    nge_change
  }));
};

const getRGBA = (color, opacity) => {
  const tempElement = document.createElement('div');
  tempElement.style.color = color;
  document.body.appendChild(tempElement);
  const computedColor = getComputedStyle(tempElement).color;
  document.body.removeChild(tempElement);
  
  const match = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    const [, r, g, b] = match;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  
  console.warn(`Could not parse color: ${color}. Falling back to transparent.`);
  return `rgba(0, 0, 0, 0)`; 
};

// Custom tooltip rendering function
const customTooltip = (context) => {
  let tooltipEl = document.getElementById('chartjs-tooltip');
  
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'chartjs-tooltip';
    tooltipEl.style.opacity = '0';
    tooltipEl.style.position = 'absolute';
    tooltipEl.style.pointerEvents = 'none';
    document.body.appendChild(tooltipEl);
  }

  const tooltipModel = context.tooltip;
  if (tooltipModel.opacity === 0) {
    tooltipEl.style.opacity = '0';
    return;
  }

  tooltipEl.innerHTML = '';

  const title = tooltipModel.title[0] || '';
  const bodyLines = tooltipModel.body.map(b => b.lines).flat();

  const tooltipContent = document.createElement('div');
  tooltipContent.style.backgroundColor = '#2a2a34';
  tooltipContent.style.border = '1px solid rgb(51, 51, 51)';
  tooltipContent.style.borderRadius = '10px';
  tooltipContent.style.color = 'lightgray';
  tooltipContent.style.fontFamily = "'Roboto', sans-serif";
  tooltipContent.style.fontSize = '12px';

  if (title) {
    const titleDiv = document.createElement('div');
    titleDiv.style.backgroundColor = 'rgba(44, 47, 80, 0.78)';
    titleDiv.style.borderRadius = '10px 10px 0 0';
    titleDiv.style.padding = '7px 8px';
    titleDiv.style.fontSize = '12px';
    titleDiv.style.letterSpacing = '1px';
    titleDiv.style.fontWeight = 600;
    titleDiv.style.color = 'rgb(188, 188, 188)';
    titleDiv.textContent = title;
    tooltipContent.appendChild(titleDiv);
  }

  bodyLines.forEach(line => {
    const lineDiv = document.createElement('div');
    lineDiv.style.backgroundColor = '#2a2a34';
    lineDiv.style.borderRadius = '10px';
    lineDiv.style.padding = '3px 10px';
    lineDiv.style.alignItems = 'center';

    let color = '';
    if (line.includes('Put OI Change')) {
      color = COLORS.Put;
    } else if (line.includes('Call OI Change')) {
      color = COLORS.Call;
    } else if (line.includes('Net Delta Exposure')) {
      color = COLORS.NDE;
    } else if (line.includes('Net Gamma Exposure')) {
      color = COLORS.NGE;
    }

    if (color) {
      const colorSpan = document.createElement('span');
      colorSpan.style.display = 'inline-block';
      colorSpan.style.width = '12px';
      colorSpan.style.height = '12px';
      colorSpan.style.backgroundColor = color;
      colorSpan.style.marginRight = '8px';
      lineDiv.appendChild(colorSpan);
    }

    const textSpan = document.createElement('span');
    textSpan.textContent = line;
    lineDiv.appendChild(textSpan);

    tooltipContent.appendChild(lineDiv);
  });

  tooltipEl.appendChild(tooltipContent);

  const { offsetLeft: positionX, offsetTop: positionY } = context.chart.canvas;
  tooltipEl.style.opacity = '1';
  tooltipEl.style.left = positionX + tooltipModel.caretX + 20 + 'px';
  tooltipEl.style.top = positionY + tooltipModel.caretY + 'px';
};

// Helper function to calculate dynamic step size based on maxAbs value
const calculateStepSize = (maxAbs) => {
  let calculatedStepSize;
  if (maxAbs <= 500) { calculatedStepSize = 100; } 
  else if (maxAbs <= 1000) { calculatedStepSize = 250; } 
  else if (maxAbs <= 5000) { calculatedStepSize = 500; } 
  else if (maxAbs <= 10000) { calculatedStepSize = 1000; } 
  else { calculatedStepSize = Math.ceil(maxAbs / 5000) * 1000; }
  
  if (maxAbs > 0 && calculatedStepSize > maxAbs) { calculatedStepSize = Math.floor(maxAbs / 2); }
  if (calculatedStepSize < 50 && maxAbs > 0) { calculatedStepSize = 50; }
  calculatedStepSize = Math.ceil(calculatedStepSize / 50) * 50;
  
  return calculatedStepSize;
};

export default function MarketExposure({ data = [], chains = [], filters = {}, onSegmentSelect }) {
  const [timeframe, setTimeframe] = useState('7');
  const [dateRange, setDateRange] = useState(null);
  const [chartMode, setChartMode] = useState('strikePrice');

  useEffect(() => {
    if (chains && chains.length > 0) {
      const sortedChains = [...chains].sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));
      const firstTimestamp = sortedChains[0].Timestamp;
      const lastTimestamp = sortedChains[sortedChains.length - 1].Timestamp;
      console.log(`[DATA RANGE] Full data range from chains prop: ${firstTimestamp} to ${lastTimestamp}`);
    }
  }, [chains]);

  const { chartData, maxAbsOI, labels, dynamicStepSizeOI, maxAbsNDE, maxAbsNGE, dynamicStepSizeNDE, dynamicStepSizeNGE, dynamicStepSizeGreeks, originalNdeData, originalNgeData } = useMemo(() => {
    if (!Array.isArray(chains) || (chains.length === 0 && data.length === 0)) {
      setDateRange(null);
      return {
        chartData: { labels: [], datasets: [] },
        maxAbsOI: 0,
        labels: [],
        dynamicStepSizeOI: 50,
        maxAbsNDE: 0,
        maxAbsNGE: 0,
        dynamicStepSizeNDE: 50,
        dynamicStepSizeNGE: 50,
        dynamicStepSizeGreeks: 50,
        originalNdeData: [],
        originalNgeData: []
      };
    }

    const formattedExpirationFilters = filters.Expiration_Date?.map(formatFilterDate) || [];
    
    const { oiChanges, dateRange: oiDateRange } = calculate_oi_change(chains, timeframe);
    setDateRange(oiDateRange);

    const ndeChanges = calculate_trades_nde_change(data, chains, timeframe);
    const ngeChanges = calculate_nge_change(data, chains, timeframe);

    const combinedData = [...oiChanges, ...ndeChanges, ...ngeChanges];
    const filteredData = combinedData
      .map(item => {
        const parsed = parseInstrument(item.Instrument);
        return parsed ? { ...item, ...parsed } : null;
      })
      .filter(item => item !== null)
      .filter(item => {
        if (filters.Option_Type && filters.Option_Type !== '' && item.Option_Type !== filters.Option_Type) {
          return false;
        }
        if (filters.Strike_Price && filters.Strike_Price.length > 0 && !filters.Strike_Price.includes(item.Strike_Price)) {
          return false;
        }
        if (formattedExpirationFilters.length > 0) {
          if (!formattedExpirationFilters.includes(item.Expiration_Date_Filter)) {
            return false;
          }
        }
        return true;
      });

    const oiMap = new Map();
    const ndeMap = new Map();
    const ngeMap = new Map();
    filteredData.forEach(item => {
      const groupKey = chartMode === 'strikePrice' ? item.Strike_Price : item.Expiration_Date_Filter;
      
      if (item.oi_change !== undefined) {
        if (!oiMap.has(groupKey)) {
          oiMap.set(groupKey, { Call: 0, Put: 0 });
        }
        if (item.Option_Type === 'Call') {
          oiMap.get(groupKey).Call += item.oi_change;
        } else {
          oiMap.get(groupKey).Put += item.oi_change;
        }
      }
      
      if (item.nde_change !== undefined) {
        if (!ndeMap.has(groupKey)) {
          ndeMap.set(groupKey, 0);
        }
        ndeMap.set(groupKey, ndeMap.get(groupKey) + item.nde_change);
      }
      
      if (item.nge_change !== undefined) {
        if (!ngeMap.has(groupKey)) {
          ngeMap.set(groupKey, 0);
        }
        ngeMap.set(groupKey, ngeMap.get(groupKey) + item.nge_change);
      }
    });

    let chartLabels;
    if (chartMode === 'strikePrice') {
      chartLabels = Array.from(new Set([...Array.from(oiMap.keys()), ...Array.from(ndeMap.keys()), ...Array.from(ngeMap.keys())]))
        .sort((a, b) => a - b)
        .map(p => p / 1000 + 'k');
    } else {
      chartLabels = Array.from(new Set([...Array.from(oiMap.keys()), ...Array.from(ndeMap.keys()), ...Array.from(ngeMap.keys())])).sort();
    }
    
    const callData = chartLabels.map(label => {
      const key = chartMode === 'strikePrice' ? parseInt(label.replace('k', '') * 1000) : label;
      return oiMap.get(key)?.Call || 0;
    });
    const putData = chartLabels.map(label => {
      const key = chartMode === 'strikePrice' ? parseInt(label.replace('k', '') * 1000) : label;
      return oiMap.get(key)?.Put || 0;
    });
    const ndeData = chartLabels.map(label => {
      const key = chartMode === 'strikePrice' ? parseInt(label.replace('k', '') * 1000) : label;
      return ndeMap.get(key) || 0;
    });
    const ngeData = chartLabels.map(label => {
      const key = chartMode === 'strikePrice' ? parseInt(label.replace('k', '') * 1000) : label;
      return ngeMap.get(key) || 0;
    });

    let maxTotalOI = 0;
    chartLabels.forEach((label, index) => {
      const total = Math.abs(callData[index]) + Math.abs(putData[index]);
      if (total > maxTotalOI) {
        maxTotalOI = total;
      }
    });
    const maxAbsOI = maxTotalOI || 1;

    let maxTotalNDE = 0;
    ndeData.forEach(value => {
      if (Math.abs(value) > maxTotalNDE) {
        maxTotalNDE = Math.abs(value);
      }
    });
    const maxAbsNDE = maxTotalNDE || 1;
    
    let maxTotalNGE = 0;
    ngeData.forEach(value => {
      if (Math.abs(value) > maxTotalNGE) {
        maxTotalNGE = Math.abs(value);
      }
    });
    const maxAbsNGE = maxTotalNGE || 1;

    // Use the maximum of NDE and NGE for the shared y-axis scale
    const maxAbsGreeks = Math.max(maxAbsNDE, maxAbsNGE);
    const scaleFactorNDE = (maxAbsGreeks > 0 && maxAbsNDE > 0) ? (maxAbsGreeks / maxAbsNDE) : 1;
    const scaleFactorNGE = (maxAbsGreeks > 0 && maxAbsNGE > 0) ? (maxAbsGreeks / maxAbsNGE) : 1;
    const normalizedNdeData = ndeData.map(val => val * scaleFactorNDE);
    const normalizedNgeData = ngeData.map(val => val * scaleFactorNGE);

    const dynamicStepSizeOI = calculateStepSize(maxAbsOI);
    const dynamicStepSizeGreeks = calculateStepSize(maxAbsGreeks);

    const chartDatasets = [
      {
        label: 'Put',
        data: putData,
        backgroundColor: getRGBA(COLORS.Put, 1),
        borderRadius: 5,
        yAxisID: 'y',
        borderColor: 'black',
        borderWidth: 1,
        order: 2,
      },
      {
        label: 'Call',
        data: callData,
        backgroundColor: getRGBA(COLORS.Call, 1),
        borderRadius: 5,
        yAxisID: 'y',
        borderColor: 'black',
        borderWidth: 1,
        order: 1,
      },
      {
        label: 'NDE',
        data: normalizedNdeData,
        type: 'line',
        borderColor: COLORS.NDE,
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 1,
        pointHoverRadius: 5,
        borderDash: [1, 2],
        yAxisID: 'y1',
        order: 0,
      },
      {
        label: 'NGE',
        data: normalizedNgeData,
        type: 'line',
        borderColor: COLORS.NGE,
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 1,
        pointHoverRadius: 5,
        borderDash: [1, 2],
        yAxisID: 'y1',
        order: -1,
      }
    ];

    return {
      chartData: { labels: chartLabels, datasets: chartDatasets },
      maxAbsOI,
      labels: chartLabels,
      dynamicStepSizeOI,
      maxAbsNDE,
      maxAbsNGE,
      dynamicStepSizeGreeks,
      originalNdeData: ndeData,
      originalNgeData: ngeData
    };
  }, [data, chains, filters, timeframe, chartMode]);


  const options = useMemo(() => {
    const yLimit = maxAbsOI * 1.1;
    const greeksLimit = Math.max(maxAbsNDE, maxAbsNGE) * 1.1;
    const xTitle = chartMode === 'strikePrice' ? 'STRIKE PRICE' : 'EXPIRATION DATE';

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        datalabels: { display: false },
        title: { display: false },
        legend: {
          position: 'right',
          align: 'start',
          labels: {
            color: 'white',
            font: { size: 10 },
            boxWidth: 12,
            boxHeight: 12,
            padding: 10,
          },
        },
        tooltip: {
          enabled: false,
          external: customTooltip,
          callbacks: {
            title: (context) => {
              if (!context[0]) return '';
              return chartMode === 'strikePrice'
                ? `Strike Price: ${context[0].label}`
                : `Expiration Date: ${context[0].label}`;
            },
            label: (context) => {
              const { dataIndex, chart } = context;
              const datasets = chart.data.datasets;
      
              const lines = [];
      
              const putMeta = chart.getDatasetMeta(datasets.findIndex(d => d.label === 'Put'));
              const callMeta = chart.getDatasetMeta(datasets.findIndex(d => d.label === 'Call'));
              const ndeMeta = chart.getDatasetMeta(datasets.findIndex(d => d.label === 'NDE'));
              const ngeMeta = chart.getDatasetMeta(datasets.findIndex(d => d.label === 'NGE'));
      
              if (putMeta && !putMeta.hidden) {
                const putData = datasets[putMeta.index].data[dataIndex];
                const callData = callMeta ? datasets[callMeta.index].data[dataIndex] : 0;
                const totalOI = Math.abs(putData) + Math.abs(callData);
                const putPercentage = totalOI > 0 ? (Math.abs(putData) / totalOI * 100).toFixed(2) : '0.00';
                lines.push(`Put OI Change: ${putData.toFixed(0)} (${putPercentage}%)`);
              }
      
              if (callMeta && !callMeta.hidden) {
                const callData = datasets[callMeta.index].data[dataIndex];
                const putData = putMeta ? datasets[putMeta.index].data[dataIndex] : 0;
                const totalOI = Math.abs(putData) + Math.abs(callData);
                const callPercentage = totalOI > 0 ? (Math.abs(callData) / totalOI * 100).toFixed(2) : '0.00';
                lines.push(`Call OI Change: ${callData.toFixed(0)} (${callPercentage}%)`);
              }
      
              if (ndeMeta && !ndeMeta.hidden) {
                const ndeData = originalNdeData[dataIndex];
                const formattedNde = ndeData >= 1000 || ndeData <= -1000
                  ? `${(ndeData / 1000).toFixed(1)}k`
                  : ndeData.toFixed(0);
                lines.push(`Net Delta Exposure: ${formattedNde}`);
              }
              
              if (ngeMeta && !ngeMeta.hidden) {
                const ngeData = originalNgeData[dataIndex];
                const formattedNge = ngeData >= 1000 || ngeData <= -1000
                  ? `${(ngeData / 1000).toFixed(1)}k`
                  : ngeData.toFixed(2);
                lines.push(`Net Gamma Exposure: ${formattedNge}`);
              }
      
              return lines;
            },
          },
        },
      },
      animation: {
        duration: 100,
        easing: 'linear',
        properties: ['backgroundColor']
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: {
            color: '#888',
            font: { size: 11 },
            autoSkip: true,
            maxTicksLimit: 20
          },
          border: { display: true, color: 'rgba(114, 114, 114, 0.3)' },
          title: {
            display: true,
            text: xTitle,
            color: 'rgba(149, 149, 149, 1)',
            font: { size: 12, weight: 500 },
            fontFamily: "'Roboto',sans-serif",
            padding: 4
          },
          barPercentage: 0.9,
          categoryPercentage: 0.8,
        },
        y: {
          type: 'linear',
          stacked: true,
          min: -yLimit,
          max: yLimit,
          grid: { display: false },
          ticks: {
            color: '#777',
            font: { size: 10 },
            padding: 5,
            callback: (value) => {
              if (value === 0) return '0';
              if (Math.abs(value) < 1000) return value.toFixed(0);
              return `${(value / 1000).toFixed(1)}k`;
            },
            stepSize: dynamicStepSizeOI
          },
          border: { display: true, color: 'rgba(114, 114, 114, 0.3)' },
          title: {
            display: true,
            text: 'OI CHANGE',
            color: 'rgb(149, 149, 149)',
            font: { size: 12, weight: 500 },
            fontFamily: "'Roboto',sans-serif",
            padding: 1
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { display: false },
          min: -greeksLimit,
          max: greeksLimit,
          ticks: {
            color: "#666",
            font: { size: 10 },
            fontFamily: "'Roboto',sans-serif",
            padding: 1,
            callback: (value) => {
              const maxGreek = Math.max(maxAbsNDE, maxAbsNGE);
              const ngeValue = maxGreek > 0 ? (value * maxAbsNGE) / maxGreek : 0;
              const ndeValue = maxGreek > 0 ? (value * maxAbsNDE) / maxGreek : 0;

              const formattedNge = ngeValue >= 1000 || ngeValue <= -1000
                ? `${(ngeValue / 1000).toFixed(1)}k`
                : ngeValue.toFixed(2);
              
              const formattedNde = ndeValue >= 1000 || ndeValue <= -1000
                ? `${(ndeValue / 1000).toFixed(1)}k`
                : ndeValue.toFixed(0);

              return `${formattedNge} | ${formattedNde}`;
            },
            stepSize: dynamicStepSizeGreeks
          },
          border: { display: true, color: 'rgba(114, 114, 114, 0.3)' },
          title: {
            display: true,
            text: [ 'Net Delta Exposure','Net Gamma Exposure'],
            color: "#777",
            font: [
              { size: 12, weight: 500, family: "'Roboto',sans-serif" },
              { size: 12, weight: 500, family: "'Roboto',sans-serif" }
            ],
            padding: { top: 10, bottom: 10 },
            lineHeight: 1.5
          },
        },
      },
      onClick: (event, elements, chart) => {
        if (elements.length === 0) {
          console.warn('No elements clicked in chart');
          return;
        }

        const { datasetIndex, index: dataIndex } = elements[0];
        
        if (dataIndex == null || dataIndex < 0 || dataIndex >= chartData.labels.length) {
          console.warn('Invalid dataIndex:', dataIndex, 'Labels length:', chartData.labels.length, chartData.labels);
          return;
        }

        const label = chartData.labels[dataIndex];
        if (!label) {
          console.warn('Label is undefined at dataIndex:', dataIndex, chartData.labels);
          return;
        }

        const isStrikeMode = chartMode === 'strikePrice';
        const keyValue = isStrikeMode && typeof label === 'string' ? parseInt(label.replace('k', '') * 1000) : label;
        const formattedExpirationFilters = filters.Expiration_Date?.map(formatFilterDate) || [];

        const now = new Date();
        let startDateThreshold = new Date(now);
        startDateThreshold.setHours(0, 0, 0, 0);
        let applyDateFilter = timeframe !== 'all';

        if (applyDateFilter) {
          switch (timeframe) {
            case '1': startDateThreshold.setDate(startDateThreshold.getDate() - 1); break;
            case '2': startDateThreshold.setDate(startDateThreshold.getDate() - 2); break;
            case '3': startDateThreshold.setDate(startDateThreshold.getDate() - 3); break;
            case '4': startDateThreshold.setDate(startDateThreshold.getDate() - 4); break;
            case '5': startDateThreshold.setDate(startDateThreshold.getDate() - 5); break;
            case '6': startDateThreshold.setDate(startDateThreshold.getDate() - 6); break;
            case '7': startDateThreshold.setDate(startDateThreshold.getDate() - 7); break;
            case 'today': default: break;
          }
        }

        const relevantTrades = applyDateFilter
          ? data.filter(trade => new Date(trade.Entry_Date) >= startDateThreshold)
          : data;

        const groupedData = {
          'Buy Call': [],
          'Sell Call': [],
          'Buy Put': [],
          'Sell Put': []
        };

        relevantTrades.forEach(trade => {
          const parsed = parseInstrument(trade.Instrument);
          if (!parsed) return;
          if (filters.Option_Type && parsed.Option_Type !== filters.Option_Type) return;

          let matchesGroup = false;
          if (isStrikeMode) {
            if (parsed.Strike_Price === keyValue) matchesGroup = true;
          } else {
            if (parsed.Expiration_Date_Filter === keyValue) matchesGroup = true;
          }
          if (!matchesGroup) return;

          if (isStrikeMode) {
            if (formattedExpirationFilters.length > 0 && !formattedExpirationFilters.includes(parsed.Expiration_Date_Filter)) return;
          } else {
            if (filters.Strike_Price && filters.Strike_Price.length > 0 && !filters.Strike_Price.includes(parsed.Strike_Price)) return;
          }

          if (parsed.Option_Type === 'Call') {
            if (trade.Side === 'BUY') {
              groupedData['Buy Call'].push(trade);
            } else if (trade.Side === 'SELL') {
              groupedData['Sell Call'].push(trade);
            }
          } else if (parsed.Option_Type === 'Put') {
            if (trade.Side === 'BUY') {
              groupedData['Buy Put'].push(trade);
            } else if (trade.Side === 'SELL') {
              groupedData['Sell Put'].push(trade);
            }
          }
        });

        const oiData = {
          Call: chartData.datasets[1].data[dataIndex] || 0,
          Put: chartData.datasets[0].data[dataIndex] || 0
        };
        const ndeDataPoint = originalNdeData[dataIndex] || 0;
        const ngeDataPoint = originalNgeData[dataIndex] || 0;

        const segmentData = {
          groupKey: label,
          oiData,
          ndeData: ndeDataPoint,
          ngeData: ngeDataPoint,
          groupedData,
          timeframe,
          chartMode
        };

        if (onSegmentSelect) {
          onSegmentSelect({
            contextId: `insight/marketexposure`,
            segmentData
          });
        }
        
        console.log("Bar clicked. Data sent to parent:", segmentData);
      },
      onHover: (event, elements, chart) => {
        event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    };
  }, [maxAbsOI, maxAbsNDE, maxAbsNGE, labels, chartData, chartMode, dynamicStepSizeOI, dynamicStepSizeNDE, dynamicStepSizeNGE, dynamicStepSizeGreeks, originalNdeData, originalNgeData, data, filters, timeframe, onSegmentSelect]);

  const handleTimeframeChange = (event) => {
    setTimeframe(event.target.value);
  };

  const handleChartModeChange = (event) => {
    setChartMode(event.target.value);
  };

  const formattedDateRange = dateRange ? `${formatDateForDisplay(dateRange.start)} - ${formatDateForDisplay(dateRange.end)}` : 'No data available';

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '10px',
      maxWidth: MAX_WIDTH,
      margin: '5px auto',
      fontFamily: "'Roboto',sans-serif",
      
    }}>
      <div style={{
        flexShrink: 0,
        backgroundColor: 'rgba(43, 42, 42, 0.29)',
        borderRadius: '10px',
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        color: 'white',
        fontSize: '12px',
        fontFamily: "'Roboto',sans-serif",
        minWidth: '200px'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignContent: 'center',
          justifyContent: 'center',
          color: '#888',
          
        }}>
          <span>Timeframe:</span>
          <span style={{
            color: '#fff',
            fontWeight: 'bold',
            paddingBottom: '10px',
            borderBottom: '1px dotted #444'
          }}>{formattedDateRange}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontFamily: "'Roboto',sans-serif" }}>
          <label htmlFor="timeframe-select" style={{ marginBottom: '5px', color: '#888' }}>
            Timeframe:
          </label>
          <select
            id="timeframe-select"
            value={timeframe}
            onChange={handleTimeframeChange}
            style={{
              backgroundColor: '#2a2a34',
              color: 'white',
              border: '1px solid #444',
              borderRadius: '5px',
              padding: '5px',
              fontSize: '12px',
            }}
          >
            <option value="today">Today</option>
            <option value="1">1 Day ago</option>
            <option value="2">2 Days ago</option>
            <option value="3">3 Days ago</option>
            <option value="4">4 Days ago</option>
            <option value="5">5 Days ago</option>
            <option value="6">6 Days ago</option>
            <option value="7">7 Days ago</option>
            <option value="all">All Time</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontFamily: "'Roboto',sans-serif" }}>
          <label htmlFor="chart-mode-select" style={{ marginBottom: '5px', color: '#888' }}>
            Chart Mode:
          </label>
          <select
            id="chart-mode-select"
            value={chartMode}
            onChange={handleChartModeChange}
            style={{
              backgroundColor: '#2a2a34',
              color: 'white',
              border: '1px solid #444',
              borderRadius: '5px',
              padding: '5px',
              fontSize: '12px',
            }}
          >
            <option value="strikePrice">Strike Price</option>
            <option value="expirationDate">Expiration Date</option>
          </select>
        </div>
      </div>
      <div style={{ width: CHART_WIDTH, 
                    height: HEIGHT , 
                    backgroundColor: 'rgba(43, 42, 42, 0.29)',
                    borderRadius: '15px',
                    padding: '10px'
                    }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}