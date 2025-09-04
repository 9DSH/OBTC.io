import React, { useRef, useEffect, useState } from "react";
import { drawAxes, drawLines, formatNumberKM } from "./utils/chartUtils";
import ReactDOM from "react-dom";

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const LineChartCanvas = ({
  lines,
  width = "100%",
  height = "100%",
  yMin,
  yMax,
  xAxisFormat = "number",
  xAxisTitle = "",
  yAxisTitle = "",
  strikePrices = [],
}) => {
  const canvasRef = useRef();
  const wrapperRef = useRef();
  const [size, setSize] = useState({ width: 300, height: 200 });
  const [hoveredLine, setHoveredLine] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [animationDone, setAnimationDone] = useState(false);
  const [cursor, setCursor] = useState("default");

  const margin = { top: 40, right: 30, bottom: 60, left: 55 };

  // Resize observer
  useEffect(() => {
    if (!wrapperRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      setSize({ width: w, height: h });
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  // Reset animation on lines change
  useEffect(() => setAnimationDone(false), []);

  // Draw function
  const drawChart = (progress = 1) => {
    if (!canvasRef.current || lines.length === 0) return;
    const canvas = canvasRef.current;
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

    drawAxes(
      "line",
      ctx,
      w,
      h,
      xMin,
      xMax,
      yMinFinal,
      yMaxFinal,
      xAxisFormat,
      xAxisTitle,
      yAxisTitle,
      null,
      progress,
      selectedLine !== null ? lines[selectedLine] : null,
      margin,
      hoveredPoint
    );

    drawLines(
      ctx,
      lines,
      w,
      h,
      xMin,
      xMax,
      yMinFinal,
      yMaxFinal,
      hoveredLine,
      progress,
      margin,
      selectedLine,
      setHoveredPoint
    );
  };

  // Initial animation
  useEffect(() => {
    if (!lines.length || animationDone) return;

    let startTime = null;
    const duration = 800;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const rawProgress = Math.min((timestamp - startTime) / duration, 1);
      const progress = easeOutCubic(rawProgress);

      drawChart(progress);

      if (rawProgress < 1) requestAnimationFrame(animate);
      else setAnimationDone(true);
    };

    requestAnimationFrame(animate);
  }, [animationDone, lines, size]);

  // Redraw on changes
  useEffect(() => {
    if (animationDone) drawChart(1);
  }, [animationDone, lines, size, hoveredLine, selectedLine, hoveredPoint]);

  // Mouse move: find closest point
  const handleMouseMove = (e) => {
    if (!lines.length) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Update cursor based on mouse position
    if (mouseX >= margin.left && mouseY > size.height - margin.bottom) {
      setCursor("col-resize"); // X-axis area
    } else if (mouseX < margin.left && mouseY >= margin.top && mouseY <= size.height - margin.bottom) {
      setCursor("row-resize"); // Y-axis area
    } else {
      setCursor("default"); // Plot area
    }

    const w = size.width;
    const h = size.height;
    const xMin = Math.min(...lines.flatMap((l) => l.x));
    const xMax = Math.max(...lines.flatMap((l) => l.x));
    const yMinFinal = Math.min(...lines.flatMap((l) => l.y), yMin);
    const yMaxFinal = Math.max(...lines.flatMap((l) => l.y), yMax);

    let closestLine = null;
    let closestPoint = null;
    let minDist = Infinity;

    // Determine which lines to consider based on selection
    const targetLines = selectedLine !== null ? [lines[selectedLine]] : lines;

    // Find closest point based on mouse position
    targetLines.forEach((line, index) => {
      const realIndex = selectedLine !== null ? selectedLine : index;

      // Convert mouseX to data x-value
      const xValue = xMin + ((mouseX - margin.left) / (w - margin.left - margin.right)) * (xMax - xMin);

      // Find the closest x point on this line
      let minXDist = Infinity;
      let closestIndex = 0;
      line.x.forEach((px, i) => {
        const dist = Math.abs(px - xValue);
        if (dist < minXDist) {
          minXDist = dist;
          closestIndex = i;
        }
      });

      // Calculate canvas coordinates for the closest point
      const canvasX =
        margin.left +
        ((line.x[closestIndex] - xMin) / (xMax - xMin)) * (w - margin.left - margin.right);
      const canvasY =
        h -
        margin.bottom -
        ((line.y[closestIndex] - yMinFinal) / (yMaxFinal - yMinFinal)) *
          (h - margin.top - margin.bottom);

      // Use distance to determine closest line (for highlighting when no line is selected)
      const dist = Math.sqrt((mouseX - canvasX) ** 2 + (mouseY - canvasY) ** 2);

      if (dist < minDist) {
        minDist = dist;
        closestLine = realIndex;
        closestPoint = { x: line.x[closestIndex], y: line.y[closestIndex], day: line.name };
      }
    });

    // Update hoveredLine for highlighting (dims other lines when not selected)
    if (closestLine !== hoveredLine) {
      setHoveredLine(closestLine);
    }

    // Update tooltip for both selected and non-selected cases
    if (closestPoint) {
      const line = lines[closestLine];
      const breakevenStrikes = [];
      for (let i = 1; i < line.x.length; i++) {
        const y1 = line.y[i - 1];
        const y2 = line.y[i];
        const x1 = line.x[i - 1];
        const x2 = line.x[i];
        if ((y1 <= 0 && y2 > 0) || (y1 > 0 && y2 <= 0)) {
          const t = -y1 / (y2 - y1);
          const breakevenValue = x1 + t * (x2 - x1);
          breakevenStrikes.push(
            formatNumberKM(breakevenValue, xAxisFormat === "k")
          );
        }
      }

      setTooltip({
        x: 20, // Fixed position in top-left corner
        y: -15,
        line1: {
          day: closestPoint.day,
          strike:
            xAxisFormat === "k"
              ? (closestPoint.x / 1000).toFixed(2) + "k"
              : closestPoint.x.toFixed(2),
          profit: formatNumberKM(closestPoint.y),
        },
        line2: {
          breakeven:
            breakevenStrikes.length > 0
              ? breakevenStrikes.join(", ")
              : "None",
        },
      });
    } else {
      setTooltip(null);
    }

    // Only update hoveredPoint if a line is selected
    if (selectedLine !== null) {
      if (
        !closestPoint ||
        closestPoint.x !== hoveredPoint?.x ||
        closestPoint.y !== hoveredPoint?.y
      ) {
        setHoveredPoint(closestPoint);
      }
    } else {
      if (hoveredPoint !== null) {
        setHoveredPoint(null);
      }
    }
  };

  const handleClick = (e) => {
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

    let clickedLine = null;
    let minDist = Infinity;

    lines.forEach((line, index) => {
      line.x.forEach((px, i) => {
        const canvasX =
          margin.left +
          ((px - xMin) / (xMax - xMin)) * (w - margin.left - margin.right);
        const canvasY =
          h -
          margin.bottom -
          ((line.y[i] - yMinFinal) / (yMaxFinal - yMinFinal)) *
            (h - margin.top - margin.bottom);
        const dist = Math.sqrt((x - canvasX) ** 2 + (y - canvasY) ** 2);
        if (dist < minDist && dist < 8) {
          minDist = dist;
          clickedLine = index;
        }
      });
    });

    setSelectedLine((prev) => (prev === clickedLine ? null : clickedLine));
  };

  const handleMouseLeave = () => {
    setHoveredLine(null);
    setHoveredPoint(null);
    setTooltip(null);
    setCursor("default");
  };

  return (
    <div
      ref={wrapperRef}
      style={{ width, height, position: "relative", userSelect: "none", cursor }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} />
      {tooltip &&
        ReactDOM.createPortal(
          <div
            style={{
              position: "absolute",
              left: `${
                tooltip.x +
                wrapperRef.current.getBoundingClientRect().left
              }px`,
              top: `${
                tooltip.y +
                wrapperRef.current.getBoundingClientRect().top
              }px`,
              display: "flex",
              flexDirection: "column",
              gap: 0,
              transition: "opacity 0.2s ease-in-out",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "16px",
                padding: "2px 0px",
                borderRadius: "4px",
                whiteSpace: "nowrap",
              }}
            >
              <div
                style={{
                  color: "#fff",
                  fontSize: "clamp(0.4rem,1vw,0.8rem)",
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
                  fontSize: "clamp(0.4rem,1vw,0.8rem)",
                  fontFamily: "Roboto, sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                Strike: {tooltip.line1.strike}
              </div>
              <div
                style={{
                  color: "#ccc",
                  fontSize: "clamp(0.4rem,1vw,0.8rem)",
                  fontFamily: "Roboto, sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                PnL: {tooltip.line1.profit}
              </div>
              <div
                style={{
                  color: "#ccc",
                  fontSize: "clamp(0.4rem,1vw,0.8rem)",
                  fontFamily: "Roboto, sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                Breakeven: {tooltip.line2.breakeven}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default LineChartCanvas;