import React, { useState } from "react";
import { NavLink } from "react-router-dom";

export default function MainMenu({ loading }) {
  const [expanded, setExpanded] = useState(true);
  const [tooltip, setTooltip] = useState({ visible: false, text: "", x: 0, y: 0 });

  if (loading) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.85)",
          zIndex: 2000,
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            border: "6px solid #333",
            borderTop: "6px solid var(--color-primary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  const handleMouseEnter = (e, text) => {
    if (!expanded) {
      setTooltip({
        visible: true,
        text,
        x: e.clientX + 12, // tooltip at right side
        y: e.clientY,
      });
    }
  };

  const handleMouseMove = (e) => {
    if (tooltip.visible) {
      setTooltip((prev) => ({
        ...prev,
        x: e.clientX + 12,
        y: e.clientY,
      }));
    }
  };

  const handleMouseLeave = () => {
    setTooltip({ visible: false, text: "", x: 0, y: 0 });
  };

  return (
    <>
      <div
        onClick={() => setExpanded((prev) => !prev)}
        onMouseMove={handleMouseMove}
        style={{
          position: "absolute",
          top: 0,
          left: "clamp(15px, 1.2vw,25px)",
          zIndex: 1200,
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          width: expanded ? "clamp(180px, 19vw, 280px)": "clamp(60px, 4vw,70px)",
          backdropFilter: 'blur(10px)',
          borderRight: expanded? 'none': '1px solid #333',
          borderRadius: " 0  0  12px 0",
          padding: "10px",
          cursor: expanded ? "w-resize" : "e-resize", // shows expand/collapse cursor
          transition: "width 0.3s ease",
          overflow: "hidden",
        }}
      >
        {/* Logo Section */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            marginBottom: "20px",
            marginTop: "20px",
            gap: expanded ? "10px" : 0,
            cursor: expanded ? "w-resize" : "e-resize",
          }}
          onClick={(e) => {
            e.stopPropagation(); // prevent container toggle duplication
            setExpanded((prev) => !prev); // toggle expand/collapse
          }}
        >
          <img
            src="/logo4.png"
            alt="logo"
            style={{
              width: "clamp(2rem, 2=vw,3rem)",
              height: "clamp(2rem, 2vw,3rem)",
              objectFit: "contain",
              transition: "all 0.3s ease",
            }}
          />
          {expanded && (
            <img
              src="/logoType.png"
              alt="logotype"
              style={{
                width: "clamp(8rem, 9vw,14rem)",
                height: "clamp(1rem, 2vw,3rem)",
                objectFit: "contain",
                transition: "all 0.3s ease",
              }}
            />
          )}
        </div>


       <div style={{
             display: "flex",
             flexDirection: "column",
             gap: "15px",
             alignItems: "flex-start",
             borderTop: "1px solid #333",
          }
         
       }> 
        {/* Market Watch */}
        <NavLink
          to="/market-watch"
          onClick={(e) => e.stopPropagation()}
          style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "#fff",
            textDecoration: "none",
            fontWeight: isActive ? "bold" : "normal",
            fontFamily: '"Roboto", sans-serif',
            fontSize: expanded
              ? isActive
                ? "clamp(0.85rem,0.85vw,1.3rem)"
                : "clamp(0.65rem,0.7vw,0.75rem)"
              : "0",
            letterSpacing: isActive ? "1px" : 0,
            opacity: isActive ? 1 : 0.5,
            transition: "opacity 0.2s ease, font-size 0.3s ease",
            paddingTop: "25px",
            paddingLeft: "5px",
          })}
          onMouseEnter={(e) => handleMouseEnter(e, "Market Watch")}
          onMouseLeave={handleMouseLeave}
        >
          <div
            style={{
              width: "clamp(1.5rem,2vw,2rem)",
              height: "clamp(1.5rem,2vw,2rem)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <img
              src="/marketwatch.png"
              alt="Market Watch"
              style={{
                width: "clamp(1.2rem,2vw,2rem)",
                height: "clamp(1.2rem,2vw,2rem)",
                objectFit: "contain",
              }}
            />
          </div>
          {expanded && <span>Market Watch</span>}
        </NavLink>

        {/* Simulation */}
        <NavLink
          to="/simulation"
          onClick={(e) => e.stopPropagation()}
          style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "#fff",
            textDecoration: "none",
            fontWeight: isActive ? "bold" : "normal",
            fontSize: expanded
              ? isActive
                ? "clamp(0.8rem,0.8vw,1rem)"
                : "clamp(0.65rem,0.7vw,0.75rem)"
              : "0",
            fontFamily: '"Roboto", sans-serif',
            letterSpacing: isActive ? "1px" : 0,
            opacity: isActive ? 1 : 0.5,
            paddingBottom: "15px",
            paddingLeft: "5px",
            transition: "opacity 0.2s ease, font-size 0.3s ease",
          })}
          onMouseEnter={(e) => handleMouseEnter(e, "Simulation")}
          onMouseLeave={handleMouseLeave}
        >
          <div
            style={{
              width: "clamp(1.2rem,2vw,2rem)",
              height: "clamp(1.2rem,2vw,2rem)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <img
              src="/simulation.png"
              alt="Simulation"
              style={{
                width: "clamp(1.2rem,1.5vw,1.8rem)",
                height: "clamp(1.2rem,1.5vw,1.8rem)",
                objectFit: "contain",
              }}
            />
          </div>
          {expanded && <span>Simulation</span>}
        </NavLink>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          style={{
            position: "fixed",
            top: tooltip.y - 20,
            left: tooltip.x +8,
            backgroundColor: "var(--color-primary)",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: "6px",
            fontSize: "0.75rem",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            zIndex: 2001,
            pointerEvents: "none",
          }}
        >
          {tooltip.text}
        </div>
      )}
    </>
  );
}
