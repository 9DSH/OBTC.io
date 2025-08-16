import React from 'react';
import { NavLink } from 'react-router-dom';

export default function MainMenu({ loading }) {
  if (loading) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 2000,
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            border: '6px solid #333',
            borderTop: '6px solid var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
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

  return (

    
    <div
      style={{
        position: 'absolute',
        top: '30px',
        left: 'clamp(20px, 1.5vw,30px)',
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <img
            src="/logotype.png"
            alt="logo"
            style={{ width: 'Clamp(10rem, 10vw,17rem)', 
                    height: 'Clamp(1rem, 2vw,3rem)', 
                    objectFit: 'contain'}}
          />
        </div>
      {/* Market Watch */}
      <NavLink
        to="/market-watch"
        style={({ isActive }) => ({
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: isActive ? 'bold' : 'normal',
          fontFamily: '"Roboto", sans-serif',
          fontSize: isActive ? 'clamp(0.85rem,0.85vw,1.3rem)' : 'clamp(0.65rem,0.7vw,0.75rem)',
          letterSpacing: isActive ? '1px': 0,
          opacity: isActive ? 1 : 0.5,
          transition: 'opacity 0.2s ease',

          paddingTop: "15px",        
          borderTop: "1px solid #333"
        })}
      >
        <div
          style={{
            width: 'clamp(1.5rem,2vw,2rem)',
            height: 'clamp(1.5rem,2vw,2rem)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <img
            src="/marketwatch.png"
            alt="Market Watch"
            style={{ width: 'clamp(1.2rem,2vw,2rem)', height: 'clamp(1.2rem,2vw,2rem)', objectFit: 'contain' }}
          />
        </div>
        <span>Market Watch</span>
      </NavLink>

      {/* Live Option */}
      <NavLink
        to="/live-option"
        style={({ isActive }) => ({
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: isActive ? 'bold' : 'normal',
          fontSize: isActive ? 'clamp(0.8rem,0.8vw,1rem)': 'clamp(0.65rem,0.7vw,0.75rem)',
          fontFamily: '"Roboto", sans-serif',
          letterSpacing: isActive ? '1px': 0,
          opacity: isActive ? 1 : 0.5,
          transition: 'opacity 0.2s ease',
        })}
      >
        <div
          style={{
            width: 'clamp(1.2rem,2vw,2rem)',
            height: 'clamp(1.2rem,2vw,2rem)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <img
            src="/liveoption.png"
            alt="Live Option"
            style={{ width: 'clamp(1.2rem,2vw,2rem)', height: 'clamp(1.2rem,2vw,2rem)', objectFit: 'contain' }}
          />
        </div>
        <span>Live Trade Option</span>
      </NavLink>
    </div>
  );
}
