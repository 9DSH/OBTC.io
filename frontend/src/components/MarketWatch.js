import React, { useState, useEffect } from 'react';
import FilterBar, { DEFAULT_FILTERS } from './FilterBar';
import { formatStrikeLabel } from "./utils/chartHelpers";

import TabsBar from './TabsBar';
import InsightsTab from './InsightsTab';
import StrategiesTab from './StrategiesTab';
import DataTable from './DataTable';
import DetailsBar from './DetailsBar';
import RightSideBar from './RightSideBar';
import AccountBar from './AccountBar';
import TechnicalBar from './TechnicalBar';

export default function MarketWatch({ trades, 
                                      chains,
                                         loading , 
                                         analytics, 
                                         analyticsLoading, 
                                         btcprice, 
                                         priceLoading,
                                        onSimulate  }) {

  console.log("MarketWahtch: data:", onSimulate )

  const [activeTab, setActiveTab] = useState('Insights');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [selectedSegment_RightSide, setSelectedSegment_RightSide] = useState(null);
  const [contextId, setContextId] = useState(null);
  const [contextId_RightSide, setContextId_RightSide] = useState(null);

  // Prepare multi-select options
  const strikePrices = Array.from(new Set(trades.map(t => t.Strike_Price))).sort((a, b) => a - b);
  const expirationDates = Array.from(new Set(trades.map(t => t.Expiration_Date || t.Expiration)))
    .sort((a, b) => new Date(a) - new Date(b));

  
      // Calculate max size and entry value from the trades data
  const maxEntryValue = trades.length > 0
        ? Math.max(...trades.map(t => parseFloat(t.Entry_Value)).filter(v => !isNaN(v)))
        : DEFAULT_FILTERS.Entry_Value[1];
    
  const maxSize = trades.length > 0
        ? Math.max(...trades.map(t => parseFloat(t.Size)).filter(v => !isNaN(v)))
        : DEFAULT_FILTERS.Size[1];
  
  const tabNames = ['Insights','Strategies', 'Data Table'];
  


  useEffect(() => {
    console.log("TradeDashboard: State updated - activeTab:", activeTab,
                "selectedSegment:", selectedSegment,
                  "contextId:", contextId,
                  "selectedSegment_RightSide:", selectedSegment_RightSide,
                    "contextId_RightSide:", contextId_RightSide);
  }, [activeTab, selectedSegment, contextId, selectedSegment_RightSide, contextId_RightSide]);

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
function handleSimulate(segmentData) {
    console.log("MarketWatch: received simulate data:", segmentData);
  
    // ✅ Pass to parent (App.js)
    if (onSimulate) {
      onSimulate(segmentData);
    }
  }
 // -----------------------------------------------------------------
// --------------------handles selected segments -------------------
// -----------------------------------------------------------------
function handleSegmentSelect(event) {
  if (!event) return;

  const {
    selectedSegment: newSelectedSegment,
    contextId: newContextId,
    selectedSegment_RightSide: newRightSideSegment,
    contextId_RightSide: newRightSideContextId
  } = event;

  // RESET DetailsBar if both are null
  if (newSelectedSegment === null && newContextId === null) {
    setSelectedSegment(null);
    setContextId(null);
  }

  // Handle RightSideBar updates
  if (newRightSideSegment && newRightSideContextId) {
    setSelectedSegment_RightSide(newRightSideSegment);
    setContextId_RightSide(newRightSideContextId);
  }

  // Handle DetailsBar updates
  if (newSelectedSegment && newContextId) {
    setSelectedSegment(newSelectedSegment);
    setContextId(newContextId);
  }
}

 
// -------------------- TabBar Container -------------------------------------

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Insights':
        return (
          <InsightsTab
            data={trades}
            chains={chains}
            filters={filters}
            onSegmentSelect={handleSegmentSelect}
          />
        );
      case 'Strategies':
        return (
          <StrategiesTab
            data={trades}
            filters={filters}
            onSegmentSelect={handleSegmentSelect}
          />
        );
      case 'Data Table':
      default:
        return (
          <DataTable
            data={trades}
            filters={filters}
            onSegmentSelect={handleSegmentSelect}
          />
        );
    }
  };

// -----------------------------------------------------------------
// -------------------- Main Dashboard -------------------------------------
// -----------------------------------------------------------------
  return (
    <div
   // Main Trade Dashboard Container  --------------------
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        alignItems : 'center',
        minHeight: '100vh',
        padding: '20px 0',
        overflowX: 'hidden',
      }}
    >
    {/* Version Control */}
     <div style={{position: 'absolute',
                       left:10,
                       bottom:10,
                       fontSize: 'clamp(9px, 1vw,10px)', color:"#444"
    
                   }}> 
        v1.0.4
     </div>

      {/* Technical Bar */}
      <TechnicalBar 
        analytics={analytics} 
        loading={analyticsLoading} 
        btcpriceData={btcprice}
        priceLoading={priceLoading}
        />
      {/* Fixed User bar container */}
      <AccountBar/>
      {/* Fixed Top Filter */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        options={{
                    strikePrices,
                    expirationDates,
                    maxSize,
                    maxEntryValue,
                  }}
      />

      {/* Tab Navigation */}
      <TabsBar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          // Reset DetailsBar for all tabs
          setSelectedSegment(null);
          setContextId(null);
          setSelectedSegment_RightSide(null);
          setContextId_RightSide(null);
       
        }}
        tabNames = {tabNames}
      />

      {/* Main Content Area for TabBars */}
      
      <div style={{ flex: 1, padding: '0 20px' }}>{renderTabContent()}</div>

      {/* Fixed Bottom Details */}
      <DetailsBar
        activeTab={activeTab}
        selectedSegment={selectedSegment}
        filters={filters}
        contextId={contextId}
        onSimulate={handleSimulate}
      />

      {/* Fixed Right Sidebar */}
      <RightSideBar
        activeTab={activeTab}
        selectedSegment={selectedSegment_RightSide}
        filters={filters}
        contextId={contextId_RightSide}
        onSegmentSelect={handleSegmentSelect}
      />
    </div>
  );
}

