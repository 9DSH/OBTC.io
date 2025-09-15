import React from 'react';

export default function LiveOptionTab() {
  return (
    <div style={{
        position: 'fixed',
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden', // Prevent scroll
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: 'calc(100vh - 150px)', // Adjust for header + tabs
      fontSize: '28px',
      fontWeight: 'bold',
      fontFamily: "'Roboto', sans-serif",
      color: '#ccc'
    }}>
      Coming Soon...
    </div>
  );
}
