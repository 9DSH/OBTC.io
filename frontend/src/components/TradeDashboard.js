import React, { useState, useEffect } from 'react';

import AccountBar from './AccountBar';
import TechnicalBar from './TechnicalBar';
import LiveOptionTab from './LiveOption/LiveOptionTab'
import SimulationTab from './LiveOption/SimulationTab'
import TabsBar from './TabsBar';

export default function TradeDashboard({ trades, 
                                    loading, 
                                    analytics, 
                                    analyticsLoading, 
                                    btcprice, 
                                    priceLoading }) {
    
  const [activeTab, setActiveTab] = useState('Insights');


  const tabNames = ['Live Trade Option','Simulation'];
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
  
  // -------------------- TabBar Container -------------------------------------

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Live Trade Option':
        return (
          <LiveOptionTab/>
        );
      case 'Simulation':
        return (
          <SimulationTab/>
        );
    }
  };
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

      {/* Tab Navigation */}
      <div style={{marginTop: '50px'}}>
      <TabsBar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
          }}
          tabNames={tabNames}
      />
      </div>

      
      {/* Main Content Area for TabBars */}
      
      <div style={{ flex: 1, padding: '0 20px' }}>{renderTabContent()}</div>
    
        </div>
      );
    }