import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  Chart,
  ScatterController,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from 'chart.js';
import { formatStrikeLabel, formatExpirationLabel, formatDateTimeLabel } from '../utils/chartHelpers';
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

const getColorForValue = (value, min, max) => {
  if (typeof value !== 'number' || isNaN(value)) return 'rgb(0,0,0)';

  let startHex, endHex;
  let rangeMin, rangeMax;
  
  if (value >= 30_000_000) { // 10M+
    startHex = '#bd1b09'; // red
    endHex = '#de0211';   // dark red #ad1d27
    rangeMin = 30_000_000;
    rangeMax = max;
  } else if (value >= 15_000_000) { // 10M+
    startHex = '#c24915'; // dark orange
    endHex = '#cc4a16';   // dark orange
    rangeMin = 15_000_000;
    rangeMax = 25_000_000;
  } else if (value >= 10_000_000) { // 5M–9M
    startHex = '#b37802'; // orange
    endHex = '#e3721b';   // dark orange   
    rangeMin = 10_000_000;
    rangeMax = 15_000_000;
  } else if (value >= 5_000_000) { // 5M–9M
    startHex = '#c78904'; // ywllow-orange
    endHex = '#b38c02';   // dark orange
    rangeMin = 5_000_000;
    rangeMax = 9_000_000;
  } else if (value >= 1_000_000) { // 1M–4M
    startHex = '#505773'; // darkblue
    endHex = '#cccc00';   // dark yellow
    rangeMin = 1_000_000;
    rangeMax = 4_000_000;
  } else if (value >= 500_000) { // 500k–900k
    startHex = '#373c52'; // green
    endHex = '#484f6e';   // dark blue
    rangeMin = 500_000;
    rangeMax = 900_000;
  } else if (value >= 400_000) { // 400k–499k
    startHex = '#464d70'; // purple
    endHex = '#343a57';   // dark purple
    rangeMin = 400_000;
    rangeMax = 499_999;
  } else { // less than 400k
    startHex = '#202433'; // very dark 
    endHex = '#323854';   // dark 
    rangeMin = min;
    rangeMax = 399_999;
  }

  const startRGB = hexToRgb(startHex);
  const endRGB = hexToRgb(endHex);
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

// MAIN TOPVOLUME WRAPPER:
export default function TopVolume(props) {
  const [yAxisMode, setYAxisMode] = useState('Expiration Date');
  const { data = [] } = props;

  // Find the maximum y rows (expirations) for Expiration Date mode
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

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: props.maxWidth ? Math.round(props.maxWidth) : '100%',
      height: props.maxHeight ? Math.round(props.maxHeight) : '100%',
      minWidth: MIN_WIDTH,
      minHeight: MIN_HEIGHT,
      overflow: 'hidden',
    }}>
      {/* Sidebar left */}
      <div style={{ display: 'flex', 
                    flexDirection: 'row', 
                    background: 'transparent' }}>

        <div style={{
          width: 'clamp(10px, 7vw, 120px)',
          minWidth: 20,
          background: 'var(--color-background-bar',
          borderRadius: "10px 0 0 10px ",
          display: "flex",
          flexDirection: "column",  // stack items vertically
          alignItems: "center",     // horizontal centering
          justifyContent: "flex-start", // push to top
          paddingTop: 8,            // optional: space from very top
        }}>
          <select
            value={yAxisMode}
            onChange={e => setYAxisMode(e.target.value)}
            style={{
              width: "90%",
              background: '#2a2a34',
              color: 'white',
              border: '1px solid var(--color-background-bar',
              padding: 6,
              fontSize: 'clamp(0.4rem, 1vw, 0.6rem)',
              fontFamily: "'Roboto',sans-serif",
              borderRadius: 4,
            }}
          >
            <option value="Expiration Date">Expiration Date</option>
            <option value="Strike Price">Strike Price</option>
          </select>
        </div>

        {yAxisMode === "Strike Price"
          ? <StrikePriceGrid {...props} expirationYLabelsCount={expirationYLabelsCount} />
          : <ExpirationGrid {...props} maxYLabels={expirationYLabelsCount} />}
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
  maxYLabels = 20, // actual y rows present
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
}) {
  // Compute rows to display
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

  // Compute segmentSizeY so that Strike mode is as tall as Expiration
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
      segmentSizeX={DEFAULT_X_SEGMENT_STRIKE}  // Make this WIDER than expiration
      segmentSizeY={targetSegmentSizeY}
      maxStrikePrices={MAX_STRIKE_PRICES}
      targetYLabels={expirationYLabelsCount}
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
  segmentSizeX = 30,  // Grid column width
  segmentSizeY = 30,  // Grid row (Y) height
  maxStrikePrices = 20,
  targetYLabels = 20, // just for match
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

  //-- axis labels
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
      // Strike Price
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
        .sort((a, b) =>  b - a);
    }
    return { fixedXLabels, fixedYLabels };
  }, [data, mode, maxStrikePrices]);

  // -- filter
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

  // --- aggregate ---
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

  // --- geometry ---
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
                return `${ formatDateOnlyLabel(pt.day)} ${pt.segment}`;
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
            console.log('Selected segment raw data:', pt); // Log raw segment data
        
            // Prepare segmentData in the required format
            const segmentData = {
              day: pt.day,
              segment: pt.segment,
              trades: pt.trades,
              value: pt.value,
              x: pt.x,
              y: pt.y,
            };
        
            console.log('Prepared segmentData:', segmentData); // Log segmentData before groupStrategies
        
            // Call groupStrategies to get combo and block trade groups
            const { comboGroups, blockTradeGroups } = groupStrategies(pt.trades, totalTradesData);
        
            // Add blockTrades and combo to segmentData
            segmentData.blockTrades = blockTradeGroups;
            segmentData.combo = comboGroups;
        
            console.log('segmentData with groups:', segmentData); // Log final segmentData with groups
        
            // Call onSegmentSelect with the complete payload
            const payload = {
              contextId: 'insight/topvolume',
              selectedSegment: segmentData,
              comboGroups,
              blockTradeGroups,
            };
        
            console.log('onSegmentSelect payload:', payload); // Log final payload
        
            onSegmentSelect?.(payload);
        
            console.log('onSegmentSelect called with payload'); // Confirm callback execution
          } else {
            console.log('No segment selected (empty els array)');
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
  }, [fixedXLabels, fixedYLabels, plotData, groupIndices, minValue, maxValue, onSegmentSelect, scaled, mode]);

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
        borderRadius: '  0  10px 10px 0 ',
        overflow: 'hidden',
        background: 'rgba(43, 42, 42, 0.29)',
        
      }}>
      {/* Y axis (labels) */}
      <div
        style={{
          position: 'absolute',
          left: 0, top: 0,
          width: scaledYAxisWidth,
          height: canvasHeight,
          zIndex:2,
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
      {/* X axis area */}
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
      {/* Canvas (grid) */}
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