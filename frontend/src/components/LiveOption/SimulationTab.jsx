import React from 'react';

export default function SimulationTab() {
  return (
    <div style={{
        position: 'fixed',
      display: 'flex',
      width: '100vw',
      height: '100vh',
      justifyContent: 'center',
      alignItems: 'center',
      height: 'calc(100vh - 150px)', // Adjust for header + tabs
      fontSize: '28px',
      fontWeight: 'bold',
      fontFamily: "'Roboto', sans-serif",
      overflow: 'hidden', // Prevent scroll
      color: '#ccc'
    }}>
      Coming Soon...
    </div>
  );
}
