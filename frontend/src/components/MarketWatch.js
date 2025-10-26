import React, { useState, useMemo, useCallback } from 'react';
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

  // --- Filter trades safely ---
  const filteredTrades = useMemo(() => {
    if (!Array.isArray(trades)) return [];
    return filters.BlockTrade
      ? trades.filter(trade => {
          const isBlockTrade = trade.BlockTrade_IDs && String(trade.BlockTrade_IDs).trim() !== '-';
          return isBlockTrade;
        })
      : trades;
  }, [trades, filters.BlockTrade]);

  // --- Derived option data ---
  const strikePrices = useMemo(() => (
    Array.from(new Set(filteredTrades.map(t => t.Strike_Price)))
      .filter(v => Number.isFinite(parseFloat(v)))
      .map(v => parseFloat(v))
      .sort((a, b) => a - b)
  ), [filteredTrades]);

  const expirationDates = useMemo(() => (
    Array.from(new Set(filteredTrades.map(t => t.Expiration_Date || t.Expiration)))
      .filter(Boolean)
      .sort((a, b) => new Date(a) - new Date(b))
  ), [filteredTrades]);

  // --- Safe math logic ---
  const maxEntryValue = useMemo(() => {
    if (!Array.isArray(filteredTrades) || filteredTrades.length === 0)
      return DEFAULT_FILTERS.Entry_Value?.[1] ?? 0;
  
    const max = filteredTrades.reduce((acc, t) => {
      const val = parseFloat(t?.Entry_Value);
      return Number.isFinite(val) ? Math.max(acc, val) : acc;
    }, -Infinity);
  
    return Number.isFinite(max) ? max : DEFAULT_FILTERS.Entry_Value?.[1] ?? 0;
  }, [filteredTrades]);
  
  const maxSize = useMemo(() => {
    if (!Array.isArray(filteredTrades) || filteredTrades.length === 0)
      return DEFAULT_FILTERS.Size?.[1] ?? 0;
  
    const max = filteredTrades.reduce((acc, t) => {
      const val = parseFloat(t?.Size);
      return Number.isFinite(val) ? Math.max(acc, val) : acc;
    }, -Infinity);
  
    return Number.isFinite(max) ? max : DEFAULT_FILTERS.Size?.[1] ?? 0;
  }, [filteredTrades]);
  

  const tabNames = ['Insights', 'Strategies', 'Data Table'];

  const handleSimulate = useCallback((segmentData) => {
    if (onSimulate) onSimulate(segmentData);
  }, [onSimulate]);

  // --- Prevent recursive updates ---
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

  const renderTabContent = useCallback(() => {
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
  }, [activeTab, chains, filters, filteredTrades, trades, handleSegmentSelect]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px 0',
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 10,
          bottom: 10,
          fontSize: 'clamp(9px, 1vw,10px)',
          color: "#444"
        }}
      >
        v1.0.75
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
