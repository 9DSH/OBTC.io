import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  Chart,
  ScatterController,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from 'chart.js';
import { formatStrikeLabel, formatExpirationLabel, formatDateTimeLabel } from './utils/chartHelpers';
import {
  groupStrategies,
  filterStrategies,
} from "./Strategy/utils/strategiesUtils";

Chart.register(ScatterController, LinearScale, PointElement, Tooltip, Legend);

const lerp = (a, b, t) => a + (b - a) * t;
const lerpColor = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t)));
const hexToRgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16)
];

const COLOR_STOPS = [
  { value: 30_000_000, startHex: '#bd1b09', endHex: '#ff0314', label: '≥ 30M' },
  { value: 15_000_000, startHex: '#c24915', endHex: '#cc4a16', label: '15M-30M' },
  { value: 10_000_000, startHex: '#b37802', endHex: '#e3721b', label: '10M-15M' },
  { value: 5_000_000, startHex: '#ccb702', endHex: '#cf9100', label: '5M-9M' },
  // Modified startHex and endHex for the 1M-4M range
  { value: 1_000_000, startHex: '#48616e', endHex: '#b5a412', label: '1M-4M' },
  { value: 500_000, startHex: '#373c52', endHex: '#484f6e', label: '500K-900K' },
  { value: 400_000, startHex: '#464d70', endHex: '#343a57', label: '400K-499K' },
  { value: 0, startHex: '#202433', endHex: '#323854', label: '< 400K' },
];

const getColorForValue = (value, min, max) => {
  if (typeof value !== 'number' || isNaN(value)) return 'rgb(0,0,0)';

  const stop = COLOR_STOPS.find(s => value >= s.value) || COLOR_STOPS[COLOR_STOPS.length - 1];
  const nextStop = COLOR_STOPS[COLOR_STOPS.indexOf(stop) - 1];

  const rangeMin = stop.value;
  const rangeMax = nextStop ? nextStop.value : max;

  const startRGB = hexToRgb(stop.startHex);
  const endRGB = hexToRgb(stop.endHex);

  const t = Math.max(0, Math.min(1, (value - rangeMin) / (rangeMax - rangeMin)));
  const rgb = lerpColor(startRGB, endRGB, t);
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
};

const DAYS_TO_SHOW = 7;
const Y_AXIS_WIDTH = 70;
const X_AXIS_HEIGHT = 40;
const MIN_WIDTH = 800;
const MIN_HEIGHT = 400;
const DEFAULT_SEGMENT_SIZE = 30;
const DEFAULT_X_SEGMENT_EXP = 30;
const DEFAULT_X_SEGMENT_STRIKE = 30;
const MAX_STRIKE_PRICES = 20;
const LEGEND_WIDTH = 150;

