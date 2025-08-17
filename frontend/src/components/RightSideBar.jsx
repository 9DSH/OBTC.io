import React, { useState, useEffect, useRef } from 'react';
import { formatStrikeLabel, formatExpirationLabel, getTradeSummary } from '../utils/chartHelpers';
import CustomTooltip from './CustomTooltip';
import Tooltip from '@mui/material/Tooltip';

export default function RightSideBar({ activeTab, selectedSegment, filters, contextId, onSegmentSelect }) {
  const [isManuallyMinimized, setIsManuallyMinimized] = useState(true);
  const [viewMode, setViewMode] = useState('combo');
  const [expandedTradeIds, setExpandedTradeIds] = useState(new Set());
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set());
  const [sortBy, setSortBy] = useState('entryValue');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const sidebarRef = useRef(null);
  const toggleButtonRef = useRef(null);

  const isExpanded = !isManuallyMinimized;

  // Auto-expand sidebar when a segment is selected
  useEffect(() => {
    if (selectedSegment !== null) {
      setIsManuallyMinimized(false);
    }
  }, [selectedSegment]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(event.target)
      ) {
        setIsManuallyMinimized(true);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    // Also reset states when activeTab/selectedSegment changes
    setExpandedTradeIds(new Set());
    setExpandedGroupIds(new Set());
    setSearchQuery('');
  }, [activeTab, selectedSegment]);

  const STRATEGY_COLORS = {
    "BUY Call": {
      background: "rgba(36, 101, 57, 0.43)",
      text: "rgb(141, 179, 154)",
    },
    "SELL Put": {
      background: "rgba(36, 101, 57, 0.43)",
      text: "rgb(141, 179, 154)",
    },
    "SELL Call": {
      background: "rgba(160, 37, 26, 0.44)",
      text: "rgb(185, 161, 156)",
    },
    "BUY Put": {
      background: "rgba(160, 37, 26, 0.44)",
      text: "rgb(185, 161, 156)",
    },
  };

  const parseEntryValue = (value) => {
    if (!value || typeof value !== 'string') {
      return 0;
    }
    const cleanValue = value.replace(/[kM]/g, '').trim();
    const multiplier = value.endsWith('k') ? 1000 : value.endsWith('M') ? 1000000 : 1;
    const parsed = parseFloat(cleanValue) * multiplier;
    if (isNaN(parsed)) {
      return 0;
    }
    return parsed;
  };

  const sortGroups = (groups) => {
    if (!groups || groups.length === 0) {
      return groups;
    }
    const sortedGroups = [...groups].sort((a, b) => {
      const summaryA = getTradeSummary(a)[0] || {};
      const summaryB = getTradeSummary(b)[0] || {};
      let valueA, valueB;

      switch (sortBy) {
        case 'entryValue':
          valueA = parseEntryValue(summaryA.Entry_Value);
          valueB = parseEntryValue(summaryB.Entry_Value);
          break;
        case 'entryTime':
          valueA = new Date(summaryA.Entry_Time || '1970-01-01').getTime();
          valueB = new Date(summaryB.Entry_Time || '1970-01-01').getTime();
          break;
        case 'expirationDate':
          const datesA = a
            .map(trade => trade.Expiration_Date ? new Date(trade.Expiration_Date).getTime() : null)
            .filter(time => time !== null);
          const datesB = b
            .map(trade => trade.Expiration_Date ? new Date(trade.Expiration_Date).getTime() : null)
            .filter(time => time !== null);

          valueA = datesA.length > 0
            ? (sortDirection === 'desc' ? Math.max(...datesA) : Math.min(...datesA))
            : new Date('1970-01-01').getTime();
          valueB = datesB.length > 0
            ? (sortDirection === 'desc' ? Math.max(...datesB) : Math.min(...datesB))
            : new Date('1970-01-01').getTime();

          if (valueA === valueB) {
            const timeA = new Date(summaryA.Entry_Time || '1970-01-01').getTime();
            const timeB = new Date(summaryB.Entry_Time || '1970-01-01').getTime();
            return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
          }
          break;
        default:
          return 0;
      }
      return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
    });
    return sortedGroups;
  };

  const handleSort = (option) => {
    if (sortBy === option) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
    } else {
      setSortBy(option);
      setSortDirection('desc');
    }
    setExpandedGroupIds(new Set());
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const filterBlockTradeGroups = (groups) => {
    if (!searchQuery.trim()) {
      return groups;
    }
    const filtered = groups.filter(group => {
      const summary = getTradeSummary(group)[0] || {};
      const blockTradeId = summary.Block_Trade_ID || '';
      return blockTradeId.toLowerCase().includes(searchQuery.toLowerCase());
    });
    return filtered;
  };

  const styles = {
    wrapper: {
      position: 'fixed',
      right: 21,
      bottom: 80,
      width: isExpanded ? 'clamp(320px, 20vw, 420px)' : '0',
      height: isExpanded ? 'clamp(320px, 70vh, 720px)' : '0',
      backgroundColor: isExpanded ? 'rgba(27, 28, 34, 0.7)' : 'transparent',
      backdropFilter: isExpanded ? 'blur(10px)' : 'none',
      borderLeft: isExpanded ? '2px solid #333' : 'none',
      borderRight: isExpanded ? '1px solid #333' : 'none',
      borderRadius: '15px',
      boxSizing: 'border-box',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
    },
    toggleButtonContainer: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: 'clamp(20px, 3vw, 50px)',
      height: 'clamp(20px, 3vw, 50px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(27, 28, 34, 0.7)',
      backdropFilter: 'blur(10px)',
      border: '1px solid #333',
      borderRadius: '20%',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      zIndex: 1001,
    },
    toggleButtonImage: {
      width: '60%',
      height: '60%',
      objectFit: 'contain',
      opacity: 0.5,
      transition: 'opacity 0.3s ease',
    },
    contentWrapper: {
      flex: 1,
      display: isExpanded ? 'flex' : 'none',
      flexDirection: 'column',
      minHeight: '100%',
      borderRadius: '15px',
      overflowY: isExpanded ? 'auto' : 'hidden', // Make the content wrapper scrollable

    },
    fixedHeaderContainer: {
      position: 'sticky', // This is the key change
      top: 0,
      zIndex: 10,
      backgroundColor: 'rgba(27, 28, 34, 0.7)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid #333',
    },
    topContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '8px',
      flexShrink: 0,
      cursor: 'pointer',
      position: 'relative',
    },
    titleContainer: {
      color: '#ccc',
      fontSize: 'clamp(10px, 1vw, 14px)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    strategyContainer: {
      flex: 1,
      color: '#ddd',
      display: 'flex',
      flexDirection: 'column',
    },
    fixedControlsContainer: {
      backgroundColor: 'rgba(36, 35, 44, 0.7)',
      backdropFilter: 'blur(4px)',
      borderBottom: "1px solid rgb(66, 64, 64)",
      boxShadow: '0px 5px 40px rgba(0, 0, 0, 0.41)',
      
    },
    scrollableContentContainer: {
      flex: 1,
      padding: 'clamp(8px, 2vw, 12px)',
      zIndex: 0,
    },
    tabsContainer: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 'clamp(1px, 1%, 3px)',
      padding: 'clamp(1px, 1%, 4px)',
      backgroundColor: 'var(--color-hover-trans)',
      gap: '8px',
    },
    toggleButton: {
      padding: '6px 12px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: 'clamp(11px, 1vw, 14px)',
      fontWeight: '500',
      transition: 'background-color 0.2s ease, color 0.2s ease',
    },
    sortRow: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: '2px',
      padding: '2px',
      borderRadius: '6px',
      gap: 'clamp(1px, 1vw, 3px)',
      height: '35px',
      position: 'relative',
    },
    sortButton: {
      height: '25px',
      padding: '4px 6px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: 'clamp(0.4rem, 1.6vw, 0.7rem)',
      fontWeight: '500',
      transition: 'background-color 0.2s ease, color 0.2s ease',
      zIndex: 1,
    },
    searchContainer: {
      height: '25px',
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#333',
      borderRadius: '6px',
      padding: '2px 4px',
      transition: 'width 0.3s ease',
      flex: '0 1 auto',
      maxWidth: '150px',
      marginLeft: 5,
      zIndex: 2000,
    },
    searchInput: {
      marginLeft: 2,
      background: 'transparent',
      border: 'none',
      color: '#ddd',
      fontSize: '11px',
      padding: '2px 4px',
      outline: 'none',
      width: '45px',
      transition: 'width 0.3s ease',
    },
    searchInputFocus: {
      width: 'clamp(45px, 5vw, 120px)',
      zIndex: 2000,
    },
    groupContainer: {
      marginBottom: 'clamp(2px, 0.6vw, 10px)',
      padding: 'clamp(2px, 0.2vw, 6px)',
      backgroundColor: 'var(--color-background-tooltip)',
      border: '1px solid #444',
      borderRadius: 'clamp(4px, 0.8vw, 6px)',
    },
    groupToggleButton: {
      cursor: 'pointer',
      color: '#aaa',
      fontSize: 'clamp(11px, 0.6vw, 14px)',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      marginTop: 'clamp(1px, 0.1vw, 4px)',
      marginBottom: 'clamp(1px, 0.1vw, 4px)',
      backgroundColor: 'var(--color-background-tooltip)',
      border: 'none',
    },
    summaryCard: {
      background: 'var(--color-background-bar)',
      borderRadius: 'clamp(4px, 0.8vw, 6px)',
      padding: 'clamp(6px, 1vw, 8px)',
      marginBottom: 'clamp(6px, 1vw, 8px)',
      color: '#ddd',
      fontSize: 'clamp(0.7rem, 1.6vw, 0.8rem)',
      width: '100%',
      minWidth: '100%',
      maxWidth: '100%',
      minHeight: 'clamp(50px, 8vh, 60px)',
      flexShrink: 0,
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
    },
    summaryCardHover: {
      backgroundColor: 'var(--color-hover-trans)',
    },
    summaryBlocktrade: {
      fontSize: 'clamp(0.6rem, 2vw, 0.7rem)',
      color: 'gray',
      overflow: 'hidden',
      display: 'flex',
      justifyContent: 'space-between',
      padding: 'clamp(2px, 0.5vw, 4px) clamp(6px, 1vw, 8px)',
    },
    summaryHeader: {
      cursor: 'pointer',
      fontSize: 'clamp(0.7rem, 2vw, 0.9rem)',
      fontWeight: 'bold',
      color: '#fff',
      textAlign: 'center',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    summaryRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: 'clamp(1px, 0.5vw, 3px) clamp(12px, 0.8vw, 16px)',
      backgroundColor: 'var(--color-hover-trans)',
      borderRadius: 'clamp(1px, 0.8vw, 5px)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      fontSize:  'clamp(9px, 1vw, 13px)'
    },
    tradeCard: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      border: '2px solid #444',
      borderRadius: 'clamp(3px, 0.8vw, 4px)',
      overflow: 'hidden',
      background: '#1e1e1e',
      color: '#ddd',
      fontSize: 'clamp(0.6rem, 1.6vw, 0.7rem)',
      width: '100%',
      maxWidth: '100%',
      minWidth: '100%',
      height: '25px',
      marginBottom: '4px',
      flexShrink: 0,
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
    },
    tradeCardHover: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    cell: {
      padding: 'clamp(2px, 0.8vw, 3px) clamp(6px, 0.5vw, 7px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRight: '2px solid #444',
      textOverflow: 'ellipsis',
      fontSize: 'inherit',
    },
    expandedTradeDetails: {
      backgroundColor: '#1e1e1e',
      border: '2px solid #444',
      borderRadius: 'clamp(4px, 0.8vw, 6px)',
      padding: 'clamp(6px, 1vw, 8px)',
      marginBottom: 'clamp(6px, 1vw, 8px)',
      color: '#ddd',
      fontSize: 'clamp(0.6rem, 1.6vw, 0.7rem)',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    },
    expandedDetailRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      justifyItems: 'center',
      alignItems: 'center',
      padding: 'clamp(2px, 0.5vw, 4px)',
      backgroundColor: 'rgba(46, 46, 74, 0.64)',
      borderRadius: 'clamp(1px, 0.8vw, 3px)',
    },
    expandedDetailValue: {
      color: '#ddd',
    },
    emptyBox: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#777',
      fontStyle: 'italic',
      fontSize: '12px',
      height: '100px',
      width: '100%',
    },
    title: {
      color: '#ccc',
      fontSize: 'clamp(0.8rem, 1.8vw, 0.9rem)',
      textAlign: 'left',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    titleStrong: {
      color: '#fff',
    },
    emptySummary: {
      color: '#777',
      fontStyle: 'italic',
      textAlign: 'center',
      padding: 'clamp(6px, 1vw, 8px)',
      fontSize: 'clamp(0.7rem, 1.6vw, 0.8rem)',
    },
  };

  const renderTradeCard = (trade, idx, groupIndex) => {
    const side = (trade.Side || '').trim();
    const type = (trade.Option_Type || '').trim();
    const strategyKey = `${side} ${type}`;
    const strategyColors = STRATEGY_COLORS[strategyKey] || {
      background: '#e0e0e0',
      text: '#000',
    };
    const tradeId = trade.Trade_ID || `${groupIndex}-${idx}`;
    const isExpandedTrade = expandedTradeIds.has(tradeId);

    const handleClick = () => {
      setExpandedTradeIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(tradeId)) {
          newSet.delete(tradeId);
        } else {
          newSet.add(tradeId);
        }
        return newSet;
      });
    };

    return (
      <div key={tradeId}>
        <div
          style={styles.tradeCard}
          onClick={handleClick}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = styles.tradeCardHover.backgroundColor;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1e1e1e';
          }}
        >
          <div
            style={{
              ...styles.cell,
              backgroundColor: strategyColors.background,
              color: strategyColors.text,
            }}
          >
            {side || 'N/A'}
          </div>
          <div
            style={{
              ...styles.cell,
              backgroundColor: strategyColors.background,
              color: strategyColors.text,
            }}
          >
            {type || 'N/A'}
          </div>
          <div
            style={{
              ...styles.cell,
              backgroundColor: 'rgb(67, 64, 75)',
              color: 'rgb(211, 209, 209)',
            }}
          >
            {trade.Strike_Price ? formatStrikeLabel(trade.Strike_Price) : 'N/A'}
          </div>
          <div
            style={{
              ...styles.cell,
              borderRight: 'none',
              backgroundColor: 'rgba(46, 46, 74, 0.64)',
              color: 'rgb(211, 209, 209)',
            }}
          >
            {trade.Expiration_Date ? formatExpirationLabel(trade.Expiration_Date) : 'N/A'}
          </div>
        </div>
        {isExpandedTrade && (
          <div style={styles.expandedTradeDetails}>
            <div style={styles.expandedDetailRow}>
              <span style={styles.expandedDetailValue}>
                <CustomTooltip content={`Size: ${trade.Size ? `x${trade.Size}` : 'N/A'}`}>
                  {trade.Size ? `x${trade.Size}` : 'N/A'}
                </CustomTooltip>
              </span>
              <span style={styles.expandedDetailValue}>
                <CustomTooltip content={`Entry Value: ${trade.Entry_Value ? formatStrikeLabel(trade.Entry_Value) : 'N/A'}`}>
                  {trade.Entry_Value ? formatStrikeLabel(trade.Entry_Value) : 'N/A'}
                </CustomTooltip>
              </span>
              <span style={styles.expandedDetailValue}>
                <CustomTooltip content={`IV%: ${trade.IV_Percent != null && !isNaN(trade.IV_Percent)
                    ? `${Number(trade.IV_Percent).toFixed(1)} %`
                    : 'N/A'}`}>
                  {trade.IV_Percent != null && !isNaN(trade.IV_Percent)
                    ? `${Number(trade.IV_Percent).toFixed(1)} %`
                    : 'N/A'}
                </CustomTooltip>
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSummaryCard = (group, index, groupType, contextId) => {
    const summary = getTradeSummary(group);
    if (!summary || summary.length === 0) {
      return (
        <div style={styles.emptySummary}>
          No summary available for {groupType} Group {index + 1}
        </div>
      );
    }
    const summaryData = summary[0];
    const handleClick = () => {
      if (onSegmentSelect) {
        const payload = {
          selectedSegment: {
            trades: group,
            comboID: `${groupType} ${index + 1}`,
          },
          contextId: 'strategy/strategyoverview',
        };
        onSegmentSelect(payload);
      }
    };

    return (
      <div
        key={`${groupType}-${index}`}
        style={styles.summaryCard}
        onClick={handleClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = styles.summaryCardHover.backgroundColor;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = styles.summaryCard.background;
        }}
      >

        <div style={styles.summaryHeader}>
          <CustomTooltip content={`Strategy Name: ${summaryData.Strategy_Type || 'N/A'}`}>
            {summaryData.Strategy_Type || 'N/A'}
          </CustomTooltip>
        </div>
        <div style={styles.summaryBlocktrade}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <CustomTooltip content={`Block Trade ID: ${summaryData.Block_Trade_ID || '-'}`}>
              {summaryData.Block_Trade_ID || 'Public Trade'}
            </CustomTooltip>
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <CustomTooltip content={`Entry Time: ${summaryData.Entry_Time}`}>
              {summaryData.Entry_Time}
            </CustomTooltip>
          </span>
        </div>
        <div style={styles.summaryRow}>
          <CustomTooltip content={`Total Size: ${summaryData.Total_Size}`}>
            {'x' + summaryData.Total_Size}
          </CustomTooltip>
          <CustomTooltip content={`Total Entry Value: ${summaryData.Entry_Value}`}>
            {summaryData.Entry_Value}
          </CustomTooltip>
          <CustomTooltip
            content={`Average IV %: ${
              summaryData.IV_Percent != null && !isNaN(summaryData.IV_Percent)
                ? Number(summaryData.IV_Percent).toFixed(1)
                : 'N/A'
            }`}
          >
            {summaryData.IV_Percent != null && !isNaN(summaryData.IV_Percent)
              ? Number(summaryData.IV_Percent).toFixed(1) + ' %'
              : 'N/A'}
          </CustomTooltip>
          <CustomTooltip content={`Underlying Price: ${summaryData.Underlying_Price}`}>
            {summaryData.Underlying_Price}
          </CustomTooltip>
        </div>
      </div>
    );
  };

  const titleText = selectedSegment ? (
    contextId === 'strategy/strategyoverview-pie'
      ? `Strike Price: ${formatStrikeLabel(selectedSegment?.strike) || 'N/A'}`
      : `Strategy: ${selectedSegment?.strategyType || 'N/A'} ${selectedSegment?.count > 0 ? `(${selectedSegment.count} Strategies)` : ''}`
  ) : '';

  if (contextId !== 'strategy/strategyoverview-bar' && contextId !== 'strategy/strategyoverview-pie') {
    return null;
  }

  const comboGroups = selectedSegment?.comboGroups || [];
  const blockTradeGroups = selectedSegment?.blockTradeGroups || [];
  const sortedComboGroups = sortGroups(comboGroups);
  const sortedBlockTradeGroups = sortGroups(blockTradeGroups);
  const filteredBlockTradeGroups = filterBlockTradeGroups(sortedBlockTradeGroups);

  const tooltipProps = {
    arrow: true,
    placement: 'left',
    componentsProps: {
      tooltip: {
        sx: {
          bgcolor: 'var(--color-primary, #2196f3)',
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

  return (
    <>
      <div style={styles.wrapper} ref={sidebarRef}>
        <div style={styles.contentWrapper}>
          <div style={styles.fixedHeaderContainer}>
            <div style={styles.topContainer}>
              <div style={styles.titleContainer}>
                <strong style={styles.titleStrong}>
                  {contextId === 'strategy/strategyoverview-pie' ? 'Strike Price: ' : 'Strategy: '}
                </strong>
                {titleText.split(': ')[1]}
              </div>
            </div>
            <div style={styles.strategyContainer}>
              <div style={styles.fixedControlsContainer}>
                <div style={styles.tabsContainer}>
                  <button
                    style={{
                      ...styles.toggleButton,
                      backgroundColor: viewMode === 'combo' ? 'var(--color-primary)' : 'transparent',
                      color: viewMode === 'combo' ? '#fff' : '#aaa',
                    }}
                    onClick={() => setViewMode('combo')}
                  >
                    Public Trades
                  </button>
                  <button
                    style={{
                      ...styles.toggleButton,
                      backgroundColor: viewMode === 'block' ? 'var(--color-primary)' : 'transparent',
                      color: viewMode === 'block' ? '#fff' : '#aaa',
                    }}
                    onClick={() => setViewMode('block')}
                  >
                    Block Trades
                  </button>
                </div>
                <div style={styles.sortRow}>
                  <button
                    style={{
                      ...styles.sortButton,
                      backgroundColor: sortBy === 'entryValue' ? '#444' : 'transparent',
                      color: sortBy === 'entryValue' ? '#fff' : '#aaa',
                    }}
                    onClick={() => handleSort('entryValue')}
                  >
                    Entry Value {sortBy === 'entryValue' && (
                      <span style={{ color: 'rgb(110, 122, 194)' }}>
                        {sortDirection === 'desc' ? ' ▼' : ' ▲'}
                      </span>
                    )}
                  </button>
                  <button
                    style={{
                      ...styles.sortButton,
                      backgroundColor: sortBy === 'entryTime' ? '#444' : 'transparent',
                      color: sortBy === 'entryTime' ? '#fff' : '#aaa',
                    }}
                    onClick={() => handleSort('entryTime')}
                  >
                    Entry Date {sortBy === 'entryTime' && (
                      <span style={{ color: 'rgb(110, 122, 194)' }}>
                        {sortDirection === 'desc' ? ' ▼' : ' ▲'}
                      </span>
                    )}
                  </button>
                  <button
                    style={{
                      ...styles.sortButton,
                      backgroundColor: sortBy === 'expirationDate' ? '#444' : 'transparent',
                      color: sortBy === 'expirationDate' ? '#fff' : '#aaa',
                    }}
                    onClick={() => handleSort('expirationDate')}
                  >
                    Expiration Date {sortBy === 'expirationDate' && (
                      <span style={{ color: 'rgb(110, 122, 194)' }}>
                        {sortDirection === 'desc' ? ' ▼' : ' ▲'}
                      </span>
                    )}
                  </button>
                  {viewMode === 'block' && (
                    <div style={styles.searchContainer}>
                      <input
                        type="text"
                        placeholder="Search Block Trade ID"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        style={{
                          ...styles.searchInput,
                          ...(document.activeElement === document.querySelector('input[placeholder="Search Block Trade ID"]') ? styles.searchInputFocus : {}),
                        }}
                        onFocus={(e) => {
                          e.target.style.width = styles.searchInputFocus.width;
                        }}
                        onBlur={(e) => {
                          e.target.style.width = styles.searchInput.width;
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div style={styles.scrollableContentContainer}>
            {viewMode === 'combo' ? (
              sortedComboGroups.length === 0 ? (
                <div style={styles.emptyBox}>No combo trades available</div>
              ) : (
                sortedComboGroups.map((group, index) => {
                  const groupId = `combo-${index}`;
                  const isGroupExpanded = expandedGroupIds.has(groupId);
                  return (
                    <div key={groupId} style={styles.groupContainer}>
                      {renderSummaryCard(group, index, 'Combo', contextId)}
                      <button
                        style={styles.groupToggleButton}
                        onClick={() => {
                          setExpandedGroupIds(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(groupId)) {
                              newSet.delete(groupId);
                            } else {
                              newSet.add(groupId);
                            }
                            return newSet;
                          });
                        }}
                        title={isGroupExpanded ? 'Collapse Trades' : 'Expand Trades'}
                      >
                        {isGroupExpanded ? '▲ Trades' : '▼ Trades'}
                      </button>
                      {isGroupExpanded && group.map((trade, idx) => renderTradeCard(trade, idx, index))}
                    </div>
                  );
                })
              )
            ) : (
              filteredBlockTradeGroups.length === 0 ? (
                <div style={styles.emptyBox}>No block trades match the search</div>
              ) : (
                filteredBlockTradeGroups.map((group, index) => {
                  const groupId = `block-${index}`;
                  const isGroupExpanded = expandedGroupIds.has(groupId);
                  return (
                    <div key={groupId} style={styles.groupContainer}>
                      {renderSummaryCard(group, index, 'Block', contextId)}
                      <button
                        style={styles.groupToggleButton}
                        onClick={() => {
                          setExpandedGroupIds(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(groupId)) {
                              newSet.delete(groupId);
                            } else {
                              newSet.add(groupId);
                            }
                            return newSet;
                          });
                        }}
                        title={isGroupExpanded ? 'Collapse Trades' : 'Expand Trades'}
                      >
                        {isGroupExpanded ? '▲ Trades' : '▼ Trades'}
                      </button>
                      {isGroupExpanded && group.map((trade, idx) => renderTradeCard(trade, idx, index))}
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>
      </div>

      {!isExpanded ? (
  <Tooltip title={titleText} {...tooltipProps}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      position: 'fixed',
      right: 70,
      bottom: 45,
    }}>

      <div
        style={styles.toggleButtonContainer}
        onClick={() => setIsManuallyMinimized(false)}
        ref={toggleButtonRef}
      >
        <img
          src={"/strategy.png"}
          alt={"Expand"}
          style={styles.toggleButtonImage}
        />
      </div>
    </div>
  </Tooltip>
) : (
  <div
    style={styles.toggleButtonContainer}
    onClick={() => setIsManuallyMinimized(true)}
    ref={toggleButtonRef}
  >
    <img
      src={"/strategy.png"}
      alt={"Minimize"}
      style={{ ...styles.toggleButtonImage, opacity: 1 }}
    />
  </div>
)}
    </>
  );
}