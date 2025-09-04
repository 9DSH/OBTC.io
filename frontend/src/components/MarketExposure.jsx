import React, { useMemo, useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement);

const COLORS = {
  Call: 'green',
  Put: 'darkred',
  NDE: 'gold'
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
    JUL: '07', AUG: '08', 'SEP': '09', 'OCT': '10', NOV: '11', DEC: '12'
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
            console.warn(`Skipping trade for instrument ${instrumentKey}: Delta not found in chains data.`);
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
  const datasets = context.chart.data.datasets;


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
    titleDiv.style.padding = '7px 8px';
    titleDiv.style.letterSpacing=  '1px';
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
  tooltipEl.style.left = positionX + tooltipModel.caretX + 'px';
  tooltipEl.style.top = positionY + tooltipModel.caretY + 'px';
};

export default function MarketExposure({ data = [], chains = [], filters = {} }) {
  const [timeframe, setTimeframe] = useState('7');
  const [dateRange, setDateRange] = useState(null);
  const [chartMode, setChartMode] = useState('strikePrice');
  // New state to track the hovered bar index
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    if (chains && chains.length > 0) {
      const sortedChains = [...chains].sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));
      const firstTimestamp = sortedChains[0].Timestamp;
      const lastTimestamp = sortedChains[sortedChains.length - 1].Timestamp;
      console.log(`[DATA RANGE] Full data range from chains prop: ${firstTimestamp} to ${lastTimestamp}`);
    }
  }, [chains]);

  const { chartData, maxAbsOI, labels, dynamicStepSize, maxAbsNDE, originalNdeData } = useMemo(() => {
    if (chains.length === 0 && data.length === 0) {
      setDateRange(null);
      return {
        chartData: { labels: [], datasets: [] },
        maxAbsOI: 0,
        labels: [],
        dynamicStepSize: 50,
        maxAbsNDE: 0,
        originalNdeData: []
      };
    }

    const formattedExpirationFilters = filters.Expiration_Date?.map(formatFilterDate) || [];
    
    const { oiChanges, dateRange: oiDateRange } = calculate_oi_change(chains, timeframe);
    setDateRange(oiDateRange);

    const ndeChanges = calculate_trades_nde_change(data, chains, timeframe);

    const combinedData = [...oiChanges, ...ndeChanges];
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
    });

    let chartLabels;
    if (chartMode === 'strikePrice') {
        chartLabels = Array.from(new Set([...Array.from(oiMap.keys()), ...Array.from(ndeMap.keys())])).sort((a, b) => a - b).map(p => p / 1000 + 'k');
    } else {
        chartLabels = Array.from(new Set([...Array.from(oiMap.keys()), ...Array.from(ndeMap.keys())])).sort();
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

    const scaleFactor = (maxAbsNDE > 0 && maxAbsOI > 0) ? (maxAbsOI / maxAbsNDE) : 1;
    const normalizedNdeData = ndeData.map(val => val * scaleFactor);

    let calculatedStepSize;
    if (maxAbsOI <= 500) { calculatedStepSize = 100; } 
    else if (maxAbsOI <= 1000) { calculatedStepSize = 250; } 
    else if (maxAbsOI <= 5000) { calculatedStepSize = 500; } 
    else if (maxAbsOI <= 10000) { calculatedStepSize = 1000; } 
    else { calculatedStepSize = Math.ceil(maxAbsOI / 5000) * 1000; }
    
    if (maxAbsOI > 0 && calculatedStepSize > maxAbsOI) { calculatedStepSize = Math.floor(maxAbsOI / 2); }
    if (calculatedStepSize < 50 && maxAbsOI > 0) { calculatedStepSize = 50; }
    calculatedStepSize = Math.ceil(calculatedStepSize / 50) * 50;
    
    // Determine bar colors based on hover state
    const barCallColors = callData.map((data, index) => 
      hoveredIndex === null || hoveredIndex === index 
        ? COLORS.Call
        : 'rgba(0, 128, 0, 0.4)'
    );

    const barPutColors = putData.map((data, index) =>
      hoveredIndex === null || hoveredIndex === index
        ? COLORS.Put
        : 'rgba(139, 0, 0, 0.4)'
    );

    const chartDatasets = [
      {
        label: 'Put',
        data: putData,
        backgroundColor: barPutColors,
        borderRadius: 5,
        yAxisID: 'y',
        borderColor: 'black', // keep solid border
        borderWidth: 1, 
        order: 2,
      },
      {
        label: 'Call',
        data: callData,
        backgroundColor: barCallColors,
        borderRadius: 5,
        yAxisID: 'y',
        borderColor: 'black', // keep solid border
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
      }
    ];

    return { chartData: { labels: chartLabels, datasets: chartDatasets }, maxAbsOI, labels: chartLabels, dynamicStepSize: calculatedStepSize, maxAbsNDE, originalNdeData: ndeData };
  }, [data, chains, filters, timeframe, chartMode, hoveredIndex]);

  const options = useMemo(() => {
    const yLimit = maxAbsOI * 1.1;
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
          enabled: false, // Disable default tooltip
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
      
              return lines;
            },
          },

        },
      },
      // New animation property to speed up easing
      animation: {
        duration: 300, // This value is in milliseconds. 150 is a fast animation.
        easing: 'linear', // Use 'linear' for a consistent speed, or other easing functions for different effects
        properties: ['backgroundColor'] // Apply this animation only to the background color
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { color: '#888', 
                  font: { size: 11 }, 
                  autoSkip: true, 
                  maxTicksLimit: 20 },
          border: { display: true, color: 'rgba(114, 114, 114, 0.3)' },
          title: { display: true, 
                   text: xTitle, 
                   color: 'rgba(149, 149, 149, 1)', 
                   font: { size: 12, weight: 500 }, 
                   fontFamily: "'Roboto',sans-serif",
                   padding: 4 },

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
              if (value === 0) { return '0'; }
              if (Math.abs(value) < 1000) { return value.toFixed(0); }
              return `${(value / 1000).toFixed(1)}k`;
            },
            stepSize: dynamicStepSize
          },
          border: { display: true, color: 'rgba(114, 114, 114, 0.3)' },
          title: { display: true, 
                  text: 'OI CHANGE', 
                  color: 'rgb(149, 149, 149)', 
                  font: { size: 12, weight: 500 }, 
                  fontFamily: "'Roboto',sans-serif",
                  padding: 1 },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { display: false },
          min: -yLimit,
          max: yLimit,
          ticks: { 
            color: "rgba(251, 255, 0, 0.56)", 
            font: { size: 10 },
            fontFamily: "'Roboto',sans-serif",
            padding: 5,
            callback: (value) => {
                const scaleFactor = (maxAbsOI > 0 && maxAbsNDE > 0) ? (maxAbsOI / maxAbsNDE) : 1;
                const originalValue = value / scaleFactor;
                if (Math.abs(originalValue) >= 1000) { 
                    return `${(originalValue / 1000).toFixed(1)}k`; 
                }
                return originalValue.toFixed(0);
            }
          },
          border: { display: true, color: 'rgba(114, 114, 114, 0.3)' },
          title: { display: true, 
                    text: 'NDE CHANGE', 
                    color: COLORS.NDE, 
                    font: { size: 12, weight: 500 }, 
                    fontFamily: "'Roboto',sans-serif",
                    padding: 1 },
        },
      },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const { dataIndex } = elements[0];
          const groupKey = labels[dataIndex];
          const barData = chartData.datasets.slice(0, 2).reduce((acc, dataset) => ({ ...acc, [dataset.label]: dataset.data[dataIndex] }), {});
          const ndeDataPoint = originalNdeData[dataIndex];
          console.log(`Bar clicked: Group: ${groupKey}, OI Data:`, barData, `NDE Data: ${ndeDataPoint}`);
        }
      },
      onHover: (event, elements, chart) => {
        if (elements.length > 0) {
          const { datasetIndex, index } = elements[0];
          setHoveredIndex(index);
        } else {
          setHoveredIndex(null);
        }
      }
    };
  }, [maxAbsOI, maxAbsNDE, labels, chartData, chartMode, dynamicStepSize, originalNdeData]);
  const handleTimeframeChange = (event) => {
    setTimeframe(event.target.value);
  };
  
  const handleChartModeChange = (event) => {
    setChartMode(event.target.value);
  };

  const formattedDateRange = dateRange ? `${formatDateForDisplay(dateRange.start)} - ${formatDateForDisplay(dateRange.end)}` : 'No data available';

  return (
    <div style={{ display: 'flex', 
                  justifyContent: 'center',
                   gap: '10px', 
                   maxWidth: MAX_WIDTH, 
                   margin: '5px auto',
                   fontFamily: "'Roboto',sans-serif", }}>
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
        <div style={{ display: 'flex', 
                      flexDirection: 'column' ,
                      alignContent: 'center',
                      justifyContent: 'center',
                      color: '#888',}}>
          <span>Timeframe:</span>
          <span style={{ color: '#fff', 
                        fontWeight: 'bold' ,
                        paddingBottom: '10px',
                         borderBottom: '1px dotted #444'}}>{formattedDateRange}</span>
        </div>
         {/*Timeframe Button */}
         <div style={{ display: 'flex', flexDirection: 'column', fontFamily: "'Roboto',sans-serif", }}>
          <label htmlFor="timeframe-select" 
                 style={{ 
                  marginBottom: '5px',
                  color: '#888', }}
              >
            Timeframe:
          </label>
          <select
            id="timeframe-select"
            value={timeframe}
            onChange={handleTimeframeChange}
            style={{
              backgroundColor: '#2a2a34',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              
              fontSize: '11px',
              
            }}
          >
            <option value="today">Today</option>
            <option value="1">1 day ago</option>
            <option value="2">2 days ago</option>
            <option value="3">3 days ago</option>
            <option value="4">4 days ago</option>
            <option value="5">5 days ago</option>
            <option value="6">6 days ago</option>
            <option value="7">7 days ago</option>
            <option value="all">All Time</option>
          </select>
        </div>
        
        {/* mode Button */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="chart-mode-select" 
                  style={{ 
                    marginBottom: '5px',
                    color: '#888' 
                    }}
                >
                  Mode:
          </label>
          <select
            id="chart-mode-select"
            value={chartMode}
            onChange={handleChartModeChange}
            style={{
              backgroundColor: '#2a2a34',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            <option value="strikePrice">Strike Price</option>
            <option value="expirationDate">Expiration Date</option>
          </select>
        </div>


      </div>
      <div style={{
        backgroundColor: 'rgba(43, 42, 42, 0.29)',
        borderRadius: '10px',
        padding: '8px',
        boxSizing: 'border-box',
        width: CHART_WIDTH,
      }}>
        {chains.length > 0 && labels.length > 0 ? (
          <Bar options={options} data={chartData} style={{ height: HEIGHT }} />
        ) : (
          <div style={{ color: 'white', textAlign: 'center', height: HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            No data to display for the selected timeframe and mode.
          </div>
        )}
      </div>
    </div>
  );
}