import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import ProfitCharts from './ProfitCharts/ProfitCharts';
import { formatStrikeLabel, formatExpirationLabel, getTradeSummary, generateCustomGradientColors } from "../utils/chartHelpers";
import CustomTooltip from "./CustomTooltip";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

export default function DetailsBar({ activeTab, selectedSegment, filters, contextId, width = '100%', height = 'clamp(200px, 30vh, 320px)' }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [simulationData, setSimulationData] = useState(null);
    const [followData, setFollowData] = useState(null);
    
     const [expandedTradeIds, setExpandedTradeIds] = useState(new Set());

    const toggleExpand = () => {
        setIsExpanded(prev => !prev);
    };

    useEffect(() => {
        setIsExpanded(true);
    }, [activeTab, selectedSegment]);

    const styles = {
        wrapper: {
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            margin: '0 auto',
            maxWidth: '1240px',
            width: 'clamp(320px, 85vw, 1240px)',
            height: isExpanded ? 'clamp(300px, 30%, 320px)' : 'clamp(35px, 5%, 50px)' ,
            backgroundColor: 'rgba(27, 28, 34, 0.7)',
            backdropFilter: 'blur(10px)',
            padding: isExpanded ? 'clamp(8px, 2vw, 12px)' : '0',
            zIndex: 100,
            borderTop: '1px solid #333',
            borderTopLeftRadius: 'clamp(10px, 1.5vw, 14px)',
            borderTopRightRadius: 'clamp(10px, 1.5vw, 14px)',
            boxSizing: 'border-box',
            transition: 'height 0.3s ease-in-out, padding 0.3s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'stretch',
        },
        toggleButtonContainer: {
            width: 'clamp(30px, 3vw, 45px)',
            height: 'clamp(20px, 3vw, 30px)',
            position: 'absolute',
            bottom: isExpanded ? 'calc(100% - 15px)' : 'calc(100% - 15px)',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            zIndex: 101,
            backgroundColor: 'rgba(27, 28, 34, 0.46)',
            backdropFilter: 'blur(10px)',
            borderRadius: '30%',
            padding: '5px',
            borderTop: '1px solid #333',
            transition: 'bottom 0.3s ease-in-out',
        },
        toggleButtonIcon: {
            width: '30px',
            height: '20px',
            objectFit: 'contain',
        },
        content: {
            flex: 1,
            overflow: 'hidden',
            display: isExpanded ? 'block' : 'none',
            marginTop : "5px",
            
        },
        grid: {
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'flex-start',
            overflowX: 'hidden',
        },
        chartBox: {
            flex: '1 1 clamp(180px, 18vw, 220px)',
            maxWidth: 'clamp(220px, 22vw, 280px)',
            minWidth: 'clamp(150px, 15vw, 180px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: 'clamp(6px, 1vw, 8px)',
            boxSizing: 'border-box',
        },
        chartTitle: {
            fontSize: 'clamp(12px, 1vw, 14px)',
            color: '#eee',
            fontWeight: 'bold',
            marginBottom: 'clamp(4px, 0.5vh, 6px)',
            textAlign: 'center',
        },
        chartWrapper: {
            height: '100%',
            width: '100%',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(8px, 1.5vw, 12px)',
        },
        emptyBox: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#777',
            fontStyle: 'italic',
            fontSize: 'clamp(10px, 1.1vw, 12px)',
            height: 'clamp(100px, 15vh, 120px)',
            width: '100%',
        },
        mainProfitColumns: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'stretch',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
        },
        tradeCard: {
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            border: "2px solid #444",
            borderRadius: 'clamp(3px, 0.8vw, 4px)',
            overflow: "hidden",
            background: "#1e1e1e",
            color: "#ddd",
            fontSize: 'clamp(0.6rem, 0.6vw, 0.7rem)',
            width: '100%',
            height: 'clamp(24px, 2.5vh, 28px)',
            marginBottom: 0,
            flexShrink: 0,

            cursor: 'pointer',
            
        },
        cell: {
            padding: 'clamp(2px, 0.8vw, 3px) clamp(6px, 1vw, 10px)',
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRight: "2px solid #444",
            textOverflow: 'ellipsis',
            fontSize: 'inherit',
            wordBreak: 'break-word',
            hyphens: 'auto',
            height: 'auto',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
        },
        leftColumn: {
            flex: '1 1 clamp(15%, 20vw, 20%)',
            display: 'grid',
            gridTemplateRows: 'auto 1fr',
            border: "2px solid #444",
            borderRadius: 'clamp(4px, 0.8vw, 6px)',
            height: '100%',
            maxHeight: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            boxSizing: 'border-box',
        },
        top_leftgrid: {
            gridRow: '1',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            overflowY: 'auto',
            padding: 'clamp(4px, 0.8vw, 6px)',
            boxSizing: 'border-box',
            flexShrink: 0,
        },
        cardGrid: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '0.3rem',
            padding: '0.4rem',
            overflowY: 'auto',
            overflowX: 'hidden',
            width: '100%',
            maxHeight: '100%',
            boxSizing: 'border-box',
            scrollbarWidth: 'thin',
            scrollbarColor: '#444 #222',
            flexShrink: 0,
            marginTop: -7,
        },
        profitColumn: {
            flex: '1 1 clamp(60%, 65vw, 70%)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            padding: 'clamp(8px, 1.5vw, 12px)',
            boxSizing: 'border-box',
            alignItems: 'center',
            justifyContent: 'center',
        },
        summaryCard: {
            background: "var(--color-background-bar)",
            border: "2px solid #444",
            borderRadius: 'clamp(4px, 0.8vw, 6px)',
            padding: 'clamp(6px, 1vw, 8px)',
            marginBottom: 'clamp(6px, 1vw, 8px)',
            color: "#ddd",
            fontSize: 'clamp(0.7rem, 1.6vw, 0.8rem)',
            width: '100%',
            flexShrink: 0,
        },
        summaryRow: {
            display: 'flex',
            justifyContent: 'center',
            padding: 'clamp(0.2rem, 0.3vw,0.4rem) clamp(0.3rem, 0.5vw,0.6rem)',
            backgroundColor: 'var(--color-hover-trans)',
            borderRadius: 'clamp(1px, 0.8vw, 5px)',
            fontSize: 'clamp(0.6rem, 2vw, 0.7rem)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            gap: 'clamp(0.3rem, 1.1vw, 2.4rem)',
        },
        summaryBlocktrade: {
            fontSize: 'clamp(0.4rem, 0.85vw, 0.7rem)',
            color: 'gray',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            gap: 'clamp(1rem, 1.4vw, 2.5rem)',
            padding: 'clamp(0.2rem, 0.3vw,0.4rem) clamp(0.2rem, 0.3vw,0.4rem)',
        },
        emptySummary: {
            color: "#777",
            fontStyle: "italic",
            textAlign: "center",
            padding: 'clamp(6px, 1vw, 8px)',
            fontSize: 'clamp(0.7rem, 1.6vw, 0.8rem)',
        },
        summaryHeader: {
            fontSize: 'clamp(0.5rem, 1vw, 0.9rem)',
            fontWeight: "bold",
            color: "#fff",
            textAlign: "center",
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'flex', // Add display flex
            justifyContent: 'space-between', // Space out columns
            alignItems: 'center',
        },
        cardIconHeader: {
            display: 'flex',
            overflow: 'hidden',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            flexDirection: 'column',
            padding: '5px'
        },
        simulateIconButton: {
            cursor: 'pointer',
            height: 'clamp(1.7rem, 1.7vw,2rem)',
            width: 'clamp(1.7rem, 1.7vw,2rem)',
            padding: 'clamp(1px, 0.4vw,6px)',
        },
        followIconButton: {
            cursor: 'pointer',
            height: 'clamp(1.5rem, 1.6vw,1.8rem)',
            width: 'clamp(1.8rem, 1.8vw,2.2rem)',
            padding: 'clamp(1px, 0.4vw,6px)',
        },
        expandedTradeDetails: {
            backgroundColor: '#1e1e1e',
            border: '1px solid #444',
            borderRadius: 'clamp(4px, 0.8vw, 6px)',
            padding: 'clamp(2px, 0.5vw, 4px)',
            color: '#ddd',
            fontSize: 'clamp(0.6rem, 0.6vw, 0.7rem)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            
            height: 'clamp(24px, 2.5vh, 28px)',
          },
          expandedDetailRow: {
            display: 'flex',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            justifyItems: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(46, 46, 74, 0.64)',
            borderRadius: 'clamp(1px, 0.8vw, 3px)',
            
          },
          expandedDetailValue: {
            color: '#ddd',
          },
          tradeCardHover: {
            backgroundColor: '#2e2e2e', // or any other color you want for the hover state
        },
    };

    const STRATEGY_COLORS = {
        "BUY Call": { background: "rgba(36, 101, 57, 0.43)", text: "rgb(141, 179, 154)" },
        "SELL Put": { background: "rgba(36, 101, 57, 0.43)", text: "rgb(141, 179, 154)" },
        "SELL Call": { background: "rgba(160, 37, 26, 0.44)", text: "rgb(185, 161, 156)" },
        "BUY Put": { background: "rgba(160, 37, 26, 0.44)", text: "rgb(185, 161, 156)" },
    };
    const renderTradeCard = (trade, idx) => {
        const side = (trade.Side || '').trim();
        const type = (trade.Option_Type || '').trim();
        const strategyKey = `${side} ${type}`;
        const strategyColors = STRATEGY_COLORS[strategyKey] || {
          background: '#e0e0e0',
          text: '#000',
        };
        const tradeId = trade.Trade_ID || `${idx}`; // Using idx as a fallback for a unique ID
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

    const renderLiveTradeButtons = () => {
        const summary = selectedSegment?.trades ? getTradeSummary(selectedSegment.trades)[0] : null;

        if (!summary) {
            return null;
        }

        return (
            <div style={styles.cardIconHeader}>
                <CustomTooltip content="Simulation">
                    <img
                        src="/simulation.png"
                        alt="Simulation"
                        style={styles.simulateIconButton}
                        onClick={() => setSimulationData(summary)}
                    />
                </CustomTooltip>
                <CustomTooltip content="Follow">
                    <img
                        src="/follow.png"
                        alt="Follow"
                        style={styles.followIconButton}
                        onClick={() => setFollowData(summary)}
                    />
                </CustomTooltip>
            </div>
        );
    };

    const renderInsightPutCallDist = () => {
        const strike = selectedSegment?.strike || 'N/A';
        const groupedData = selectedSegment?.groupedData || {};

        const formatDateLabel = (iso) => {
            const d = new Date(iso);
            const day = String(d.getDate()).padStart(2, '0');
            const mon = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
            const year = String(d.getFullYear()).slice(-2);
            return `${day} ${mon} ${year}`;
        };

        const getDoughnutChartData = (trades) => {
            const total = trades.length;
            const byExp = trades.reduce((acc, t) => {
                const label = formatDateLabel(t.Expiration_Date);
                acc[label] = (acc[label] || 0) + 1;
                return acc;
            }, {});

            const entries = Object.entries(byExp).map(([label, count]) => ({
                label,
                count,
                percentage: ((count / total) * 100).toFixed(2),
            }));

            entries.sort((a, b) => b.percentage - a.percentage);
            const labels = entries.map(({ label }) => label);
            const values = entries.map(({ percentage }) => percentage);
            const colors = generateCustomGradientColors('#283254', '#868dba', values);

            return {
                labels,
                datasets: [{
                    label: 'Expiration %',
                    data: values,
                    backgroundColor: colors.slice(0, values.length),
                    borderColor: '#121212',
                    borderWidth: 1,
                }],
            };
        };

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            layout: { padding: { top: 20, bottom: 20, left: 50, right: 50 } },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (context) => ` ${context.raw}%` } },
                datalabels: {
                    color: '#aaa',
                    formatter: (_, context) => context.chart.data.labels[context.dataIndex],
                    font: { size: 9.5, weight: 'bold' },
                    align: 'end',
                    anchor: 'end',
                    offset: 1,
                    rotation: 0,
                    clip: false,
                    display: 'auto',
                },
            },
        };

        const renderChart = (label) => {
            const trades = groupedData[label] || [];
            return (
                <div key={label} style={styles.chartBox}>
                    <div style={styles.chartTitle}>{label}</div>
                    {trades.length === 0 ? (
                        <div style={styles.emptyBox}>No trades...</div>
                    ) : (
                        <div style={styles.chartWrapper}>
                            <Doughnut data={getDoughnutChartData(trades)} options={chartOptions} />
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div style={styles.content}>
                <div style={{ color: '#ccc', marginBottom: 8, textAlign: 'center', marginTop: 8 }}>
                    <strong style={{ color: '#fff' }}>Expiration date for Strike Price:</strong> {strike}
                </div>
                <div style={styles.grid}>
                    {['Buy Call', 'Sell Call', 'Buy Put', 'Sell Put'].map(renderChart)}
                </div>
            </div>
        );
    };

    const renderStrategyOverview = () => {
        const trades = selectedSegment?.trades || [];
        const tradeSummaries = getTradeSummary(trades);
        const renderSummaryCard = (summary, idx) => (
            <div key={idx} style={styles.summaryCard}>

                <div style={styles.summaryHeader}>
                    <div style={{ width: '100%' }}>
                        <CustomTooltip content={`Strategy Name: ${summary.Strategy_Type}`}>
                            {summary.Strategy_Type}
                        </CustomTooltip>
                    </div>

                </div>
                <div style={styles.summaryBlocktrade}>
                    <span>
                        <CustomTooltip content={`Block Trade ID: ${summary.Block_Trade_ID || 'Public Trade'}`}>
                            {summary.Block_Trade_ID || 'Public Trade'}
                        </CustomTooltip>
                    </span>
                    <span>
                        <CustomTooltip content={`Entry Time: ${summary.Entry_Time}`}>
                            {summary.Entry_Time}
                        </CustomTooltip>
                    </span>
                </div>
                <div style={styles.summaryRow}>
                    <CustomTooltip content={`Total Size: ${summary.Total_Size}`}> {'x' + summary.Total_Size} </CustomTooltip>
                    <CustomTooltip content={`Total Entry Value: ${summary.Entry_Value}`}> {summary.Entry_Value} </CustomTooltip>
                    <CustomTooltip content={`Average IV %: ${summary.IV_Percent != null && !isNaN(summary.IV_Percent) ? Number(summary.IV_Percent).toFixed(1) : 'N/A'}`}>
                        {summary.IV_Percent != null && !isNaN(summary.IV_Percent) ? Number(summary.IV_Percent).toFixed(1) + ' %' : 'N/A'}
                    </CustomTooltip>
                    <CustomTooltip content={`Underlying Price: ${summary.Underlying_Price}`}> {summary.Underlying_Price} </CustomTooltip>
                </div>
            </div>
        );
        return (
            
            <div style={styles.content}>
                <div style={styles.mainProfitColumns}>
                    <div style={styles.leftColumn}>
                        <div style={styles.top_leftgrid}>
                            {tradeSummaries.length > 0 ? tradeSummaries.map(renderSummaryCard) : <div style={styles.emptySummary}>No summary available</div>}
                        
                        </div>
                        <div style={styles.cardGrid}>
                            {[...trades].sort((a, b) => parseFloat(b.Strike_Price) - parseFloat(a.Strike_Price)).map(renderTradeCard)}
                        </div>
                    </div>
                    {renderLiveTradeButtons()}
                    <div style={styles.profitColumn }>
                    
                        <ProfitCharts selectedTrades={trades} initialMode="all" showModeToggle={true} width="100%" height="100%" />
                    </div>
                </div>
            </div>
        );
    };
    const renderInsightTopVolume = () => {
        const trades = selectedSegment?.trades || [];
        const yValue = selectedSegment?.y;
        const isDateFormat = yValue && /^\d{4}-\d{2}-\d{2}$/.test(String(yValue));
        const isStrikePriceMode = yValue != null && !isDateFormat && /^\d+$/.test(String(yValue).trim());
        const filteredTrades = isStrikePriceMode ? trades.filter(t => String(t.Strike_Price).trim() === String(yValue).trim()) : trades;
        const tradesByType = filteredTrades.reduce((acc, trade) => {
            const rawSide = trade.Side || "";
            const rawType = trade.Option_Type || "";
            let side = rawSide.trim().toLowerCase();
            if (["buy", "buyoption"].includes(side)) side = "buy"; else if (["sell"].includes(side)) side = "sell";
            let type = rawType.trim().toLowerCase();
            if (["call", "calls"].includes(type)) type = "call"; else if (["put", "puts"].includes(type)) type = "put";
            const normalizedSide = side ? side.charAt(0).toUpperCase() + side.slice(1) : "";
            const normalizedType = type ? type.charAt(0).toUpperCase() + type.slice(1) : "";
            const tradeTypeKey = `${normalizedSide} ${normalizedType}`.trim();

            if (['Buy Call', 'Sell Call', 'Buy Put', 'Sell Put'].includes(tradeTypeKey)) {
                if (!acc[tradeTypeKey]) { acc[tradeTypeKey] = []; }
                acc[tradeTypeKey].push(trade);
            }
            return acc;
        }, {});

        const getDoughnutChartData = (typeTrades) => {
            const total = typeTrades.length;
            const byField = typeTrades.reduce((acc, t) => {
                const key = isStrikePriceMode ? (t.Expiration_Date ? formatExpirationLabel(t.Expiration_Date) : "Unknown") : (t.Strike_Price ? formatStrikeLabel(t.Strike_Price) : "Unknown");
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});

            const entries = Object.entries(byField).map(([label, count]) => ({
                label, count, percentage: total > 0 ? ((count / total) * 100).toFixed(2) : 0,
            }));
            entries.sort((a, b) => b.count - a.count);
            const labels = entries.map(({ label }) => label);
            const values = entries.map(({ percentage }) => percentage);
            const colors = generateCustomGradientColors('#283254', '#868dba', values);

            return {
                labels,
                datasets: [{
                    label: isStrikePriceMode ? 'Expiration Date %' : 'Strike Price %',
                    data: values,
                    backgroundColor: colors.slice(0, values.length),
                    borderColor: '#121212',
                    borderWidth: 1,
                }],
            };
        };

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            layout: { padding: { top: 20, bottom: 20, left: 50, right: 50 } },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (context) => ` ${context.raw}%` } },
                datalabels: {
                    color: '#aaa',
                    formatter: (_, context) => context.chart.data.labels[context.dataIndex],
                    font: { size: 9.5, weight: 'bold' },
                    align: 'end',
                    anchor: 'end',
                    offset: 1,
                    rotation: 0,
                    clip: false,
                    display: 'auto',
                },
            },
        };

        const renderChart = (tradeType) => {
            const typeTrades = tradesByType[tradeType] || [];
            const tradeCount = typeTrades.length;
            return (
                <div key={tradeType} style={styles.chartBox}>
                    <div style={styles.chartTitle}> {tradeType} <div style={{ fontSize: 10, fontWeight: 400, color: "rgb(154, 154, 154)" }}> {tradeCount} Trade{tradeCount !== 1 ? 's' : ''}</div> </div>
                    {tradeCount === 0 ? (
                        <div style={styles.emptyBox}>No trades...</div>
                    ) : (
                        <div style={styles.chartWrapper}>
                            <Doughnut data={getDoughnutChartData(typeTrades)} options={chartOptions} />
                        </div>
                    )}
                </div>
            );
        };

        const totalTrades = trades.length;
        const blockTradesCount = selectedSegment?.blockTrades?.length || 0;
        const totalValue = selectedSegment?.value ? formatStrikeLabel(selectedSegment.value) : 0;
        const entryDate = selectedSegment?.day ? formatExpirationLabel(selectedSegment.day) : 'N/A';
        const segmentTime = selectedSegment?.segment || 'N/A';
        const yLabel = isStrikePriceMode ? 'Strike Price' : 'Expiration Date';
        const yValueFormat = yValue != null ? (isStrikePriceMode ? formatStrikeLabel(selectedSegment.y) : formatExpirationLabel(selectedSegment.y)) : 'N/A';

        return (
            <div style={styles.content}>
                <div style={{ paddingBottom: '12px', marginBottom: '4px', borderBottom: '1px solid #444', color: '#ccc', fontSize: 'clamp(12px, 1vw, 14px)', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '30px', }}>
                    <div style={{ fontSize: 12 }}> <div style={{ color: 'rgb(145, 145, 145)', fontSize: 10 }}> Entry Date </div> <span><CustomTooltip content={`Entry: ${entryDate} | Timeframe: ${segmentTime}`}> {entryDate} | {segmentTime} </CustomTooltip> </span> </div>
                    <div style={{ fontSize: 12 }}> <div style={{ color: 'rgb(145, 145, 145)', fontSize: 10 }}> {yLabel} </div> <span><CustomTooltip content={`${yLabel}: ${yValueFormat}`}> {yValueFormat} </CustomTooltip> </span> </div>
                    <div style={{ fontSize: 12 }}> <div style={{ color: 'rgb(145, 145, 145)', fontSize: 10 }}> Total Trades </div> <span><CustomTooltip content={`Total Trades: ${totalTrades}`}> {totalTrades} </CustomTooltip> </span> </div>
                    <div style={{ fontSize: 12 }}> <div style={{ color: 'rgb(145, 145, 145)', fontSize: 10 }}> Total Values </div> <span><CustomTooltip content={`Total values: ${totalValue}`}> {totalValue} </CustomTooltip> </span> </div>
                    <div style={{ fontSize: 12 }}> <div style={{ color: 'rgb(145, 145, 145)', fontSize: 10 }}> BlockTrades </div> <span><CustomTooltip content={`Number of Block Trades in this timeframe: ${blockTradesCount}`}> {blockTradesCount} </CustomTooltip> </span> </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <div style={styles.grid}>
                        {['Buy Call', 'Sell Call', 'Buy Put', 'Sell Put'].map(renderChart)}
                    </div>
                </div>
            </div>
        );
    };

    const renderDefault = () => (
        <div style={styles.content}>
            <div style={{ padding: '8px', textAlign: 'center', color: 'gray' }}>
                <h3>No strategy is selected</h3>
                <p>Select a strategy to see details here</p>
            </div>
        </div>
    );

    let contentToRender;
    if (!selectedSegment || !contextId) {
        contentToRender = (
            <div style={styles.content}>
                <div style={{ color: '#777', textAlign: 'center', padding: '16px' }}>
                    Click on the chart to see more details here
                </div>
            </div>
        );
    } else {
        switch (contextId) {
            case "insight/putcalldist":
                contentToRender = renderInsightPutCallDist();
                break;
            case "insight/premiumbystrike":
            case "strategy/strategyoverview":
                contentToRender = renderStrategyOverview();
                break;
            case "insight/topvolume":
                contentToRender = renderInsightTopVolume();
                break;
            default:
                contentToRender = renderDefault();
                break;
        }
    }


    return (
        <div style={styles.wrapper}>
            <div style={styles.toggleButtonContainer} onClick={toggleExpand}>
                <img
                    src={isExpanded ? "/close.png" : "/open.png"}
                    alt={isExpanded ? "Close" : "Open"}
                    style={styles.toggleButtonIcon}
                />
            </div>
            {isExpanded && contentToRender}
        </div>
    );
}