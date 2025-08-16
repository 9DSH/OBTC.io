import { Backdrop } from '@mui/material';
import React, { useEffect, useState } from 'react';

export default function TechnicalBar({ analytics, loading, btcpriceData, priceLoading }) {
  useEffect(() => {
    console.log("📊 TechnicalBar received analytics:", analytics);
    console.log("📊 TechnicalBar BTC:", btcpriceData);
  }, [analytics, btcpriceData]);

      // State to manage title text based on hover
  const [supportTitle, setSupportTitle] = useState('SUPPORTS');
  const [resistanceTitle, setResistanceTitle] = useState('RESISTANCE');

  const fourHourSupportData = analytics && analytics['4h'] && Array.isArray(analytics['4h'].support) ? analytics['4h'].support : [];
  const fourHourResistanceData = analytics && analytics['4h'] && Array.isArray(analytics['4h'].resistance) ? analytics['4h'].resistance : [];
  const dailySupportData = analytics && analytics['1d'] && Array.isArray(analytics['1d'].support) ? analytics['1d'].support : [];
  const dailyResistanceData = analytics && analytics['1d'] && Array.isArray(analytics['1d'].resistance) ? analytics['1d'].resistance : [];
  const lastPredictedTrend4h = analytics?.['4h']?.last_predicted_trend ?? 'Loading..';
  const currentPrice = btcpriceData?.btcprice ?? 0;
  const highestPrice = btcpriceData?.highest ?? 0;
  const lowestPrice = btcpriceData?.lowest ?? 0;
    

  const isDataReady =  !loading && currentPrice > 0 ;;

  const fadeAnimation = {
    animation: 'fadeInOut 2.5s ease-in-out infinite',
  };

  const styles = `
      @keyframes fadeInOut {
        0%, 100% { opacity: 0.2; }
        50% { opacity: 1; }
      }
    `;

  const barContainerStyle = {
      position: 'absolute',
      top: isDataReady ? 0 :'30px' ,
      left: '50%',
      width: '60%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: isDataReady ?'space-between':  'center' ,
      maxWidth: '1200px',
      minWidth : '700px',
      height: isDataReady ? '80px' :'30px' ,
      padding: '0 25px',
      zIndex: 1100,
      color: '#fff',
      boxSizing: 'border-box',
      backgroundColor: isDataReady
        ? 'transparent'
        : 'rgba(49, 49, 49, 0.18)', // or 'transparent' 
      backdropFilter: 'blur(10px)',
      borderRadius: isDataReady ? '10px' : '10px',
      ...(isDataReady ? {} : fadeAnimation), // fade animation when loading
    };

    // Show loading container with fade animation while loading or no price yet
  if (!isDataReady) {
      return (
        <>
          <style>{styles}</style>
          <div style={barContainerStyle}>
            <span
              style={{
                color: '#ccc',
                justifyContent: 'center',
                alignItems: 'center',
                fontFamily: '"Roboto", sans-serif',
                fontWeight: 500,
              }}
            >
              Loading...
            </span>
          </div>
        </>
      );
    }



  const generateSupportTicks = () => {
    const ticks = [];
    const basePrice = Math.floor(currentPrice / 1000) * 1000;
    for (let i = 0; i < 6; i++) {
      ticks.push(basePrice - i * 1000);
    }
    return ticks;
  };

  const generateResistanceTicks = () => {
    const ticks = [];
    const basePrice = Math.ceil(currentPrice / 1000) * 1000;
    for (let i = 0; i < 6; i++) {
      ticks.push(basePrice + i * 1000);
    }
    return ticks;
  };

  const supportTicks = generateSupportTicks().reverse();
  const resistanceTicks = generateResistanceTicks();

  const getSupportPosition = (value) => {
    const minTick = Math.min(...supportTicks);
    const maxTick = Math.max(...supportTicks);
    const range = maxTick - minTick;
    if (range === 0) return 50;
    const position = ((value - minTick) / range) * 100;
    return Math.max(0, Math.min(100, position));
  };

  const getResistancePosition = (value) => {
    const minTick = Math.min(...resistanceTicks);
    const maxTick = Math.max(...resistanceTicks);
    const range = maxTick - minTick;
    if (range === 0) return 50;
    const position = ((value - minTick) / range) * 100;
    return Math.max(0, Math.min(100, position));
  };

  return (
    <div style={barContainerStyle}>
 
      {/* Column 1: Support */}
      <div
        style={columnStyle}
        className="column"
        onMouseEnter={() => setSupportTitle('SUPPORTS')}
        onMouseLeave={() => setSupportTitle('SUPPORTS')}
      >
        <div className="support-title">{supportTitle}</div>
        <div style={lineContainerStyle}>
          <div style={horizontalLineStyle}></div>
          {supportTicks.map((tick, index) => (
            <div
              key={`tick-support-${index}`}
              style={{
                ...tickStyle,
                left: `${(index / (supportTicks.length - 1)) * 100}%`,
              }}
            >
              <span style={{ ...tickLabelStyle, top: '15px' }}>
                {(tick / 1000).toFixed(0)}k
              </span>
            </div>
          ))}
          {fourHourSupportData.map((support, index) => (
            <div
              key={`support-4h-${index}`}
              className="support-marker"
              style={{ left: `${getSupportPosition(support)}%` }}
              onMouseEnter={() => {
                console.log(`Hovering 4h support marker: ${support}`);
                setSupportTitle('4H SUPPORT');
              }}
              onMouseLeave={() => setSupportTitle('SUPPORTS')}
            >
              <span className="support-label">{support.toFixed(0)}</span>
            </div>
          ))}
          {dailySupportData.map((support, index) => (
            <div
              key={`support-1d-${index}`}
              className="support-marker-daily"
              style={{ left: `${getSupportPosition(support)}%` }}
              onMouseEnter={() => {
                console.log(`Hovering 1d support marker: ${support}`);
                setSupportTitle('1D SUPPORT');
              }}
              onMouseLeave={() => setSupportTitle('SUPPORTS')}
            >
              <span className="support-label-daily">{support.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Column 2: BTC Price */}
      <div style={priceColumnStyle}>
        <div style={{ ...highLowStyle, fontSize:  'clamp(9px, 0.8vw,10px)', marginTop: '7px', color: 'rgb(129, 129, 129)' }}>
          Lowest
          <div style={highLowStyle}>{priceLoading ? 'Loading...' : Number(lowestPrice.toFixed(0)).toLocaleString()}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ ...trendStyle, color: getTrendColor(lastPredictedTrend4h) }}>
            {lastPredictedTrend4h}
          </div>
          <div style={btcPriceStyle}>{priceLoading ? 'Loading...' : currentPrice.toFixed(0)}</div>
        </div>
        <div style={{ ...highLowStyle, fontSize: 'clamp(9px, 0.8vw,10px)', marginTop: '7px', color: 'rgb(129, 129, 129)' }}>
          Highest
          <div style={highLowStyle}>{priceLoading ? 'Loading...' : Number(highestPrice.toFixed(0)).toLocaleString()}</div>
        </div>
      </div>

      {/* Column 3: Resistance */}
      <div
        style={columnStyle}
        className="column"
        onMouseEnter={() => setResistanceTitle('RESISTANCE')}
        onMouseLeave={() => setResistanceTitle('RESISTANCE')}
      >
        <div className="resistance-title">{resistanceTitle}</div>
        <div style={lineContainerStyle}>
          <div style={horizontalLineStyle}></div>
          {resistanceTicks.map((tick, index) => (
            <div
              key={`tick-resistance-${index}`}
              style={{
                ...tickStyle,
                left: `${(index / (resistanceTicks.length - 1)) * 100}%`,
              }}
            >
              <span style={{ ...tickLabelStyle, top: '15px' }}>
                {(tick / 1000).toFixed(0)}k
              </span>
            </div>
          ))}
          {fourHourResistanceData.map((resistance, index) => (
            <div 
              key={`resistance-4h-${index}`}
              className="resistance-marker"
              style={{ left: `${getResistancePosition(resistance)}%` }}
              onMouseEnter={() => {
                console.log(`Hovering 4h resistance marker: ${resistance}`);
                setResistanceTitle('4H RESISTANCE');
              }}
              onMouseLeave={() => setResistanceTitle('RESISTANCE')}
            >
              <span className="resistance-label">{resistance.toFixed(0)}</span>
            </div>
          ))}
          {dailyResistanceData.map((resistance, index) => (
            <div
              key={`resistance-1d-${index}`}
              className="resistance-marker-daily"
              style={{ left: `${getResistancePosition(resistance)}%` }}
              onMouseEnter={() => {
                console.log(`Hovering 1d resistance marker: ${resistance}`);
                setResistanceTitle('1D RESISTANCE');
              }}
              onMouseLeave={() => setResistanceTitle('RESISTANCE')}
            >
              <span className="resistance-label-daily">{resistance.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>

      <style>
        {`
          .support-marker, .resistance-marker {
            position: absolute;
            top: 24%;
            transform: translateY(-50%);
            width: 8px;
            height: 8px;
            background-color: rgb(215, 215, 7);
            border-radius: 50%;
            cursor: pointer;
            z-index: 10;
          }
          .support-label, .resistance-label {
            position: absolute;
            top: -20px;
            left: -13px;
            font-size: 10px;
            color: rgb(215, 215, 7);
            white-space: nowrap;
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            pointer-events: none;
          }
          .support-marker-daily, .resistance-marker-daily {
            position: absolute;
            top: 24%;
            transform: translateY(-50%);
            width: 8px;
            height: 8px;
            background-color: #f54b4b;
            border-radius: 50%;
            cursor: pointer;
            z-index: 10;
          }
          .support-label-daily, .resistance-label-daily {
            position: absolute;
            top: -20px;
            left: -13px;
            font-size: 10px;
            color: #f54b4b;
            white-space: nowrap;
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            pointer-events: none;
          }
          .support-marker:hover .support-label,
          .support-marker-daily:hover .support-label-daily,
          .resistance-marker:hover .resistance-label,
          .resistance-marker-daily:hover .resistance-label-daily {
            opacity: 1;
          }
          .support-marker::before, .resistance-marker::before,
          .support-marker-daily::before, .resistance-marker-daily::before {
            content: '';
            position: absolute;
            top: -4px;
            left: -4px;
            right: -4px;
            bottom: -4px;
            z-index: 5;
          }
          .column {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          }
          .support-title {
            position: absolute;
            left: -5rem;
            top: -10%;
            font-size: 11px;
            color: #aaa;
            font-family: "Roboto", sans-serif !important;
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          .resistance-title {
            position: absolute;
            right: -6rem;
            top: -10%;
            font-size: 11px;
            color: #aaa;
            font-family: "Roboto", sans-serif !important;
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          .column:hover .support-title,
          .column:hover .resistance-title {
            opacity: 1;
          }
        `}
      </style>

    </div>
  );
}

function getTrendColor(trend) {
  switch (trend.toLowerCase()) {
    case 'bullish':
      return '#90EE90';
    case 'bearish':
      return '#f54b4b';
    default:
      return 'white';
  }
}



const columnStyle = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
};

const trendStyle = {
  fontWeight: 400,
  fontSize: 'clamp(9px, 0.8vw,12px)',
  marginBottom: '1px',
  textAlign: 'center',
  letterSpacing: '2px',
  fontFamily: '"Roboto", sans-serif',
};

const priceColumnStyle = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'clamp(10px, 1vw,24px)',
  flex: '0 0 auto',
  padding: '0 clamp(10px,3vw,50px)',
  marginTop: '3px',
};

const btcPriceStyle = {
  fontWeight: 500,
  fontSize: 'clamp(15px, 1.9vw,20px)',
  textAlign: 'center',
  color: '#fff',
  letterSpacing: '2px',
  fontFamily: '"Roboto", sans-serif',
};

const highLowStyle = {
  fontWeight: 400,
  fontSize: 'clamp(10px, 1vw,12px)',
  textAlign: 'center',
  color: '#aaa',
  fontFamily: '"Roboto", sans-serif',
};

const lineContainerStyle = {
  position: 'relative',
  width: '100%',
  height: '20px',
};

const horizontalLineStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: '10px',
  borderRadius: '20px',
  backgroundColor: 'rgb(29, 31, 44)',
  boxShadow: '0 0 7px rgba(0, 0, 0, 0.15)',
};

const tickStyle = {
  position: 'absolute',
  top: '23%',
  transform: 'translateY(-50%)',
  width: '10px',
  height: '10px',
  backgroundColor: 'rgba(101, 101, 101, 0.40)',
  borderRadius: '50%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const tickLabelStyle = {
  position: 'absolute',
  fontSize:  'clamp(9px, 0.6vw,10px)',
  color: '#aaa',
  fontFamily: '"Roboto", sans-serif',
};