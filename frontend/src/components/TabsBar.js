import React from 'react';

const TabsBar = ({ activeTab, setActiveTab, tabNames }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 'clamp(8px, 2vw, 16px)',
        width: '100%',
        // Changed to allow overflow on the parent, handled by the child
        overflowX: 'hidden', 
        // Ensure the outer container has a minimum height
        minHeight: '40px', 
        height: 'fit-content',
      }}
    >
      <div
        style={{
          display: 'flex',
          // Prevent wrapping and enable horizontal scroll
          flexWrap: 'nowrap',
          overflowX: 'auto',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 'clamp(0.4rem, 1.5vw, 0.6rem)',
          padding: 'clamp(0.1rem, 0.4vw, 0.2rem) clamp(0.3rem, 0.4vw, 0.4rem)',
          boxSizing: 'border-box',
          // Set a static width for consistency on large screens,
          minWidth: 'clamp(250px, 80vw, 300px)',
          maxWidth: 'clamp(300px, 90vw, 1200px)',
          background: 'var(--color-hover-trans)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '10px',
          boxShadow: '0 0 clamp(10px, 2vw, 15px) rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease-in-out',
          MsOverflowStyle: 'none',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          position: 'relative',
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          ::-webkit-scrollbar {
            display: none;
          }
        ` }} />
        {tabNames.map(tab => (
          <div
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              cursor: 'pointer',
              // Use flex-shrink: 0 to prevent tabs from shrinking when space is low
              flexShrink: 0,
              minWidth: 'fit-content',
              padding: 'clamp(0.4rem, 0.7vw, 0.6rem) clamp(1rem, 2vw, 1.5rem)',
              borderRadius: 'clamp(5px, 1vw, 7px)',
              fontWeight: 400,
              fontSize: 'clamp(0.6rem, 1.2vw, 0.85rem)',
              transition: 'all 0.3s ease',
              backgroundColor: activeTab === tab ? 'var(--color-primary)' : 'transparent',
              color: activeTab === tab ? '#fff' : '#bbb',
              border: activeTab === tab ? '1px solid rgb(1, 1, 1)' : '1px solid transparent',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              if (activeTab !== tab) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== tab) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {tab}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabsBar;