import React, { useState, useEffect } from 'react';
import FilterBar, { DEFAULT_FILTERS } from './FilterBar';
import { formatStrikeLabel } from "./utils/chartHelpers";
import TabsBar from './TabsBar';
import InsightsTab from './InsightsTab';
import StrategiesTab from './Strategy/StrategiesTab';
import DataTable from './DataTable';
import DetailsBar from './DetailsBar';
import RightSideBar from './RightSideBar';
import AccountBar from './AccountBar';
import TechnicalBar from './TechnicalBar';

export default function MarketWatch({
  trades,
  chains,
  loading,
  analytics,
  analyticsLoading,
  btcprice,
  priceLoading,
  onSimulate
}) {
  const [activeTab, setActiveTab] = useState('Insights');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [selectedSegment_RightSide, setSelectedSegment_RightSide] = useState(null);
  const [contextId, setContextId] = useState(null);
  const [contextId_RightSide, setContextId_RightSide] = useState(null);


  
  // Apply BlockTrade filter to trades
  const filteredTrades = filters.BlockTrade
    ? trades.filter(trade => {
        const isBlockTrade = trade.BlockTrade_IDs && String(trade.BlockTrade_IDs).trim() !== '-';
        return isBlockTrade;
      })
    : trades;

  // Prepare multi-select options
  const strikePrices = Array.from(new Set(filteredTrades.map(t => t.Strike_Price))).sort((a, b) => a - b);
  const expirationDates = Array.from(new Set(filteredTrades.map(t => t.Expiration_Date || t.Expiration)))
    .sort((a, b) => new Date(a) - new Date(b));

  const maxEntryValue = filteredTrades.length > 0
    ? Math.max(...filteredTrades.map(t => parseFloat(t.Entry_Value)).filter(v => !isNaN(v)))
    : DEFAULT_FILTERS.Entry_Value[1];
  const maxSize = filteredTrades.length > 0
    ? Math.max(...filteredTrades.map(t => parseFloat(t.Size)).filter(v => !isNaN(v)))
    : DEFAULT_FILTERS.Size[1];

  const tabNames = ['Insights', 'Strategies', 'Data Table'];

  function handleSimulate(segmentData) {
    if (onSimulate) {
      onSimulate(segmentData);
    }
  }

  function handleSegmentSelect(event) {
    if (!event) return;

    const {
      selectedSegment: newSelectedSegment,
      contextId: newContextId,
      selectedSegment_RightSide: newRightSideSegment,
      contextId_RightSide: newRightSideContextId
    } = event;

    if (newSelectedSegment === null && newContextId === null) {
      setSelectedSegment(null);
      setContextId(null);
    }

    if (newRightSideSegment && newRightSideContextId) {
      setSelectedSegment_RightSide(newRightSideSegment);
      setContextId_RightSide(newRightSideContextId);
    }

    if (newSelectedSegment && newContextId) {
      setSelectedSegment(newSelectedSegment);
      setContextId(newContextId);
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Insights':
        return (
          <InsightsTab
            data={filteredTrades}
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px 0',
      overflowX: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        left: 10,
        bottom: 10,
        fontSize: 'clamp(9px, 1vw,10px)', color: "#444"
      }}>
        v1.0.61
      </div>

      <TechnicalBar
        analytics={analytics}
        loading={analyticsLoading}
        btcpriceData={btcprice}
        priceLoading={priceLoading}
      />
      <AccountBar />
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
      <TabsBar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedSegment(null);
          setContextId(null);
          setSelectedSegment_RightSide(null);
          setContextId_RightSide(null);
        }}
        tabNames={tabNames}
      />
      <div style={{ flex: 1, padding: '0 20px' }}>{renderTabContent()}</div>
      <DetailsBar
        activeTab={activeTab}
        selectedSegment={selectedSegment}
        filters={filters}
        contextId={contextId}
        onSimulate={handleSimulate}
      />
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
