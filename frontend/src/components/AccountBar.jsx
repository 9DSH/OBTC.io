import React, { useState, useRef, useEffect } from 'react';
import Tooltip from '@mui/material/Tooltip';

export default function AccountBar() {
  const [activeTab, setActiveTab] = useState(null);
  const containerRef = useRef(null);
  const buttonRefs = useRef({});

  const containerStyle = {
    position: 'fixed',
    top: 10,
    right: 10,
    width: '60px',
    zIndex: 2000,
    display: 'flex',
    flexDirection: 'column',
    padding: '8px',
    gap: '4px',
  };

  const buttonContainer = (isActive) => ({
    width: '45px',
    height: '45px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: isActive ? '20%' : '50%',
    border: isActive ? '1px solid #333' : '1px solid transparent',
    backgroundColor: isActive ? 'rgba(27, 28, 34, 0.7)' : 'transparent',
    backdropFilter: isActive ? 'blur(10px)' : null,
    transition: 'all 0.2s ease',
    zIndex: 5,
  });

  const iconButtonStyle = (isActive) => ({
    width: '38px',
    height: '38px',
    backgroundSize: '60% 60%',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    outline: 'none',
    opacity: isActive ? 1: 0.5,
    borderRadius: isActive ? '8px' : '50%',
    border: 'none',
    transition: 'all 0.2s ease',
  });

  const contentContainerStyle = (isVisible, index) => ({
    position: 'fixed',
    top: `${10 + index * 48}px`,
    right: '80px',
    width: isVisible ? '400px' : '0',
    height: isVisible ? '420px' : '0',
    padding: isVisible ? '15px' : '0',
    color: '#ddd',
    backgroundColor: 'rgba(27, 28, 34, 0.7)',
    backdropFilter: 'blur(10px)',
    borderTop: isVisible ? '1px solid #333' : 'none',
    borderRight: isVisible ? '1px solid #333' : 'none',
    borderRadius: '15px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflowY: isVisible ? 'auto' : 'hidden',
    transition: 'all 0.3s ease',
    zIndex: 1000,
  });

  const handleButtonClick = (tab) => {
    setActiveTab((prev) => (prev === tab ? null : tab));
  };

  const handleOutsideClick = (event) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(event.target) &&
      !Object.values(buttonRefs.current).some((ref) => ref && ref.contains(event.target))
    ) {
      setActiveTab(null);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  const renderContent = (tab) => {
    switch (tab) {
      case 'profile':
        return <div>Your Profile Content Here</div>;
      case 'notification':
        return <div>Your Notifications Here</div>;
      case 'followed':
        return <div>Your Followed BlockTrade IDs Here</div>;
      default:
        return null;
    }
  };

  const tooltipProps = {
    arrow: true,
    placement: 'right',
    componentsProps: {
      tooltip: {
        sx: {
          bgcolor: 'var(--color-primary, #2196f3)', // fallback blue
          color: '#fff',
          fontSize: 12,
          filter: 'drop-shadow(0px 1px 4px rgba(0,0,0,0.3))',
        },
      },
      arrow: {
        sx: {
          color: 'var(--color-primary, #2196f3)',
        },
      },
    },
  };

  const tooltipsTitles = {
    profile: 'Your profile',
    notification: 'Notifications',
    followed: 'Followed BlockTrade',
  };

  return (
    <div style={containerStyle}>
      {['profile', 'notification', 'followed'].map((tab, index) => (
        <div key={tab} style={{ position: 'relative' }}>
          {activeTab !== tab ? (
            <Tooltip title={tooltipsTitles[tab]} {...tooltipProps}>
              <div style={buttonContainer(activeTab === tab)}>
                <button
                  ref={(el) => (buttonRefs.current[tab] = el)}
                  style={{
                    ...iconButtonStyle(activeTab === tab),
                    backgroundImage: `url('/${tab}.png')`,
                  }}
                  onClick={() => handleButtonClick(tab)}
                  aria-label={`${tab} tab`}
                />
              </div>
            </Tooltip>
          ) : (
            <div style={buttonContainer(activeTab === tab)}>
              <button
                ref={(el) => (buttonRefs.current[tab] = el)}
                style={{
                  ...iconButtonStyle(activeTab === tab),
                  backgroundImage: `url('/${tab}.png')`,
                }}
                onClick={() => handleButtonClick(tab)}
                aria-label={`${tab} tab`}
              />
            </div>
          )}
          <div
            ref={activeTab === tab ? containerRef : null}
            style={contentContainerStyle(activeTab === tab, index)}
          >
            {activeTab === tab && renderContent(tab)}
          </div>
        </div>
      ))}
    </div>
  );
}