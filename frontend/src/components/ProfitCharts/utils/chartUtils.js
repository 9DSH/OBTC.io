// src/components/ProfitCharts/utils/chartUtils.js
// utils/chartUtils.js
export function getHeatColor(value) {
  // value is between -1 and 1 (normalized)
  // Positive = green blend, Negative = red blend
  const intensity = Math.min(Math.abs(value), 1);

  // Middle zone color (low magnitude) = yellow
  const yellow = { r: 255, g: 255, b: 0 };
  const green = { r: 0, g: 200, b: 0 };
  const red = { r: 200, g: 0, b: 0 };

  let c1, c2;

  if (value >= 0) {
    // Positive: yellow → green
    c1 = yellow;
    c2 = green;
  } else {
    // Negative: yellow → red
    c1 = yellow;
    c2 = red;
  }

  // Linear interpolate between yellow and red/green based on intensity
  const r = Math.round(c1.r + (c2.r - c1.r) * intensity);
  const g = Math.round(c1.g + (c2.g - c1.g) * intensity);
  const b = Math.round(c1.b + (c2.b - c1.b) * intensity);

  return `rgb(${r},${g},${b})`;
}

// Helper function to format numbers as k or M without decimals
export function formatNumberKM(value) {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `${Math.round(value / 1000000)}M`;
  } else if (absValue >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }
  return `${Math.round(value)}`;
}


