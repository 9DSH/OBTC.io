export function getHeatColor(value) {
  // Clamp value to [-1, 1]
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  value = clamp(value, -1, 1);

  if (value < 0) {
    // Negative: red → dark red
    const intensity = Math.abs(value); // 0 → 1
    const r = 255 - Math.round(155 * intensity); // 255 → 100
    const g = 0;
    const b = 0;
    return `rgb(${r},${g},${b})`;
  } else {
    // Positive: green → dark green
    const intensity = value; // 0 → 1
    const r = 0;
    const g = 200 + Math.round(55 * intensity); // 200 → 255
    const b = 0;
    return `rgb(${r},${g},${b})`;
  }
}


// Helper function to format numbers as k or M without decimals
export function formatNumberKM(value, isK = false) {
  if (isK) {
    return `${(value / 1000).toFixed(2)}k`;
  }
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `${Math.round(value / 1000000)}M`;
  } else if (absValue >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }
  return `${Math.round(value)}`;
}

// Utility function to interpolate between two HSL colors using the shortest path
export const interpolateHSL = (color1, color2, factor) => {
  let h1 = color1[0];
  let h2 = color2[0];
  const s1 = color1[1];
  const s2 = color2[1];
  const l1 = color1[2];
  const l2 = color2[2];

  // Adjust hues to [0, 360)
  h1 = (h1 % 360 + 360) % 360;
  h2 = (h2 % 360 + 360) % 360;

  // Calculate the shortest delta
  let deltaH = h2 - h1;
  if (deltaH > 180) deltaH -= 360;
  if (deltaH < -180) deltaH += 360;

  let h = h1 + factor * deltaH;
  if (h < 0) h += 360;
  if (h >= 360) h -= 360;

  const s = s1 + factor * (s2 - s1);
  const l = l1 + factor * (l2 - l1);

  return `hsl(${h}, ${s}%, ${l}%)`;
};

