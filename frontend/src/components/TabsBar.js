import React from 'react';

const TabsBar = ({ activeTab, setActiveTab, tabNames }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 'clamp(5px, 2vw, 6px)',
        width: '100%',
        overflowX: 'hidden',
        minHeight: '36px',
        maxHeight: 'clamp(36px, 5vh, 44px)',
        height: 'fit-content',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.4rem', // smaller gap
          padding: '0.25rem 0.4rem', // reduced container padding
          boxSizing: 'border-box',
          maxWidth: 'clamp(340px, 10vw, 420px)', // narrower container
          background: 'var(--color-hover-trans)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '999px',
          boxShadow: '0 0 10px rgba(0,0,0,0.25)',
          transition: 'all 0.3s ease-in-out',
          MsOverflowStyle: 'none',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          position: 'relative',
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
              ::-webkit-scrollbar { display: none; }
            `,
          }}
        />
        {tabNames.map((tab) => (
          <div
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              cursor: 'pointer',
              flexShrink: 0,
              minWidth: 'fit-content',
              padding: '0.3rem 1rem', // narrower pill size
              borderRadius: '999px',
              fontWeight: 400,
              fontSize: 'clamp(0.6rem, 1vw, 0.8rem)', // smaller font
              transition: 'all 0.25s ease',
              backgroundColor:
                activeTab === tab ? 'var(--color-primary)' : 'transparent',
              color: activeTab === tab ? '#fff' : '#bbb',
              border:
                activeTab === tab
                  ? '1px solid rgba(0,0,0,0.8)'
                  : '1px solid transparent',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              letterSpacing: activeTab ===tab ? '0.1rem': 0,
              boxShadow:
                activeTab === tab ? '0 2px 6px rgba(0,0,0,0.25)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab) {
                e.currentTarget.style.backgroundColor =
                  'rgba(255,255,255,0.06)';
              }
            }}
            onMouseLeave={(e) => {
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