export function drawAxes(
  mode,
  ctx,
  w,
  h,
  xMin,
  xMax,
  yMin,
  yMax,
  xAxisFormat = "number",
  xAxisTitle = "",
  yAxisTitle = "",
  yLabels = null,
  animationProgress = 1,
  selectedLine = null, // {x:[], y:[], name:?} for both line & heat
  margin,
  hoveredPoint = null // NEW: {x, y} when hovering selected line
) {
  ctx.strokeStyle = "#666"; 
  ctx.fillStyle = "#666";
  ctx.font = "clamp(9px, 0.7vw, 11px)";
  ctx.lineWidth = 1;
  ctx.globalAlpha = animationProgress;

  // X-axis
  ctx.beginPath();
  ctx.moveTo(margin.left, h - margin.bottom);
  ctx.lineTo(w - margin.right, h - margin.bottom);
  ctx.stroke();

  // Y-axis
  ctx.beginPath();
  ctx.moveTo(margin.left, h - margin.bottom);
  ctx.lineTo(margin.left, margin.top);
  ctx.stroke();

  // Dotted horizontal line at Y = 0 (only for line mode)
  if (yMin <= 0 && yMax >= 0 && mode === "line") {
    ctx.save();
    ctx.strokeStyle = "rgba(102,102,102,0.77)";
    ctx.setLineDash([5,5]);
    const yZero = h - margin.bottom - ((0 - yMin) / (yMax - yMin)) * (h - margin.top - margin.bottom);
    ctx.beginPath();
    ctx.moveTo(margin.left, yZero);
    ctx.lineTo(w - margin.right, yZero);
    ctx.stroke();
    ctx.restore();
  }

  // Draw breakeven lines
  if (selectedLine && Array.isArray(selectedLine.x) && Array.isArray(selectedLine.y)) {
    const { x, y } = selectedLine;
    let breakevens = [];
    for (let i = 1; i < x.length; i++) {
      const y1 = y[i-1], y2 = y[i];
      const x1 = x[i-1], x2 = x[i];
      if ((y1 <= 0 && y2 > 0) || (y1 > 0 && y2 <= 0)) {
        const t = -y1 / (y2 - y1);
        breakevens.push(x1 + t*(x2 - x1));
      }
    }

    if (breakevens.length > 0) {
      ctx.save();
      ctx.strokeStyle =  "rgb(102, 102, 102)";
      ctx.fillStyle = "rgb(152, 152, 152)";
      ctx.font = "clamp(9px, 0.7vw, 11px)";
      ctx.setLineDash([5,5]);

      breakevens.forEach(strike => {
        if (strike >= xMin && strike <= xMax) {
          const xPos = margin.left + ((strike - xMin) / (xMax - xMin)) * (w - margin.left - margin.right);
          ctx.beginPath();
          ctx.moveTo(xPos, h - margin.bottom);
          ctx.lineTo(xPos, margin.top - 30);
          ctx.stroke();

          ctx.save();
          ctx.translate(xPos - 5, margin.top - 20);
          ctx.textAlign = "center";
          ctx.fillText(xAxisFormat==="k" ? `${(strike/1000).toFixed(1)}k` : strike.toFixed(2), 0, 0);
          ctx.restore();
        }
      });

      ctx.restore();
    }
  }

  // Dynamic X-axis ticks
  const xRange = xMax - xMin;
  const xTickCount = Math.max(5, Math.floor((w-50)/100));
  const xTickStep = xRange / xTickCount;
  for (let i=0;i<=xTickCount;i++){
    const xVal = xMin + i*xTickStep;
    const xPos = margin.left + (i*(w-margin.left-margin.right))/xTickCount;
    ctx.beginPath();
    ctx.moveTo(xPos, h-margin.bottom);
    ctx.lineTo(xPos, h-margin.bottom+5);
    ctx.stroke();
    const label = xAxisFormat==="k" ? `${(xVal/1000).toFixed(0)}k` : xVal.toFixed(0);
    ctx.textAlign = "center";
    ctx.fillText(label, xPos, h-margin.bottom+20);
  }

  // X-axis title
  // X-axis title
  if(xAxisTitle && mode !== "heat"){
    ctx.textAlign = "center";
    const yPos = h - margin.bottom/3;
    ctx.fillText(xAxisTitle, margin.left+(w-margin.left-margin.right)/2, yPos);
  }
 // Y-axis ticks and labels
  if (yLabels) {
    // For HeatmapChart
    const rows = yLabels.length;
    const cellHeight = (h - 50 - (rows - 1) * 5) / rows;
    yLabels.forEach((label, i) => {
      const y = 40 + i * (cellHeight + 5) + cellHeight / 2;
      ctx.textAlign = "right";
      ctx.fillText(label, 30, y);
    });
  } else {
    // For LineChartCanvas
    const yRange = yMax - yMin;
    const yTickCount = Math.max(5, Math.floor((h - 50) / 50)); // ~1 tick per 50px, min 5
    const yTickStep = yRange / yTickCount;
    for (let i = 0; i <= yTickCount; i++) {
      const yVal = yMin + i * yTickStep;

      const y = h - margin.bottom - (i * (h - margin.top - margin.bottom)) / yTickCount;

      ctx.beginPath();
      ctx.moveTo(margin.left - 5, y);
      ctx.lineTo(margin.left, y);
      ctx.stroke();

      ctx.textAlign = "right";
      ctx.fillText(formatNumberKM(yVal), margin.left - 10, y + 4);
    }
  }

  // Y-axis title
  if(yAxisTitle){
    ctx.save();
    ctx.translate(10, h/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign="center";
    ctx.fillText(yAxisTitle,0,0);
    ctx.restore();
  }

  // Draw crosshair if hovering a point on selected line
  if(mode === "line" && hoveredPoint){
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.setLineDash([4,2]);
    const xPos = margin.left + ((hoveredPoint.x - xMin)/(xMax-xMin)) * (w-margin.left-margin.right);
    const yPos = h - margin.bottom - ((hoveredPoint.y - yMin)/(yMax-yMin)) * (h-margin.top-margin.bottom);

    // vertical
    ctx.beginPath();
    ctx.moveTo(xPos, h-margin.bottom);
    ctx.lineTo(xPos, margin.top);
    ctx.stroke();

    // horizontal
    ctx.beginPath();
    ctx.moveTo(margin.left, yPos);
    ctx.lineTo(w-margin.right, yPos);
    ctx.stroke();

    // draw values on axes
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(xAxisFormat==="k" ? `${(hoveredPoint.x/1000).toFixed(1)}k` : hoveredPoint.x.toFixed(2), xPos, h-margin.bottom+20);
    ctx.textAlign = "right";
    ctx.fillText(formatNumberKM(hoveredPoint.y), margin.left-8, yPos+4);

    ctx.restore();
  }

  ctx.globalAlpha = 1;
}


export function drawLines(
  ctx,
  lines,
  w,
  h,
  xMin,
  xMax,
  yMin,
  yMax,
  hoveredLine = null,
  animationProgress = 1,
  margin,
  selectedLine = null, // NEW: selected line index
  hoveredPointCallback = null // NEW: callback to report hovered point
) {
  const scaleX = (x) =>
    margin.left +
    ((x - xMin) / (xMax - xMin)) * (w - margin.left - margin.right);
  const scaleY = (y) =>
    h -
    margin.bottom -
    ((y - yMin) / (yMax - yMin)) * (h - margin.top - margin.bottom);

  const targetLines =
    selectedLine !== null ? [lines[selectedLine]] : lines;

  targetLines.forEach((line, index) => {
    ctx.beginPath();
    ctx.strokeStyle = line.color || "blue";

    const isHovered =
      selectedLine === null && hoveredLine === index;
    ctx.lineWidth = isHovered
      ? 3
      : selectedLine !== null
      ? 2
      : hoveredLine !== null
      ? 0.45
      : 1.2;

    ctx.globalAlpha =
      selectedLine !== null
        ? 1
        : hoveredLine !== null && hoveredLine !== index
        ? 0.3
        : animationProgress;

    const pointCount = Math.floor(line.x.length * animationProgress);
    line.x.slice(0, pointCount).forEach((x, i) => {
      const xp = scaleX(x);
      const yp = scaleY(line.y[i]);
      if (i === 0) ctx.moveTo(xp, yp);
      else ctx.lineTo(xp, yp);

      if(selectedLine !== null && hoveredLine === null && hoveredPointCallback){
        hoveredPointCallback({x: x, y: line.y[i]}); // report hovered point
      }
    });

    ctx.stroke();
    ctx.globalAlpha = 1;
  });
}



export function getTooltipPosition(x, y, canvasWidth, canvasHeight) {
  const offset = 10;
  let left = x + offset;
  let top = y - 30;

  if (left + 100 > canvasWidth) left = x - 100 - offset;
  if (top < 0) top = y + offset;

  return { left, top };
}