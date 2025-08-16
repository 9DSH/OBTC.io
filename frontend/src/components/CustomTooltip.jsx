import React, { useRef, useEffect, useState } from "react";

export default function CustomTooltip({ content, children }) {
  const tooltipRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const showTooltip = (e) => {
    const el = tooltipRef.current;
    if (el) {
      // Update position based on mouse coordinates
      setPosition({
        x: e.clientX,
        y: e.clientY - 40, // Position above the cursor
      });
      el.style.visibility = "visible";
      el.style.opacity = 1;
    }
  };

  const hideTooltip = () => {
    const el = tooltipRef.current;
    if (el) {
      el.style.visibility = "hidden";
      el.style.opacity = 0;
    }
  };

  useEffect(() => {
    // Move tooltip to body to avoid clipping
    const tooltip = tooltipRef.current;
    if (tooltip) {
      document.body.appendChild(tooltip);
      return () => {
        if (tooltip && document.body.contains(tooltip)) {
          document.body.removeChild(tooltip);
        }
      };
    }
  }, []);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <span
        onMouseEnter={showTooltip}
        onMouseMove={showTooltip}
        onMouseLeave={hideTooltip}
        style={{ cursor: "pointer" }}
      >
        {children}
      </span>
      <div
        ref={tooltipRef}
        style={{
          visibility: "hidden",
          backgroundColor: "var(--color-primary)",
          color: "#fff",
          textAlign: "center",
          borderRadius: "6px",
          padding: "6px 10px",
          position: "fixed",
          zIndex: 100000,
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          opacity: 0,
          transition: "opacity 0.2s ease-in-out",
          fontSize: "0.75rem",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
        }}
      >
        {content}
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "5px solid #333",
          }}
        />
      </div>
    </div>
  );
}