function HeatmapLegend({ minValue, maxValue, height, scale, activeRange, onLegendClick }) {
  const legendItems = [
    { label: '≥ 30M', value: 30_000_000 },
    { label: '15M-30M', value: 15_000_000 },
    { label: '10M-15M', value: 10_000_000 },
    { label: '5M-9M', value: 5_000_000 },
    { label: '1M-4M', value: 1_000_000 },
    { label: '500K-900K', value: 500_000 },
    { label: '400K-499K', value: 400_000 },
    { label: '< 400K', value: 0 },
  ];

  const getRange = (value) => {
    const stopIndex = COLOR_STOPS.findIndex(s => s.value === value);
    const start = COLOR_STOPS[stopIndex].value;
    const end = stopIndex > 0 ? COLOR_STOPS[stopIndex - 1].value - 1 : Infinity;
    return { start, end };
  };

  return (
    <div style={{
      width: LEGEND_WIDTH,
      height,
      background: 'rgba(43, 42, 42, 0.29)',
      borderRadius: '10px',
      padding: '20px 10px 0 30px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center',
      gap: '8px',
      fontSize: 'clamp(9px,1vw,11px)',
      color: '#bbb',
      fontFamily: "'Roboto',sans-serif",
      marginLeft: '10px',
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Volume (USD)</div>
      {legendItems.map((item, index) => {
        const range = getRange(item.value);
        const isActive = activeRange && activeRange.start === range.start && activeRange.end === range.end;
        return (
          <div
            key={index}
            onClick={() => onLegendClick(isActive ? null : range)}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              justifyContent: 'flex-start',
              cursor: 'pointer',
              opacity: isActive ? 1.2 : 0.6,
              transition: 'opacity 0.2s ease-in-out',
            }}
          >
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: getColorForValue(item.value, minValue, maxValue),
              marginRight: '8px',
              borderRadius: '2px',
            }} />
            <div>{item.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// Separate container for the dropdown
function DropdownContainer({ yAxisMode, setYAxisMode, height }) {
  return (
    <div style={{
      width: 'clamp(10px, 7vw, 120px)',
      minWidth: 20,
      background: 'rgba(43, 42, 42, 0.29)',
      borderRadius: "10px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: 8,
      flexShrink: 0,
      height: height,
    }}>
      <select
        value={yAxisMode}
        onChange={e => setYAxisMode(e.target.value)}
        style={{
          width: "90%",
          background: '#2a2a34',
          color: 'white',
          border: '1px solid var(--color-background-bar)',
          padding: 6,
          fontSize: 'clamp(0.4rem, 1vw, 0.6rem)',
          fontFamily: "'Roboto',sans-serif",
          borderRadius: 4,
          marginBottom: '1rem',
        }}
      >
        <option value="Expiration Date">Expiration Date</option>
        <option value="Strike Price">BTC Price</option>
      </select>
    </div>
  );
}


// MAIN TOPVOLUME WRAPPER:
export default function TopVolume(props) {
  const [yAxisMode, setYAxisMode] = useState('Expiration Date');
  const [activeLegendRange, setActiveLegendRange] = useState(null);
  const { data = [] } = props;

  const expirationYLabelsCount = useMemo(() => {
    return Array.from(
      new Set(
        data.map(row =>
          row.Expiration_Date
            ? new Date(row.Expiration_Date).toISOString().split('T')[0]
            : null
        )
      )
    ).filter(Boolean).length;
  }, [data]);

  const { minValue, maxValue } = useMemo(() => {
    const allValues = data.map(row => +row.Entry_Value).filter(v => !isNaN(v));
    return {
      minValue: allValues.length ? Math.min(...allValues) : 0,
      maxValue: allValues.length ? Math.max(...allValues) : 0,
    };
  }, [data]);

  const handleLegendClick = (range) => {
    setActiveLegendRange(range);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: props.maxWidth ? Math.round(props.maxWidth) : '100%',
      height: props.maxHeight ? Math.round(props.maxHeight) : '100%',
      minWidth: MIN_WIDTH + LEGEND_WIDTH,
      minHeight: MIN_HEIGHT,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        background: 'transparent',
        width: '100%',
        height: '100%'
      }}>
        {/* Separate dropdown container on the left */}
        <DropdownContainer yAxisMode={yAxisMode} setYAxisMode={setYAxisMode} height={props.maxHeight || MIN_HEIGHT} />

        {/* Chart container */}
        <div style={{
          flexGrow: 1,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '0',
          marginLeft: '10px',
        }}>
          {yAxisMode === "Strike Price"
            ? <StrikePriceGrid {...props} expirationYLabelsCount={expirationYLabelsCount} activeLegendRange={activeLegendRange} />
            : <ExpirationGrid {...props} maxYLabels={expirationYLabelsCount} activeLegendRange={activeLegendRange} />}
        </div>

        {/* Legend container on the right */}
        <HeatmapLegend
          minValue={minValue}
          maxValue={maxValue}
          height={props.maxHeight || MIN_HEIGHT}
          scale={1}
          activeRange={activeLegendRange}
          onLegendClick={handleLegendClick}
        />
      </div>
    </div>
  );
}

// --- MODE 1: Expiration Date ---
function ExpirationGrid({
  data = [],
  filters = {},
  onSegmentSelect,
  maxWidth = null,
  maxHeight = null,
  maxYLabels = 20,
  activeLegendRange,
}) {
  return (
    <HeatmapCore
      data={data}
      filters={filters}
      onSegmentSelect={onSegmentSelect}
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      mode="Expiration Date"
      segmentSizeX={DEFAULT_X_SEGMENT_EXP}
      segmentSizeY={DEFAULT_SEGMENT_SIZE}
      maxStrikePrices={MAX_STRIKE_PRICES}
      targetYLabels={maxYLabels}
      activeLegendRange={activeLegendRange}
    />
  );
}

// --- MODE 2: Strike Price ---
function StrikePriceGrid({
  data = [],
  filters = {},
  onSegmentSelect,
  maxWidth = null,
  maxHeight = null,
  expirationYLabelsCount,
  activeLegendRange,
}) {
  const strikeValueMap = {};
  for (const row of data) {
    if (row.Strike_Price != null && !isNaN(row.Strike_Price) && row.Entry_Value != null) {
      const strike = row.Strike_Price;
      strikeValueMap[strike] = (strikeValueMap[strike] || 0) + +row.Entry_Value;
    }
  }
  const strikeLabels = Object.entries(strikeValueMap)
    .sort(([, vA], [, vB]) => vB - vA)
    .slice(0, MAX_STRIKE_PRICES)
    .map(([strike]) => Number(strike))
    .sort((a, b) => a - b);
  const strikeRows = strikeLabels.length;

  const targetSegmentSizeY =
    expirationYLabelsCount && strikeRows
      ? (DEFAULT_SEGMENT_SIZE * expirationYLabelsCount) / strikeRows
      : DEFAULT_SEGMENT_SIZE;

  return (
    <HeatmapCore
      data={data}
      filters={filters}
      onSegmentSelect={onSegmentSelect}
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      mode="Strike Price"
      segmentSizeX={DEFAULT_X_SEGMENT_STRIKE}
      segmentSizeY={targetSegmentSizeY}
      maxStrikePrices={MAX_STRIKE_PRICES}
      targetYLabels={expirationYLabelsCount}
      activeLegendRange={activeLegendRange}
    />
  );
}

// --- Core Heatmap Component ---
function HeatmapCore({
  data = [],
  filters = {},
  onSegmentSelect,
  maxWidth = null,
  maxHeight = null,
  mode = "Expiration Date",
  segmentSizeX = 30,
  segmentSizeY = 30,
  maxStrikePrices = 20,
  targetYLabels = 20,
  activeLegendRange,
}) {
  const chartRef = useRef(null), chartInstanceRef = useRef(null), wrapperRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: maxWidth || 0, height: maxHeight || 0 });
  const [yLabelRects, setYLabelRects] = useState(null);

  useEffect(() => {
    if (maxWidth || maxHeight) {
      setContainerSize((prev) => ({
        width: maxWidth || prev.width || MIN_WIDTH,
        height: maxHeight || prev.height || MIN_HEIGHT,
      }));
      return;
    }
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setContainerSize({ width: Math.max(rect.width || MIN_WIDTH, MIN_WIDTH), height: Math.max(rect.height || MIN_HEIGHT, MIN_HEIGHT) });
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const r = entry.contentRect;
        setContainerSize({
          width: Math.max(r.width, 200),
          height: Math.max(r.height, 200),
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxWidth, maxHeight]);

  const { fixedXLabels, fixedYLabels } = useMemo(() => {
    const allDays = Array.from(
      new Set(data.map(row =>
        row.Entry_Date ? new Date(row.Entry_Date).toISOString().split('T')[0] : null)))
      .filter(Boolean).sort().slice(-DAYS_TO_SHOW);

    const segments = ['0-8', '8-16', '16-24'];
    const fixedXLabels = allDays.flatMap(day => segments.map(seg => `${day} ${seg}`));
    let fixedYLabels;

    if (mode === 'Expiration Date') {
      fixedYLabels = Array.from(
        new Set(
          data.map(row =>
            row.Expiration_Date ? new Date(row.Expiration_Date).toISOString().split('T')[0] : null
          )
        )
      )
        .filter(Boolean)
        .sort()
        .reverse();
    } else {
      const strikeValueMap = {};
      for (const row of data) {
        if (row.Strike_Price != null && !isNaN(row.Strike_Price) && row.Entry_Value != null) {
          const strike = row.Strike_Price;
          strikeValueMap[strike] = (strikeValueMap[strike] || 0) + +row.Entry_Value;
        }
      }
      fixedYLabels = Object.entries(strikeValueMap)
        .sort(([, vA], [, vB]) => vB - vA)
        .slice(0, maxStrikePrices)
        .map(([strike]) => Number(strike))
        .sort((a, b) => b - a);
    }
    return { fixedXLabels, fixedYLabels };
  }, [data, mode, maxStrikePrices]);

  const filteredData = useMemo(() => {
    const result = data.filter((item) => {
      const itemDate = item.Entry_Date ? new Date(item.Entry_Date) : null;
      if (!itemDate || isNaN(itemDate.getTime())) return true;
      return Object.entries(filters).every(([k, v]) => {
        if (!v || (Array.isArray(v) && v.length === 0)) return true;
        if (k === "Entry_Date") {
          const start = v.start ? new Date(v.start) : null;
          const end = v.end ? new Date(v.end) : null;
          if (start && isNaN(start.getTime())) return true;
          if (end && isNaN(end.getTime())) return true;
          return (!start || itemDate >= start) && (!end || itemDate <= end);
        }
        if ((k === "Size" || k === "Entry_Value") && Array.isArray(v)) {
          const [min, max] = v.map(Number), num = Number(item[k]);
          return !isNaN(num) && num >= min && num <= max;
        }
        return Array.isArray(v) ? v.includes(item[k]) : String(item[k]) === v;
      });
    });
    return result;
  }, [data, filters]);

  const totalTradesData = useMemo(() => {
    const filtered = filterStrategies(data);
    return filtered;
  }, [data]);

  const { plotData, groupIndices, minValue, maxValue } = useMemo(() => {
    const agg = {};
    for (const row of filteredData) {
      if (!row.Entry_Date || (mode === 'Expiration Date' && !row.Expiration_Date) ||
        (mode === 'Strike Price' && !row.Strike_Price) || !row.Entry_Value) continue;

      const entryDate = new Date(row.Entry_Date);
      const y = mode === 'Expiration Date'
        ? new Date(row.Expiration_Date).toISOString().split('T')[0]
        : row.Strike_Price;
      const day = entryDate.toISOString().split('T')[0];
      const h = entryDate.getHours();
      const segment = h < 8 ? '0-8' : h < 16 ? '8-16' : '16-24';
      const x = `${day} ${segment}`;
      const k = `${x}|${y}`;
      if (!agg[k]) agg[k] = { value: 0, trades: [], x, y, day, segment };
      agg[k].value += +row.Entry_Value;
      agg[k].trades.push(row);
    }
    const plotData = Object.values(agg).filter(d => fixedXLabels.includes(d.x) && fixedYLabels.includes(d.y));
    const allValues = data.map(row => +row.Entry_Value).filter(v => !isNaN(v));
    const minValue = allValues.length ? Math.min(...allValues) : 0;
    const maxValue = allValues.length ? Math.max(...allValues) : 0;
    const groupIndices = Array.from(new Set(fixedXLabels.map(lbl => lbl.split(' ')[0]))).map((_, idx) => idx * 3).slice(1);
    return { plotData, groupIndices, minValue, maxValue };
  }, [filteredData, fixedXLabels, fixedYLabels, data, mode]);

  const logicalCanvasWidth = fixedXLabels.length * segmentSizeX;
  const logicalCanvasHeight = fixedYLabels.length * segmentSizeY;
  const logicalTotalWidth = Y_AXIS_WIDTH + logicalCanvasWidth;
  const logicalTotalHeight = logicalCanvasHeight + X_AXIS_HEIGHT;
  const scale = useMemo(() => {
    const availW = (containerSize.width && containerSize.width > 0) ? containerSize.width : Math.max(MIN_WIDTH, logicalTotalWidth);
    const availH = (containerSize.height && containerSize.height > 0) ? containerSize.height : Math.max(MIN_HEIGHT, logicalTotalHeight);
    const scaleW = availW / logicalTotalWidth;
    const scaleH = availH / logicalTotalHeight;
    return Math.min(scaleW, scaleH, 1);
  }, [containerSize, logicalTotalWidth, logicalTotalHeight]);
  const scaled = useMemo(() => {
    const s = scale || 1, EXTRA_BOTTOM_PX = Math.max(1, Math.round(1 * s));
    const canvasWidth = Math.max(1, Math.round(logicalCanvasWidth * s));
    const canvasHeight = Math.max(1, Math.round(logicalCanvasHeight * s));
    const scaledXAxisHeight = Math.max(24, Math.round(X_AXIS_HEIGHT * s));
    const scaledYAxisWidth = Math.max(40, Math.round(Y_AXIS_WIDTH * s));
    const wrapperHeight = canvasHeight + scaledXAxisHeight + EXTRA_BOTTOM_PX;
    const wrapperWidth = Math.round((Y_AXIS_WIDTH + logicalCanvasWidth) * s);
    const scaledSegmentX = Math.max(1, Math.round(segmentSizeX * s));
    const scaledSegmentY = Math.max(1, Math.round(segmentSizeY * s));
    return {
      s,
      canvasWidth,
      canvasHeight,
      wrapperWidth,
      wrapperHeight,
      scaledSegmentX,
      scaledSegmentY,
      scaledYAxisWidth,
      scaledXAxisHeight,
      fontSize: Math.max(6, Math.round(8 * s)),
      pointRadius: Math.max(0, Math.round(0 * s)),
      pointHoverRadius: Math.max(6, Math.round(15 * s)),
      pointHitRadius: Math.max(6, Math.round(12 * s)),
      extraBottomPx: EXTRA_BOTTOM_PX,
    };
  }, [scale, logicalCanvasWidth, logicalCanvasHeight, segmentSizeX, segmentSizeY]);

  useEffect(() => {
    const ctx = chartRef.current?.getContext('2d');
    if (!ctx) return;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
      setYLabelRects(null);
    }
    if (!fixedXLabels.length || !fixedYLabels.length) return;
    const dataset = {
      data: plotData.map(pt => ({
        x: fixedXLabels.indexOf(pt.x) + 0.5,
        y: fixedYLabels.indexOf(pt.y) + 0.5,
        _raw: pt
      })),
      pointRadius: scaled.pointRadius,
      pointHoverRadius: scaled.pointHoverRadius,
      pointHitRadius: scaled.pointHitRadius,
      backgroundColor: 'rgba(0,0,0,0)',
    };
    chartInstanceRef.current = new Chart(ctx, {
      type: 'scatter',
      data: { datasets: [dataset] },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        animation: false,
        events: ['mousemove', 'mouseout', 'click'],
        layout: { padding: { bottom: scaled.extraBottomPx, top: 0, left: 0, right: 0 } },
        scales: {
          x: { type: 'linear', min: 0, max: Math.max(0, fixedXLabels.length), display: false, offset: false },
          y: { type: 'linear', min: 0, max: Math.max(0, fixedYLabels.length), display: false, reverse: true, offset: false },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(69, 69, 69, 0.86)',
            intersect: true,
            displayColors: false,
            mode: 'nearest',
            callbacks: {
              title: (items) => {
                if (!items || !items.length) return '';
                const item = items[0];
                const pt = item.dataset.data[item.dataIndex]._raw;
                return `${formatDateOnlyLabel(pt.day)} ${pt.segment}`;
              },
              label: (ctx) => {
                const pt = ctx.dataset.data[ctx.dataIndex]._raw;
                return [
                  mode === "Expiration Date"
                    ? "Expiry: " + formatExpirationLabel(pt.y)
                    : "Strike: " + formatStrikeLabel(pt.y),
                  "Total: " + formatStrikeLabel(pt.value)
                ];
              }
            }
          },
          datalabels: { display: false }
        },
        onHover: (evt, els) => {
          if (evt.native) evt.native.target.style.cursor = els.length ? 'pointer' : 'default';
        },
        onClick: (evt, els) => {
          if (els.length > 0) {
            const idx = els[0].index;
            const pt = plotData[idx];
            const segmentData = {
              day: pt.day,
              segment: pt.segment,
              trades: pt.trades,
              value: pt.value,
              x: pt.x,
              y: pt.y,
            };
            const { comboGroups, blockTradeGroups } = groupStrategies(pt.trades, totalTradesData);
            segmentData.blockTrades = blockTradeGroups;
            segmentData.combo = comboGroups;
            const payload = {
              contextId: 'insight/topvolume',
              selectedSegment: segmentData,
              comboGroups,
              blockTradeGroups,
            };
            onSegmentSelect?.(payload);
          }
        },
      },
      plugins: [{
        id: 'heatmap',
        beforeDraw(c) {
          const { ctx } = c;
          const buf = document.createElement('canvas');
          buf.width = ctx.canvas.width;
          buf.height = ctx.canvas.height;
          const bctx = buf.getContext('2d');
          const xScale = c.scales.x;
          const yScale = c.scales.y;
          if (!xScale || !yScale) return;
          for (const pt of plotData) {
            // Apply the legend filter here
            if (activeLegendRange) {
                if (+pt.value < activeLegendRange.start || +pt.value > activeLegendRange.end) {
                    continue;
                }
            }

            const xi = fixedXLabels.indexOf(pt.x), yi = fixedYLabels.indexOf(pt.y);
            if (xi === -1 || yi === -1) continue;
            let xLeft = xScale.getPixelForValue(xi), xRight = xScale.getPixelForValue(xi + 1);
            let yTop = yScale.getPixelForValue(yi), yBottom = yScale.getPixelForValue(yi + 1);
            const left = Math.min(xLeft, xRight), right = Math.max(xLeft, xRight);
            const top = Math.min(yTop, yBottom), bottom = Math.max(yTop, yBottom);
            const clampedLeft = Math.max(0, Math.min(Math.round(left), ctx.canvas.width));
            const clampedRight = Math.max(0, Math.min(Math.round(right), ctx.canvas.width));
            const clampedTop = Math.max(0, Math.min(Math.round(top), ctx.canvas.height));
            const clampedBottom = Math.max(0, Math.min(Math.round(bottom), ctx.canvas.height));
            const w = clampedRight - clampedLeft;
            const h = clampedBottom - clampedTop;
            if (w <= 0 || h <= 0) continue;
            bctx.fillStyle = getColorForValue(pt.value, minValue, maxValue);
            bctx.fillRect(clampedLeft, clampedTop, w, h);
          }
          bctx.strokeStyle = '#555';
          bctx.lineWidth = Math.max(1, Math.min(2, Math.ceil(1 * scaled.s)));
          for (const gi of groupIndices) {
            let x = c.scales.x.getPixelForValue(gi);
            x = Math.round(Math.max(0, Math.min(x, ctx.canvas.width)));
            bctx.beginPath();
            bctx.moveTo(x, 0);
            bctx.lineTo(x, ctx.canvas.height);
            bctx.stroke();
          }
          ctx.drawImage(buf, 0, 0);
        }
      }]
    });
    try {
      const chart = chartInstanceRef.current;
      const yScale = chart.scales.y;
      if (yScale) {
        const rects = fixedYLabels.map((_, i) => {
          const a = yScale.getPixelForValue(i);
          const b = yScale.getPixelForValue(i + 1);
          const top = Math.min(a, b);
          const bottom = Math.max(a, b);
          const clampedTop = Math.max(0, Math.min(Math.round(top), ctx.canvas.height));
          const clampedBottom = Math.max(0, Math.min(Math.round(bottom), ctx.canvas.height));
          const height = Math.max(1, clampedBottom - clampedTop);
          return { top: clampedTop, height };
        });
        setYLabelRects(rects);
      }
    } catch (err) { setYLabelRects(null); }
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
        setYLabelRects(null);
      }
    };
  }, [fixedXLabels, fixedYLabels, plotData, groupIndices, minValue, maxValue, onSegmentSelect, scaled, mode, activeLegendRange]);

  if (!fixedXLabels.length || !fixedYLabels.length) {
    return <div style={{ color: 'white', padding: 20, textAlign: 'center' }}>No data</div>;
  }
  const {
    canvasWidth, canvasHeight, wrapperWidth, wrapperHeight,
    scaledYAxisWidth, scaledXAxisHeight, fontSize, scaledSegmentX, scaledSegmentY
  } = scaled;

  return (
    <div ref={wrapperRef}
      style={{
        color: 'white',
        fontFamily: "'Roboto',sans-serif",
        width: wrapperWidth,
        height: wrapperHeight,
        position: 'relative',
        borderRadius: '10px',
        overflow: 'hidden',
        background: 'rgba(43, 42, 42, 0.29)',
      }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
           top: 0,
          width: scaledYAxisWidth,
          height: canvasHeight,
          zIndex: 2,
          
        }}
      >
        {fixedYLabels.map((lbl, i) => {
          const rect = yLabelRects && yLabelRects[i];
          const top = rect ? rect.top : Math.round(i * scaledSegmentY);
          const height = rect ? rect.height : scaledSegmentY;
          const label = mode === "Expiration Date"
            ? formatExpirationLabel(lbl)
            : formatStrikeLabel(lbl);
          return (
            <div
              key={String(lbl)}
              style={{
                position: 'absolute',
                top,
                height,
                right: 0,
                width: '100%',
                color: '#bbb',
                fontFamily: "'Roboto',sans-serif",
                fontSize: 9,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: Math.max(6, Math.round(8 * scaled.s)),
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
              title={label}
            >
              {label}
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          left: scaledYAxisWidth,
          bottom: 0,
          width: canvasWidth,
          height: scaledXAxisHeight,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ height: '50%', position: 'relative', width: '100%' }}>
          {fixedXLabels.map((lbl, i) => (
            <div
              key={lbl + '-segment'}
              style={{
                width: scaledSegmentX,
                minWidth: scaledSegmentX,
                textAlign: 'center',
                color: '#bbb',
                fontSize,
                fontFamily: "'Roboto',sans-serif",
                position: 'absolute',
                left: Math.round(i * scaledSegmentX),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {lbl.split(' ')[1]}
            </div>
          ))}
        </div>
        <div style={{ height: '50%', position: 'relative', width: '100%' }}>
          {fixedXLabels.map((lbl, i) => {
            const [date, seg] = lbl.split(' ');
            return (
              <div
                key={lbl + '-date'}
                style={{
                  width: scaledSegmentX * 2,
                  minWidth: scaledSegmentX * 2,
                  textAlign: 'center',
                  color: '#bbb',
                  fontSize: 9,
                  fontFamily: "'Roboto',sans-serif",
                  position: 'absolute',
                  left: Math.round(i * scaledSegmentX) - 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {seg === '8-16' ? formatDateOnlyLabel(date) : ''}
              </div>
            );
          })}
        </div>
      </div>
      <canvas
        ref={chartRef}
        style={{
          position: 'absolute',
          left: scaledYAxisWidth,
          top: 0,
          width: canvasWidth,
          height: canvasHeight,
          zIndex: 10,
          imageRendering: 'pixelated',
        }}
        width={canvasWidth}
        height={canvasHeight}
      />
    </div>
  );
}

function formatDateOnlyLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const year = d.getFullYear().toString().slice(-2);
  return `${day} ${month} ${year}`;
}