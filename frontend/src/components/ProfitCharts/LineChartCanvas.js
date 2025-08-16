import React, { useRef, useEffect, useState } from "react";
import { drawAxes, drawLines, getTooltipPosition, formatNumberKM } from "./utils/chartUtils";
import ReactDOM from "react-dom"; // Import ReactDOM
// Debug import
console.debug("LineChartCanvas: Imported chartUtils functions", { drawAxes: !!drawAxes, drawLines: !!drawLines, getTooltipPosition: !!getTooltipPosition });

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const LineChartCanvas = ({ lines, width = "100%", height = "100%", yMin, yMax, xAxisFormat = "number", xAxisTitle = "", yAxisTitle = "", strikePrices = [] }) => {
  const canvasRef = useRef();
  const wrapperRef = useRef();
  const [size, setSize] = useState({ width: 300, height: 200 });
  const [hoveredLine, setHoveredLine] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [animationDone, setAnimationDone] = useState(false);

  const margin = { top: 40, right: 30, bottom: 60, left: 55 };

  useEffect(() => {
    if (!wrapperRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      setSize({ width: w, height: h });
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  // Reset animationDone when lines changes
  useEffect(() => {
    setAnimationDone(false);
  }, [lines]);

  // Animate when not done and lines present
  useEffect(() => {
    if (lines.length === 0 || animationDone) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

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

    const xMin = Math.min(...lines.flatMap((l) => l.x));
    const xMax = Math.max(...lines.flatMap((l) => l.x));
    const yMinFinal = Math.min(...lines.flatMap((l) => l.y), yMin);
    const yMaxFinal = Math.max(...lines.flatMap((l) => l.y), yMax);

    let startTime = null;
    const duration = 800;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const rawProgress = Math.min((timestamp - startTime) / duration, 1);
      const progress = easeOutCubic(rawProgress);

      ctx.clearRect(0, 0, w, h);
      drawAxes('line',ctx, w, h, xMin, xMax, yMinFinal, yMaxFinal, xAxisFormat, xAxisTitle, yAxisTitle, null, progress, strikePrices, margin);
      drawLines(ctx, lines, w, h, xMin, xMax, yMinFinal, yMaxFinal, hoveredLine, progress, margin);

      if (rawProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        setAnimationDone(true);
      }
    };

    requestAnimationFrame(animate);
  }, [animationDone, lines, size, yMin, yMax, xAxisFormat, xAxisTitle, yAxisTitle, strikePrices, margin]);

  // Redraw on hover or resize without animation
  useEffect(() => {
    if (!animationDone) return; // Skip until animation completes

    const canvas = canvasRef.current;
    if (!canvas || lines.length === 0) return;

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

    const xMin = Math.min(...lines.flatMap((l) => l.x));
    const xMax = Math.max(...lines.flatMap((l) => l.x));
    const yMinFinal = Math.min(...lines.flatMap((l) => l.y), yMin);
    const yMaxFinal = Math.max(...lines.flatMap((l) => l.y), yMax);

    ctx.clearRect(0, 0, w, h);
    drawAxes('line',ctx, w, h, xMin, xMax, yMinFinal, yMaxFinal, xAxisFormat, xAxisTitle, yAxisTitle, null, 1, strikePrices, margin);
    drawLines(ctx, lines, w, h, xMin, xMax, yMinFinal, yMaxFinal, hoveredLine, 1, margin);
  }, [animationDone, lines, size, yMin, yMax, xAxisFormat, xAxisTitle, yAxisTitle, hoveredLine, strikePrices, margin]);

  const handleMouseMove = (e) => {
    if (!lines.length) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const w = size.width;
    const h = size.height;
    const xMin = Math.min(...lines.flatMap((l) => l.x));
    const xMax = Math.max(...lines.flatMap((l) => l.x));
    const yMinFinal = Math.min(...lines.flatMap((l) => l.y), yMin);
    const yMaxFinal = Math.max(...lines.flatMap((l) => l.y), yMax);

    let closestLine = null;
    let closestPoint = null;
    let minDist = Infinity;

    lines.forEach((line, index) => {
      line.x.forEach((px, i) => {
        const canvasX = margin.left + ((px - xMin) / (xMax - xMin)) * (w - margin.left - margin.right);
        const canvasY = h - margin.bottom - ((line.y[i] - yMinFinal) / (yMaxFinal - yMinFinal)) * (h - margin.top - margin.bottom);
        const dist = Math.sqrt((x - canvasX) ** 2 + (y - canvasY) ** 2);
        if (dist < minDist && dist < 10) {
          minDist = dist;
          closestLine = index;
          closestPoint = { x: px, y: line.y[i], day: line.name };
        }
      });
    });

    setHoveredLine(closestLine);
    if (closestPoint) {
      // Calculate breakeven strike prices for the hovered line
      const line = lines[closestLine];
      const breakevenStrikes = [];
      for (let i = 1; i < line.x.length; i++) {
        const y1 = line.y[i - 1];
        const y2 = line.y[i];
        const x1 = line.x[i - 1];
        const x2 = line.x[i];
        // Check for zero crossing (breakeven point)
        if ((y1 <= 0 && y2 > 0) || (y1 > 0 && y2 <= 0)) {
          // Linear interpolation to find exact breakeven point
          const t = -y1 / (y2 - y1);
          const breakevenStrike = x1 + t * (x2 - x1);
          breakevenStrikes.push(xAxisFormat === 'k' ? (breakevenStrike / 1000).toFixed(2) + 'k' : breakevenStrike.toFixed(2));
        }
      }

      setTooltip({
        x: 20,
        y: 5,
        line1: {
          day: closestPoint.day,
          strike: xAxisFormat === 'k' ? (closestPoint.x / 1000) + 'k' : closestPoint.x,
          profit: formatNumberKM(closestPoint.y),
        },
        line2: {
          breakeven: breakevenStrikes.length > 0 ? breakevenStrikes.join(', ') : 'None',
        },
      });
    } else {
      setTooltip(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredLine(null);
    setTooltip(null);
  };

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
      <canvas ref={canvasRef} />
      {tooltip &&
        // Use ReactDOM.createPortal to render the tooltip outside this component's DOM tree
        ReactDOM.createPortal(
          <div
            style={{
              position: "absolute", // Position the tooltip relative to the viewport
              // Calculate tooltip position based on the canvas's position on the page
              left: `${tooltip.x + wrapperRef.current.getBoundingClientRect().left + 10}px`,
              top: `${tooltip.y + wrapperRef.current.getBoundingClientRect().top - 30}px`,
              display: "flex",
              flexDirection: "column",
              gap: 0,
              transition: "opacity 0.2s ease-in-out",
              zIndex: 1000, // Ensure the tooltip is on top of other content
            }}
          >
            {/* First Line */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "16px",
                padding: '2px 0px',
                borderRadius: '4px',
                whiteSpace: "nowrap",
              }}
            >
              <div
                style={{
                  color: "#fff",
                  fontSize: 'clamp(0.4rem,1.2vw,0.8rem)',
                  fontWeight: 600,
                  fontFamily: "Montserrat, sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                {tooltip.line1.day}
              </div>
              <div
                style={{
                  color: "#ccc",
                  fontSize: 'clamp(0.4rem,1.2vw,0.8rem)',
                  fontFamily: "Roboto, sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                Strike: {tooltip.line1.strike}
              </div>
              <div
                style={{
                  color: "#ccc",
                  fontSize: 'clamp(0.4rem,1.2vw,0.8rem)',
                  fontFamily: "Roboto, sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                PnL: {tooltip.line1.profit}
              </div>
              <div
                style={{
                  color: "#ccc",
                  fontSize: 'clamp(0.4rem,1.2vw,0.8rem)',
                  fontFamily: "Roboto, sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                Breakeven: {tooltip.line2.breakeven}
              </div>
            </div>
          </div>,
          document.body // Append the tooltip element directly to the document body
        )}
    </div>
  );
};

export default LineChartCanvas;