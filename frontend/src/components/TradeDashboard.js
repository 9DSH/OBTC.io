import React, { useState, useEffect } from 'react';

import AccountBar from './AccountBar';
import TechnicalBar from './TechnicalBar';
import SimulationTab from './Simulation/SimulationTab'

export default function TradeDashboard({ 
                                    chains,
                                    trades, 
                                    loading, 
                                    analytics, 
                                    analyticsLoading, 
                                    btcprice, 
                                    priceLoading,
                                    simulateData }) {



  if (loading) {
        return (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            width: '100vw',
            fontSize: "28px",
            fontFamily: "'Roboto', sans-serif"
          }}>
            <p>Loading...</p>
          </div>
        );
      }



  return (
        <div
       // Main Trade Dashboard Container  --------------------
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            padding: '20px 0',
            overflowX: 'hidden',
          }}
        >
      {/* Technical Bar */}
      <TechnicalBar 
            analytics={analytics} 
            loading={analyticsLoading} 
            btcpriceData={btcprice}
            priceLoading={priceLoading}
            />
          {/* Fixed User bar container */}
      <AccountBar/>


      
      {/* Main Content Area for TabBars */}
      
      <div style={{ flex: 1, padding: '0 20px', marginTop: "40px" }}>         
         <SimulationTab 
                chains={chains} 
                trades={trades} 
                btcPrice={btcprice}
                simulateData={simulateData}
                /></div>
    
        </div>
      );
    }