import React, { useState, useEffect, useRef, useCallback } from "react";

const DateAxisSlider = ({ dates, days, selectedDay, onChange }) => {
  const [position, setPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const trackRef = useRef(null);
  const lastSelectedDayRef = useRef(null);

  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  useEffect(() => {
    if (!days || !Array.isArray(days) || days.length === 0) return;
    const index = days.includes(selectedDay) ? days.indexOf(selectedDay) : 0;
    const total = days.length - 1 || 1;
    setPosition((index / total) * 100);
    lastSelectedDayRef.current = days[index];
  }, [selectedDay, days]);

  const updatePosition = useCallback(
    (clientX) => {
      if (!trackRef.current || days.length <= 1) return;

      const rect = trackRef.current.getBoundingClientRect();
      let x = clientX - rect.left;
      x = Math.max(0, Math.min(x, rect.width));
      const perc = (x / rect.width) * 100;
      setPosition(perc);

      const total = days.length - 1;
      const index = Math.round((perc / 100) * total);
      const clamped = Math.max(0, Math.min(index, total));
      const newDay = days[clamped];

      if (newDay !== lastSelectedDayRef.current) {
        lastSelectedDayRef.current = newDay;
        onChange(newDay);
      }
    },
    [days, onChange]
  );

  const debouncedUpdatePosition = useCallback(debounce(updatePosition, 50), [updatePosition]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    e.preventDefault();
    updatePosition(e.clientX);
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    e.preventDefault();
    const touch = e.touches[0];
    updatePosition(touch.clientX);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    debouncedUpdatePosition(e.clientX);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    debouncedUpdatePosition(touch.clientX);
    e.preventDefault();
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove, { passive: false });
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleTouchMove]);

  const handleTrackClick = (e) => updatePosition(e.clientX);
  const handleTrackTouch = (e) => {
    const touch = e.touches[0];
    updatePosition(touch.clientX);
    e.preventDefault();
  };
  const handleTickHover = (index) => setHoveredIndex(index);
  const handleTickLeave = () => setHoveredIndex(null);

  if (days && days.length === 1) {
    return (
      <div style={{ textAlign: "center"}}>
        <div style={{ fontSize: "clamp(11px, 2vw, 14px)", fontWeight: 600, color: "#999" }}>Today's Profit</div>
        <div style={{ fontSize: "clamp(11px, 2vw, 14px)", color: "#4B5563" }}>{dates[0]}</div>
      </div>
    );
  }

  if (!dates || !days || days.length === 0 || dates.length !== days.length) {
    return (
      <div style={{ textAlign: "center", fontSize: "clamp(11px, 2vw, 14px)", color: "#4B5563"}}>
        No valid dates available
      </div>
    );
  }

  const total = days.length - 1;
  const currentTickIndex = days.indexOf(selectedDay) >= 0 ? days.indexOf(selectedDay) : days.length - 1;

  const labelIndices = [];
  if (days.length <= 8) {
    // Show all labels for 8 days or less
    for (let i = 0; i < days.length; i++) {
      labelIndices.push(i);
    }
  } else {
    // Use the existing logic for more than 8 days
    if (days.length > 0) labelIndices.push(0);
    if (days.length > 1) labelIndices.push(days.length - 1);
    const segment = days.length - 1;
    labelIndices.push(Math.round(segment * 0.2));
    labelIndices.push(Math.round(segment * 0.4));
    labelIndices.push(Math.round(segment * 0.6));
    labelIndices.push(Math.round(segment * 0.8));
  }

  const selectedDateLabel = currentTickIndex === total ? "Expiration" : dates[currentTickIndex];

  return (
    // New outer container with horizontal padding
    <div style={{ width: "100%", padding: "0 clamp(20px, 2vw,40px)", boxSizing: "border-box" }}>
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
        }}
      >

        {/* Hover Label */}
        {hoveredIndex !== null && (
          <div
            style={{
              position: "absolute",
              top: "-25px",
              left: `${(hoveredIndex / total) * 100}%`,
              transform:
                hoveredIndex === 0
                  ? "translateX(0)"
                  : hoveredIndex === total
                  ? "translateX(-100%)"
                  : "translateX(-50%)",
              whiteSpace: "nowrap",
              fontSize: "clamp(9px, 1vw, 12px)",
              fontWeight: 600,
              color: "#777",
              zIndex: 20,
            }}
          >
            {hoveredIndex === 0 ? "Today" : hoveredIndex === total ? "Exp" : dates[hoveredIndex]}
          </div>
        )}

        {/* Main Slider Track */}
        <div
          ref={trackRef}
          style={{
            width: "100%",
            height: "4px",
            backgroundColor: "#444",
            borderRadius: "3px",
            position: "relative",
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
          }}
          onClick={handleTrackClick}
          onTouchStart={handleTrackTouch}
        >
          {/* Progress Bar */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${Math.min(position, 100)}%`,
              backgroundColor: "var(--color-primary)",
              borderRadius: "3px 0 0 3px",
              transition: isDragging ? "none" : "width 0.1s ease-in-out",
            }}
          />

          {/* Slider Thumb */}
          <div
            style={{
              position: "absolute",
              width: "clamp(8px, 1vh,10px)",
              height:"clamp(8px, 1vh,10px)",
              backgroundColor: "#1E40AF",
              borderRadius: "50%",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2), 0 0 0 2px #FFFFFF",
              cursor: "grab",
              top: "50%",
              left: `${Math.min(position, 100)}%`,
              transform: "translate(-50%, -50%)",
              transition: isDragging ? "none" : "left 0.1s ease-in-out, background-color 0.2s",
              zIndex: 10,
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          />

          {/* Ticks and Labels */}
          <div style={{ position: "relative", width: "100%", height: "30px" }}>
            {days.map((day, index) => {
              const tickPosition = (index / total) * 100;
              const isLabelVisible = labelIndices.includes(index);
              const isFirst = index === 0;
              const isLast = index === total;

              let labelTransform = "translateX(-50%)";
              if (isFirst) labelTransform = "translateX(0)";
              else if (isLast) labelTransform = "translateX(-100%)";

              return (
                <div
                  key={index}
                  style={{
                    position: "absolute",
                    left: `${tickPosition}%`,
                    transform: "translateX(-50%)",
                    textAlign: "center",
                    width: "1px",
                    padding: "0 2px",
                  }}
                  onMouseEnter={() => handleTickHover(index)}
                  onMouseLeave={handleTickLeave}
                  onClick={() => {
                    const perc = (index / total) * 100;
                    setPosition(perc);
                    onChange(day);
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      width: "clamp(7px, 0.9vw,9px)",
                      height: "clamp(7px, 0.9vw,9px)",
                      borderRadius: "50%",
                      backgroundColor: "#444",
                      top: "-2px",
                    }}
                  />
                  {isLabelVisible && (
                    <span
                      style={{
                        fontSize: "clamp(8px, 1vw, 10px)",
                        color: "#6B7280",
                        fontWeight: 400,
                        whiteSpace: "nowrap",
                        display: "block",
                        marginTop: "20px",
                        opacity: 1,
                        transition: "opacity 0.2s ease-in-out",
                        transform: labelTransform,
                      }}
                    >
                      {isLast ? "Exp" : index === 0 ? "Today" : dates[index]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateAxisSlider;