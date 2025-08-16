import React, { useRef, useEffect, useState } from "react";
import { drawAxes, getHeatColor, formatNumberKM } from "./utils/chartUtils";

const HeatmapChart = ({
  data,
  xLabels,
  yLabels,
  width = "100%",
  height = "100%",
  zMin,
  zMax,
  yGap = 5,
  xGap = 0,
  xAxisFormat = "number",
  xAxisTitle = "",
  yAxisTitle = "",
  strikePrices = [],
}) => {
  const canvasRef = useRef();
  const wrapperRef = useRef();
  const animationFrameIdRef = useRef(null);
  const animationStartTimeRef = useRef(null);

  const [size, setSize] = useState({ width: 300, height: 200 });
  const [drawProgress, setDrawProgress] = useState(1); // start fully drawn
  const [tooltip, setTooltip] = useState(null);
  

  const margin = { top: 40, right: 40, bottom: 70, left: 20 };
  const animationDuration = 400; // ms

  // Resize observer
  useEffect(() => {
    if (!wrapperRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      setSize({ width: Math.max(w, 300), height: Math.max(h, 200) });
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  // Trigger animation reset on data or related props change
  useEffect(() => {
    // Reset animation progress and start animating
    setDrawProgress(0);
    animationStartTimeRef.current = null;

    // Start animation loop
    const step = (timestamp) => {
      if (!animationStartTimeRef.current) animationStartTimeRef.current = timestamp;
      const elapsed = timestamp - animationStartTimeRef.current;
      const progress = Math.min(elapsed / animationDuration, 1);
      setDrawProgress(progress);

      if (progress < 1) {
        animationFrameIdRef.current = requestAnimationFrame(step);
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(step);

    // Cleanup on unmount or new data change
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, []);

  // Draw heatmap on every drawProgress or size or data change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0 || xLabels.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const w = size.width;
    const h = size.height;
    const plotWidth = w - margin.left - margin.right;
    const plotHeight = h - margin.top - margin.bottom;

    const xMin = Math.min(...xLabels);
    const xMax = Math.max(...xLabels);
    const rows = data.length;
    const cols = xLabels.length;
    const cellWidth = (plotWidth - (cols - 1) * xGap) / cols;
    const cellHeight = (plotHeight - (rows - 1) * yGap) / rows;
    const maxVal = Math.max(Math.abs(zMin || 0), Math.abs(zMax || 0), 1);

    ctx.clearRect(0, 0, w, h);

    // Total cells and how many to draw based on drawProgress
    const totalCells = rows * cols;
    const cellsToDraw = Math.floor(drawProgress * totalCells);

    let drawnCells = 0;
    outer: for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (drawnCells >= cellsToDraw) break outer;

        const val = data[row][col];
        const t = Math.min(Math.abs(val) / maxVal, 1);
        const normalized = val / maxVal; // range -1 to 1
        const color = getHeatColor(normalized);
        ctx.fillStyle = color;
        ctx.globalAlpha = 1;
        const canvasX = margin.left + col * (cellWidth + xGap);
        const canvasY = margin.top + row * (cellHeight + yGap);
        ctx.fillRect(canvasX, canvasY, cellWidth, cellHeight);

        drawnCells++;
      }
    }

    // Draw axes fully visible
    drawAxes(
      'heat',
      ctx,
      w,
      h,
      xMin,
      xMax,
      zMin || 0,
      zMax || 0,
      xAxisFormat,
      xAxisTitle,
      "",
      yLabels.map(() => ""),
      1,
      strikePrices,
      margin
    );
  }, [
    drawProgress,
    size,
    data,
    xLabels,
    yLabels,
    zMin,
    zMax,
    yGap,
    xGap,
    xAxisFormat,
    xAxisTitle,
    strikePrices,
  ]);

  // Tooltip handlers
  const handleMouseMove = (e) => {
    if (!data.length || !xLabels.length) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const w = size.width;
    const h = size.height;
    const plotWidth = w - margin.left - margin.right;
    const plotHeight = h - margin.top - margin.bottom;
    const rows = data.length;
    const cols = xLabels.length;
    const cellWidth = (plotWidth - (cols - 1) * xGap) / cols;
    const cellHeight = (plotHeight - (rows - 1) * yGap) / rows;

    const plotX = x - margin.left;
    const plotY = y - margin.top;
    const col = Math.floor(plotX / (cellWidth + xGap));
    const row = Math.floor(plotY / (cellHeight + yGap));

    if (
      plotX >= 0 &&
      plotX <= plotWidth &&
      plotY >= 0 &&
      plotY <= plotHeight &&
      col >= 0 &&
      col < cols &&
      row >= 0 &&
      row < rows
    ) {
      const strikeFormatted =
        xAxisFormat === "k" ? (xLabels[col] / 1000) + "k" : xLabels[col];
      const profitFormatted = formatNumberKM(data[row][col]);
      setTooltip({
        x: 20,
        y: 10,
        strike: strikeFormatted,
        profit: profitFormatted,
      });
    } else {
      setTooltip(null);
    }
  };

  const handleMouseLeave = () => setTooltip(null);

  return (
    <div
      ref={wrapperRef}
      style={{
        width,
        height,
        position: "relative",
        userSelect: "none",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            display: "flex",
            flexDirection: "row",
            gap: "10px",
            transition: "opacity 0.2s ease-in-out",
          }}
        >
          <div
            style={{
              width: "90px",
              color: "#ccc",
              padding: "2px 4px",
              fontSize: 11,
              fontFamily: "Roboto, sans-serif",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Strike: {tooltip.strike}
          </div>
          <div
            style={{
              width: "80px",
              color: "#ccc",
              padding: "2px 4px",
              fontSize: 11,
              fontFamily: "Roboto, sans-serif",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            PnL: {tooltip.profit}
          </div>
        </div>
      )}
    </div>
  );
};

export default HeatmapChart;