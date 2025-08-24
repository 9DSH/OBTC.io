import React, { useMemo, useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import {
  formatStrategyDisplay,
  groupStrategies,
} from "./utils/strategiesUtils";
import { formatStrikeLabel, formatExpirationLabel, generateCustomGradientColors } from "../utils/chartHelpers";
import {
  Tooltip as ChartTooltip,
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, ChartDataLabels);

// Register custom positioner once
ChartTooltip.positioners.customPosition = function(elements, eventPosition) {
  if (!elements.length) return false;
  const { x, y } = elements[0].element;
  return {
    x: x,
    y: y + 40, // move tooltip 40px above the arc
  };
};

export default function StrategyOverview({ strategies, filters, onSegmentSelect }) {
  const [sortOption, setSortOption] = useState("count");

  const analytics = useMemo(() => {
    if (!strategies || strategies.length === 0) {
      console.log("No strategies available, returning null");
      return null;
    }

    const validStrategies = strategies.filter((group, index) => {
      if (!group || group.length === 0) {
        console.warn(`Group ${index} is empty or undefined, skipping`);
        return false;
      }
      return true;
    });

    const totalStrategies = validStrategies.length;
    const allTrades = validStrategies.flat();

    const rawVolumeBTC = allTrades.reduce((sum, trade) => {
      const size = trade.Size || 0;
      return sum + size;
    }, 0);

    const rawEntryValue = allTrades.reduce((sum, trade) => {
      const entryValue = trade.Entry_Value || 0;
      return sum + entryValue;
    }, 0);

    const totalVolumeBTC = formatStrikeLabel(rawVolumeBTC);
    const totalEntryValue = formatStrikeLabel(rawEntryValue);

    // Helper function to get strategy type from Combo_ID or fallback
    const getStrategyType = (comboID) => {
      if (!comboID || typeof comboID !== "string" || comboID.startsWith("Custom-")) {
        return "Custom Strategy";
      }
      const [, strategyCode] = comboID.split("-");
      if (strategyCode.includes("ICOND")) return "Iron Condor";
      if (strategyCode.includes("IB")) return "Iron Butterfly";
      if (strategyCode.includes("PLAD")) return "Put Backspread";
      if (strategyCode.includes("VS")) return "Vertical Spread";
      if (strategyCode.includes("STD")) return "Straddle";
      if (strategyCode.includes("STG")) return "Strangle";
      if (strategyCode.includes("CS")) return "Calendar Spread";
      if (strategyCode.includes("DS")) return "Diagonal Spread";
      if (strategyCode.includes("CDIAG")) return "Conditional Diagonal Spread";
      if (strategyCode.includes("PCAL")) return "Put Calendar Spread";
      if (strategyCode.includes("PBUT")) return "Put Butterfly Spread";
      if (strategyCode.includes("CCAL")) return "Call Calendar Spread";
      if (strategyCode.includes("STRD")) return "Straddle (Same Strike)";
      if (strategyCode.includes("STRG")) return "Straddle (Different Strike)";
      if (strategyCode.includes("PS")) return "Put Spread";
      if (strategyCode.includes("RR")) return "Risk Reversal";
      if (strategyCode.includes("PDIAG")) return "Put Diagonal Spread";
      if (strategyCode.includes("CBUT")) return "Call Butterfly Spread";
      if (strategyCode.includes("BF")) return "Butterfly";
      return strategyCode; // fallback
    };

    // Group strategies by strategy type for bar chart
    const strategyTypeGroups = validStrategies.reduce((acc, group, index) => {
      const comboID = group[0]?.Combo_ID || group[0]?.ComboTrade_IDs || `Custom-${index}`;
      const strategyType = getStrategyType(comboID);
      if (!acc[strategyType]) {
        acc[strategyType] = { count: 0, groups: [], expirations: {}, totalEntryValue: 0 };
      }
        // ✅ count groups, not trades
      acc[strategyType].count += 1;

      acc[strategyType].groups.push(group);
      acc[strategyType].totalEntryValue += group.reduce(
         (sum, trade) => sum + (trade.Entry_Value || 0), 0);
      const groupExpirations = [...new Set(group.map(t => t.Expiration_Date).filter(Boolean))];
      groupExpirations.forEach(exp => {
        acc[strategyType].expirations[exp] = (acc[strategyType].expirations[exp] || 0) + 1;
      });
      return acc;
    }, {});

    const strategyFrequencies = Object.entries(strategyTypeGroups).map(([strategyType, { count, groups, expirations, totalEntryValue }]) => ({
      name: strategyType,
      count,
      groups,
      totalEntryValue,
      topExpirations: Object.entries(expirations)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([exp]) => exp),
    }));
    console.log("Strategy frequencies:", strategyFrequencies);

    const topStrategies = strategyFrequencies
      .sort((a, b) => sortOption === "count" ? b.count - a.count : b.totalEntryValue - a.totalEntryValue)
      .slice(0, 7);
    console.log("Top strategies:", topStrategies);

    // Format bar labels
    const formattedLabels = topStrategies.map(s => {
      const strategyType = s.name;
      const formattedExpirations = s.topExpirations.length > 0 
        ? s.topExpirations.map(formatExpirationLabel).join(" | ")
        : "No Expirations";
      return [strategyType, formattedExpirations];
    });
    const barData = {
      labels: formattedLabels,
      datasets: [
        {
          label: sortOption === "count" ? "Occurrences" : "Total Entry Value",
          data: topStrategies.map(s => sortOption === "count" ? s.count : s.totalEntryValue),
          backgroundColor: "#41486d",
          barThickness: 26,
          borderRadius: 7,
        },
      ],
    };

    // Most active strategy
    const strategyTypeTotals = validStrategies.reduce((acc, group) => {
      const comboID = group[0]?.Combo_ID || group[0]?.ComboTrade_IDs || `Custom-${validStrategies.indexOf(group)}`;
      const strategyType = getStrategyType(comboID);
      acc[strategyType] = (acc[strategyType] || { count: 0, groups: [] });
      acc[strategyType].count += group.length;
      acc[strategyType].groups.push({ comboID, count: group.length, group });
      return acc;
    }, {});
    console.log("Strategy type totals:", strategyTypeTotals);

    const topStrategyType = Object.entries(strategyTypeTotals)
      .sort((a, b) => b[1].count - a[1].count)[0]?.[0] || "Custom Strategy";
    console.log("Top strategy type:", topStrategyType);

    const mostActiveGroupInfo = strategyTypeTotals[topStrategyType]?.groups
      .sort((a, b) => b.count - a.count)[0];
    const mostActiveGroup = mostActiveGroupInfo?.group || [];
    const rawMostTradedStrategy = mostActiveGroupInfo?.comboID || "";

    const [StrategyName, strikesType, expiry] = formatStrategyDisplay(rawMostTradedStrategy, mostActiveGroup);

    // Pie chart data
    const strikeData = allTrades.reduce((acc, trade) => {
      const strike = trade.Strike_Price || "Unknown";
      if (!acc[strike]) {
        acc[strike] = { totalSize: 0, count: 0, trades: [], totalEntryValue: 0 };
      }
      acc[strike].totalSize += trade.Size || 0;
      acc[strike].count += 1;
      acc[strike].trades.push(trade);
      acc[strike].totalEntryValue += trade.Entry_Value || 0;
      return acc;
    }, {});

    const totalSizeSum = Object.values(strikeData).reduce((sum, { totalSize }) => sum + totalSize, 0);
    const sortedStrikes = Object.entries(strikeData).sort((a, b) => 
      sortOption === "count" ? b[1].count - a[1].count : b[1].totalEntryValue - a[1].totalEntryValue
    );
    const pieLabels = sortedStrikes.map(([label]) => label);
    const pieDataValues = sortedStrikes.map(([, data]) => sortOption === "count" ? data.count : data.totalEntryValue);
    const pieCounts = sortedStrikes.map(([, data]) => data.count);
    const piePercentages = sortedStrikes.map(([, data]) => 
      totalSizeSum > 0 ? ((data.totalSize / totalSizeSum) * 100).toFixed(1) : '0.0'
    );
    const pieHoverText = sortedStrikes.map(([label, data]) => [
      `Total Value: ${formatStrikeLabel(data.totalEntryValue)}`,
      `Count: ${formatStrikeLabel(data.count)} Strategies`
    ]);

    const colors = generateCustomGradientColors('#283254', '#868dba', pieDataValues);

    const pieData = {
      labels: pieLabels,
      datasets: [
        {
          data: pieDataValues,
          backgroundColor: colors,
          hoverBackgroundColor: colors,
          hoverOffset: 20,
        },
      ],
    };

    return {
      totalStrategies,
      totalVolumeBTC,
      totalEntryValue,
      StrategyName,
      strikesType,
      expiry,
      barData,
      pieData,
      pieHoverText,
      piePercentages,
      pieCounts,
      strikeData,
      topStrategies,
      validStrategies,
      allTrades,
    };
  }, [strategies, sortOption]);

  if (!analytics) {
    console.log("No analytics data, rendering empty state");
    return <div style={{ color: "white" }}>No strategies available.</div>;
  }

  const handleTotalStrategiesClick = () => {
    if (!onSegmentSelect || !analytics) {
      console.warn("Total Strategies: onSegmentSelect not provided or no analytics data");
      return;
    }
    const { comboGroups, blockTradeGroups } = groupStrategies(analytics.allTrades, strategies);
    const segmentData = {
      selectedSegment: {
        strategyType: "All Strategies",
        count: analytics.totalStrategies,
        comboGroups,
        blockTradeGroups,
      },
      contextId: "strategy/strategyoverview-bar",
    };
    console.log("Total Strategies clicked, sending segment:", segmentData);
    onSegmentSelect(segmentData);
  };

  const barOptions = {
    indexAxis: "y",
    layout: { padding: { left: 20, right: 40, top: 10, bottom: 10 } },
    plugins: {
      datalabels: {
        color: "rgb(144, 144, 144)",
        font: { family: "'Roboto', sans-serif", size: 10, weight: 'bold' },
        anchor: 'end',
        align: 'end',
        offset: 5,
        clip: false,
        formatter: (value) => {
          return typeof value === "number" ? formatStrikeLabel(value) : value;
        },
      },
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          color: 'rgb(144, 144, 144)',
          font: { family: "'Roboto', sans-serif", size: 10 },
          callback: (val) => {
            return typeof val === "number" ? formatStrikeLabel(val) : val;
          },
        },
        grid: { display: false },
      },
      y: {
        offset: true,
        ticks: {
          color: 'rgb(144, 144, 144)',
          font: { size: 10, family: "'Roboto', sans-serif" },
          padding: 10,
        },
        grid: { display: false },
      },
    },
    maintainAspectRatio: false,
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const selectedStrategy = analytics.topStrategies[index];
        if (selectedStrategy && onSegmentSelect) {
          const trades = selectedStrategy.groups.flat();
          const { comboGroups, blockTradeGroups } = groupStrategies(trades, strategies);
          const segmentData = {
            selectedSegment: {
              strategyType: selectedStrategy.name,
              count: selectedStrategy.count,
              comboGroups,
              blockTradeGroups,
            },
            contextId: "strategy/strategyoverview-bar",
          };
          console.log("Sending segment to onSegmentSelect from bar:", segmentData);
          onSegmentSelect(segmentData);
        } else {
          console.warn("Bar chart: No valid strategy or onSegmentSelect not provided", { selectedStrategy, onSegmentSelect });
        }
      } else {
        console.log("Bar chart: No elements clicked");
      }
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    layout: {
      padding: { top: 40, bottom: 40, left: 60, right: 60 },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: "#1b1c22",
        position: 'customPosition',
        displayColors: false,
        caretPadding: 8,
        caretSize: 0,
        borderRadius: 30,
        yAlign: 'bottom',
        titleFont: {
          family: "'Roboto', sans-serif",
          size: 13,
          weight: 'bold',
        },
        bodyFont: {
          family: "'Roboto', sans-serif",
          size: 12,
        },
        callbacks: {
          title: function(context) {
            return `Strike Price: ${formatStrikeLabel(context[0].label)}`;
          },
          label: function(context) {
            return analytics.pieHoverText[context.dataIndex];
          },
        },
      },
      datalabels: {
        color: '#aaa',
        formatter: (value, context) => {
          const label = formatStrikeLabel(context.chart.data.labels[context.dataIndex]);
          const count = analytics.pieCounts[context.dataIndex];
          const percentage = analytics.piePercentages[context.dataIndex];
          const totalEntryValue = formatStrikeLabel(analytics.strikeData[context.chart.data.labels[context.dataIndex]].totalEntryValue);
          
          if (sortOption === "count") {
            return [label, `${formatStrikeLabel(count)} (${percentage}%)`];
          } else {
            return [label, `${totalEntryValue} (${percentage}%)`];
          }
        },
        font: {
          family: "'Roboto', sans-serif",
          size: 9.5,
          weight: 'bold',
        },
        align: 'end',
        anchor: 'end',
        offset: 10,
        rotation: 0,
        clip: false,
        display: 'auto',
      },
    },
    elements: {
      arc: {
        borderWidth: 0,
      },
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const strike = analytics.pieData.labels[index];
        const trades = analytics.strikeData[strike]?.trades || [];
        const { comboGroups, blockTradeGroups } = groupStrategies(trades, strategies);
        const segmentData = {
          selectedSegment: {
            strike,
            comboGroups,
            blockTradeGroups,
          },
          contextId: "strategy/strategyoverview-pie",
        };
        console.log("Sending updated segment:", segmentData);
        onSegmentSelect?.(segmentData);
      } else {
        console.log("Pie chart: No elements clicked");
      }
    },
  };

  return (
    <div
      style={{
        width: 900,
        height: 420,
        color: "white",
        borderRadius: 8,
        fontFamily: "'Roboto', sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        margin: "auto",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "20% 56% 25%",
          alignItems: "center",
          width: "100%",
          gap: "1rem",
        }}
      >
        {/* Left Column sort button */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
          }}
        > 
          <div style={{
            display: "flex",
            color: "#666",
            fontFamily: "'Roboto', sans-serif",
            fontSize: "clamp(0.6rem, 0.9vw, 0.7rem)",
            justifyContent: "center",
            alignItems: "center",
            marginRight: "0.6rem"
          }}>
            Sort by
          </div>
          <button
            onClick={() => setSortOption(sortOption === "count" ? "totalEntryValue" : "count")}
            style={{
              backgroundColor: "#1b1c22",
              color: "white",
              border: "1px solid #41486d",
              borderRadius: "6px",
              padding: "6px 12px",
              fontFamily: "'Roboto', sans-serif",
              fontSize: "clamp(0.6rem, 1vw, 0.8rem)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "background-color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#2a2b33";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#1b1c22";
            }}
          >
            {sortOption === "count" ? "Distribution" : "Total Value"}
          </button>
        </div>

        {/* Middle Column (Main Content) */}
        <div
          style={{
            borderRadius: 8,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            gap: "1rem",
          }}
        >
          <button
            style={{
              ...Styles.mainMetric,
              cursor: "pointer",
              background: "none",
              border: "none",
              padding: 5,
              borderRadius: 10,
              transition: "background-color 0.2s ease",
            }}
            onClick={handleTotalStrategiesClick}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            title="View all strategies"
          >
            <div style={Styles.metricValue}>
              {analytics.totalStrategies}
              <div style={Styles.metricTitle}>Strategies</div>
            </div>
          </button>

          <div style={Styles.mainMetric}>
            <div style={Styles.metricValue}>
              {analytics.totalVolumeBTC}
              <div style={Styles.metricTitle}>Volume (BTC)</div>
            </div>
          </div>

          <div style={Styles.mainMetric}>
            <div style={Styles.metricValue}>
              {analytics.totalEntryValue}
              <div style={Styles.metricTitle}>Premium</div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div
          style={{
            textAlign: "center",
            color: "#ccc",
            fontWeight: "bold",
          }}
        >
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          flexGrow: 1,
          minHeight: 0,
          width: "100%",
        }}
      >
        <div
          style={{
            borderRadius: 8,
            minHeight: 250,
            display: "flex",
            padding: 'clamp(10px, 1.6vw, 12px)',
            flexDirection: "column",
            boxSizing: "border-box",
          }}
        >
          <div style={{ flexGrow: 1, maxHeight: 'clamp(310px, 20vw, 340px)' }}>
            <Bar data={analytics.barData} options={barOptions} />
          </div>
        </div>
        <div
          style={{
            borderRadius: 8,
            padding: 'clamp(10px, 5vw, 20px)',
            marginBottom: '30px',
            marginRight: '30px',
            minHeight: 250,
            display: "flex",
            flexDirection: "column",
            justifyContent: 'center',
            boxSizing: "border-box",
          }}
        >
          <div style={{ flexGrow: 1, maxHeight: 'clamp(280px, 10vw, 320px)' }}>
            <Pie data={analytics.pieData} options={pieOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}

const Styles = {
  mainMetric: {
    width: "100px",
    alignItems: "center",
    justifyContent: "center",
    display: "flex",
    flexDirection: "column",
    textAlign: "center",
    transition: 'background-color 0.2s ease',
  },
  metricTitle: {
    fontWeight: "normal",
    fontSize: "clamp(0.6rem, 1vw, 0.7rem)",
    color: "gray",
    fontFamily: "'Roboto', sans-serif",
  },
  metricValue: {
    whiteSpace: "pre-line",
    fontWeight: "bold",
    fontSize: "clamp(0.6rem, 1.5vw, 0.9rem)",
    color: "white",
    fontFamily: "'Roboto', sans-serif",
  },
  mainActiveStrategy: {
    marginBottom: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  activeMetricValue: {
    whiteSpace: "pre-line",
    fontWeight: 400,
    fontSize: "clamp(0.6rem, 1.5vw, 0.9rem)",
    color: "white",
    fontFamily: "'Roboto', sans-serif",
  },
  activeStrikeValue: {
    whiteSpace: "pre-line",
    fontWeight: "bold",
    fontSize: "0.75rem",
    color: "white",
    fontFamily: "'Roboto', sans-serif",
  },
};