// Utility function to calculate gradient factor based on date
export const getGradientFactor = (lineDate, startDate, endDate) => {
  const totalTime = endDate.getTime() - startDate.getTime();
  const elapsedTime = lineDate.getTime() - startDate.getTime();
  return Math.min(Math.max(elapsedTime / totalTime, 0), 1);
};

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
  selectedLine = null,
  margin,
  hoveredPoint = null
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
      ctx.strokeStyle = "rgb(102, 102, 102)";
      ctx.fillStyle = "rgb(152, 152, 152)";
      ctx.font = "clamp(9px, 0.7vw, 11px)";
      ctx.setLineDash([5,5]);

      // Collect positions + labels
      let labelData = [];
      breakevens.forEach(strike => {
        if (strike >= xMin && strike <= xMax) {
          const xPos = margin.left + ((strike - xMin) / (xMax - xMin)) * (w - margin.left - margin.right);
          const label = xAxisFormat==="k" ? `${(strike/1000).toFixed(1)}k` : strike.toFixed(2);
          labelData.push({ strike, xPos, label });
        }
      });

      // Sort left to right
      labelData.sort((a,b) => a.xPos - b.xPos);

      // Adjust Y positions to avoid overlap
      let placedLabels = [];
      const minSpacing = 10; // px vertical spacing
      labelData.forEach(ld => {
        let yPos = margin.top - 15;
        // Push down if overlapping with previous labels
        for (let prev of placedLabels) {
          if (Math.abs(ld.xPos - prev.xPos) < 30 && Math.abs(yPos - prev.yPos) < minSpacing) {
            yPos = prev.yPos + minSpacing;
          }
        }
        placedLabels.push({ ...ld, yPos });
      });

      // Draw lines + adjusted labels
      placedLabels.forEach(ld => {
        ctx.beginPath();
        ctx.moveTo(ld.xPos, h - margin.bottom);
        ctx.lineTo(ld.xPos, margin.top - 20);
        ctx.stroke();

        ctx.save();
        ctx.textAlign = "center";
        ctx.translate(ld.xPos, ld.yPos);
        ctx.fillText(ld.label, 0, 0);
        ctx.restore();
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
    const yTickCount = Math.max(5, Math.floor((h - 50) / 50));
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
  selectedLine = null,
  hoveredPointCallback = null,
  today,
  expirationDate
) {
  ctx.save();

  const scaleX = (x) =>
    margin.left +
    ((x - xMin) / (xMax - xMin)) * (w - margin.left - margin.right);
  const scaleY = (y) =>
    h -
    margin.bottom -
    ((y - yMin) / (yMax - yMin)) * (h - margin.top - margin.bottom);

  // Define colors for gradient (HSL format: hue, saturation, lightness)
  const redHSL = [370, 100, 35];   // Red
  const middleHSL = [310, 100, 40]; // Middle (Cyan/Blue)
  const purpleHSL = [270, 100, 45]; // Purple

  const interpolateHSL = (c1, c2, t) => {
    const h = c1[0] + (c2[0] - c1[0]) * t;
    const s = c1[1] + (c2[1] - c1[1]) * t;
    const l = c1[2] + (c2[2] - c1[2]) * t;
    return `hsl(${h}, ${s}%, ${l}%)`;
  };

  const getThreeColorGradient = (factor) => {
    if (factor < 0.5) {
      // Scale factor into [0,1] range for red → middle
      return interpolateHSL(redHSL, middleHSL, factor / 0.5);
    } else {
      // Scale factor into [0,1] range for middle → purple
      return interpolateHSL(middleHSL, purpleHSL, (factor - 0.5) / 0.5);
    }
  };

  const targetLines = selectedLine !== null ? [lines[selectedLine]] : lines;

  targetLines.forEach((line, index) => {
    const realIndex = selectedLine !== null ? selectedLine : index;

    // Determine line color based on date or index
    let factor;
    if (line.date && today && expirationDate) {
      try {
        const lineDate = new Date(line.date);
        if (!isNaN(lineDate.getTime())) {
          if (lineDate < today) {
            factor = 0; // Red for dates before today
          } else if (lineDate > expirationDate) {
            factor = 1; // Purple for dates after expiration
          } else {
            factor = getGradientFactor(lineDate, today, expirationDate);
          }
        } else {
          console.warn(`Invalid date for line ${line.name}: ${line.date}, using index-based gradient`);
          factor = lines.length > 1 ? realIndex / (lines.length - 1) : 0;
        }
      } catch (e) {
        console.warn(`Date parsing error for line ${line.name}: ${e}, using index-based gradient`);
        factor = lines.length > 1 ? realIndex / (lines.length - 1) : 0;
      }
    } else {
      // Fallback to index-based gradient if no date or invalid date range
      factor = lines.length > 1 ? realIndex / (lines.length - 1) : 0;
    }

    const strokeStyle = getThreeColorGradient(factor);

    // Draw the line
    ctx.beginPath();
    ctx.strokeStyle = strokeStyle;
    ctx.lineCap = "round"; 
    ctx.lineJoin = "round"; 

    const isHovered = selectedLine === null && hoveredLine === realIndex;
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
        : hoveredLine !== null && hoveredLine !== realIndex
        ? 0.3
        : animationProgress;

    const pointCount = Math.floor(line.x.length * animationProgress);
    line.x.slice(0, pointCount).forEach((x, i) => {
      const xp = scaleX(x);
      const yp = scaleY(line.y[i]);
      if (i === 0) ctx.moveTo(xp, yp);
      else ctx.lineTo(xp, yp);

      if (selectedLine !== null && hoveredLine === null && hoveredPointCallback) {
        hoveredPointCallback({ x: x, y: line.y[i], day: line.name });
      }
    });

    ctx.stroke();

    // Draw points for selected line as markers
    if (selectedLine === realIndex && line.x.length > 0) {
      ctx.save();
      ctx.fillStyle = strokeStyle;
      line.x.slice(0, pointCount).forEach((x, i) => {
        const xp = scaleX(x);
        const yp = scaleY(line.y[i]);
        ctx.beginPath();
        ctx.fill();
      });
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  });

  ctx.restore();
}


export function getTooltipPosition(x, y, canvasWidth, canvasHeight) {
  const offset = 10;
  let left = x + offset;
  let top = y - 30;

  if (left + 100 > canvasWidth) left = x - 100 - offset;
  if (top < 0) top = y + offset;

  return { left, top };
}