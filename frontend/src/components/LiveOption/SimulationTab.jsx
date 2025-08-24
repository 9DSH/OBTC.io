import React, { useState, useEffect, useRef, useCallback } from 'react';
import AddTradeForm from './AddTradeForm';
import TradeTable from './TradeTable';
import ProfitCharts from '../ProfitCharts/ProfitCharts';
import { styles } from './styles';
import { updateTradePricing, 
        getSelectedTrades , 
        processSimulateData,
        generateUniqueId
        } from './utils';

// Key for localStorage
const STORAGE_KEY = 'simulationTabsState';


export default function SimulationTab({ chains, trades, btcPrice, simulateData }) {
  const savedState = localStorage.getItem(STORAGE_KEY);
  let initialTabs = [{ id: generateUniqueId(), name: 'Tab 1', selectedOptions: [], type: 'manual' }];
  let initialOpenedTabs = {};
  let initialActiveTabId = initialTabs[0].id;

  if (savedState) {
    const parsed = JSON.parse(savedState);
    initialTabs = parsed.tabs;
    initialOpenedTabs = parsed.openedTabs;
    initialActiveTabId = parsed.activeTabId || initialTabs[0]?.id;
  } else {
    initialOpenedTabs = { [initialTabs[0].id]: { tabId: initialTabs[0].id, trades: [], type: 'manual' } };
  }

  const [tabs, setTabs] = useState(initialTabs);
  const [activeTabId, setActiveTabId] = useState(initialActiveTabId);
  const [openedTabs, setOpenedTabs] = useState(initialOpenedTabs);
  const [hoveredTabId, setHoveredTabId] = useState(null);
  const [newTrade, setNewTrade] = useState({
    expiration_date: '',
    instrument: '',
    strike_price: '',
    type: 'Call',
    side: 'Buy',
    size: 1,
    price: '',
    iv_percent: '',
    underlying_price: btcPrice && btcPrice.btcprice && !isNaN(btcPrice.btcprice)
      ? btcPrice.btcprice.toFixed(2)
      : '60000.00',
    isSelected: true,
  });
  const [availableExpirations, setAvailableExpirations] = useState([]);
  const [currentInstruments, setCurrentInstruments] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [expAnchorEl, setExpAnchorEl] = useState(null);
  const [popoverAnchors, setPopoverAnchors] = useState({});
  const lastProcessedData = useRef(null);
  
  console.log("simulation chain: :", chains[0]|| "empty");
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs, openedTabs, activeTabId }));
  }, [tabs, openedTabs, activeTabId]);

  const setAnchorForRow = (index, field, anchorEl) => {
    setPopoverAnchors(prev => ({
      ...prev,
      [`${index}-${field}`]: anchorEl,
    }));
  };

  useEffect(() => {
    if (!chains || chains.length === 0) {
      setAvailableExpirations([]);
      return;
    }
    const expirations = [...new Set(chains.map(item => {
      const date = new Date(item.Expiration_Date);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    }).filter(Boolean))].sort();
    setAvailableExpirations(expirations);
  }, [chains]);

  const updateCurrentInstruments = useCallback((exp) => {
    if (!exp || !chains) {
      setCurrentInstruments([]);
      return;
    }
    const instruments = chains
      .filter(item => new Date(item.Expiration_Date).toISOString().split('T')[0] === exp)
      .sort((a, b) => a.Strike_Price - b.Strike_Price);
    setCurrentInstruments(instruments);
  }, [chains]);

  useEffect(() => {
    processSimulateData(simulateData, tabs, openedTabs, chains, btcPrice, setTabs, setOpenedTabs, setActiveTabId, setPopoverAnchors, lastProcessedData);
  }, [simulateData, btcPrice, chains]);

  useEffect(() => {
    return () => {
      lastProcessedData.current = null;
      console.log('Component unmounted, cleaned up lastProcessedData');
    };
  }, []);

  const addNewTab = useCallback(() => {
    const newTabId = generateUniqueId();
    const newTab = { id: newTabId, name: `Tab ${tabs.length + 1}`, selectedOptions: [], type: 'manual' };
    setTabs(prevTabs => [...prevTabs, newTab]);
    setActiveTabId(newTabId);
    setOpenedTabs(prev => ({
      ...prev,
      [newTabId]: { tabId: newTabId, trades: [], type: 'manual' }
    }));
    setPopoverAnchors({});
  }, [tabs.length]);

  const switchTab = useCallback((id) => {
    if (!tabs.find(tab => tab.id === id)) {
      console.warn(`Attempted to switch to non-existent tab ID ${id}`);
      return;
    }
    setActiveTabId(id);
    setPopoverAnchors({});
  }, [tabs]);

  const closeTab = useCallback((id) => {
    const closedTab = tabs.find(t => t.id === id);
    if (!closedTab) {
      console.warn(`Attempted to close non-existent tab ID ${id}`);
      return;
    }
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    setPopoverAnchors({});
    if (activeTabId === id) setActiveTabId(newTabs.length > 0 ? newTabs[0].id : null);

    setOpenedTabs(prev => {
      const newOpened = { ...prev };
      if (closedTab.type === 'simulation' && closedTab.simulateId) {
        delete newOpened[closedTab.simulateId];
      } else {
        delete newOpened[id];
      }
      return newOpened;
    });
  }, [tabs, activeTabId]);

  const handleAddTrade = useCallback(() => {
    if (!activeTabId) return;
    if (newTrade.expiration_date && newTrade.strike_price && newTrade.type && newTrade.price && newTrade.iv_percent && newTrade.underlying_price) {
      setTabs(prevTabs => {
        const updatedTabs = prevTabs.map(tab =>
          tab.id === activeTabId
            ? { ...tab, selectedOptions: [...tab.selectedOptions, { ...newTrade, isSelected: true }] }
            : tab
        );
        setOpenedTabs(prevOpened => {
          const newOpened = { ...prevOpened };
          const tab = updatedTabs.find(t => t.id === activeTabId);
          const tabKey = tab.type === 'simulation' ? tab.simulateId : activeTabId;
          if (newOpened[tabKey]) {
            newOpened[tabKey].trades = tab.selectedOptions;
          }
          return newOpened;
        });
        return updatedTabs;
      });
      setNewTrade({
        expiration_date: '',
        instrument: '',
        strike_price: '',
        type: 'Call',
        side: 'Buy',
        size: 1,
        price: '',
        iv_percent: '',
        underlying_price: btcPrice && btcPrice.btcprice && !isNaN(btcPrice.btcprice) ? btcPrice.btcprice.toString() : '60000',
        isSelected: true
      });
      setCurrentInstruments([]);
    }
  }, [activeTabId, newTrade, btcPrice]);

  const handleEditTrade = useCallback((index, field, value) => {
    if (!activeTabId) return;
    setTabs(prevTabs => {
      const tabIndex = prevTabs.findIndex(t => t.id === activeTabId);
      if (tabIndex === -1) return prevTabs;
      const updatedOptions = [...prevTabs[tabIndex].selectedOptions];
      let updatedTrade = { ...updatedOptions[index] };
      if (field === 'side') updatedTrade.side = updatedTrade.side === 'Buy' ? 'Sell' : 'Buy';
      else if (field === 'type') updatedTrade.type = updatedTrade.type === 'Call' ? 'Put' : 'Call';
      else updatedTrade[field] = value;
      if (['expiration_date', 'strike_price', 'type', 'side'].includes(field)) {
        updatedTrade = updateTradePricing(updatedTrade, chains);
      }
      updatedOptions[index] = updatedTrade;
      const newTabs = [...prevTabs];
      newTabs[tabIndex] = { ...newTabs[tabIndex], selectedOptions: updatedOptions };
      setOpenedTabs(prev => {
        const newOpened = { ...prev };
        const tab = newTabs.find(t => t.id === activeTabId);
        const tabKey = tab.type === 'simulation' ? tab.simulateId : activeTabId;
        if (newOpened[tabKey]) {
          newOpened[tabKey].trades = tab.selectedOptions;
        }
        return newOpened;
      });
      return newTabs;
    });
  }, [activeTabId, chains]);

  const handleToggleSelect = useCallback((index) => {
    if (!activeTabId) return;
    setTabs(prevTabs => {
      const tabIndex = prevTabs.findIndex(t => t.id === activeTabId);
      if (tabIndex === -1) return prevTabs;
      const updatedOptions = [...prevTabs[tabIndex].selectedOptions];
      updatedOptions[index] = {
        ...updatedOptions[index],
        isSelected: !updatedOptions[index].isSelected
      };
      const newTabs = [...prevTabs];
      newTabs[tabIndex] = { ...newTabs[tabIndex], selectedOptions: updatedOptions };
      return newTabs;
    });
  }, [activeTabId]);

  const handleDeleteTrade = useCallback((index) => {
    if (!activeTabId) return;
    setTabs(prevTabs => {
      const tabIndex = prevTabs.findIndex(t => t.id === activeTabId);
      if (tabIndex === -1) return prevTabs;
      const updatedOptions = prevTabs[tabIndex].selectedOptions.filter((_, i) => i !== index);
      const newTabs = [...prevTabs];
      newTabs[tabIndex] = { ...newTabs[tabIndex], selectedOptions: updatedOptions };
      setOpenedTabs(prev => {
        const newOpened = { ...prev };
        const tab = newTabs.find(t => t.id === activeTabId);
        const tabKey = tab.type === 'simulation' ? tab.simulateId : activeTabId;
        if (newOpened[tabKey]) {
          newOpened[tabKey].trades = tab.selectedOptions;
        }
        return newOpened;
      });
      return newTabs;
    });
    setPopoverAnchors(prev => {
      const newAnchors = { ...prev };
      delete newAnchors[`${index}-expiration`];
      delete newAnchors[`${index}-strike`];
      return newAnchors;
    });
  }, [activeTabId]);

  const uniqueTabs = tabs.filter((tab, index, self) => 
    self.findIndex(t => t.id === tab.id) === index
  );

  return (
    <div style={styles.mainContainer}>
      {(!chains || chains.length === 0) && <div style={styles.noDataContainer}>No options chain data available.</div>}
      {chains && chains.length > 0 && (
        <>
          <div style={styles.simulationWrapper}>
            <AddTradeForm
              newTrade={newTrade}
              setNewTrade={setNewTrade}
              updateCurrentInstruments={updateCurrentInstruments}
              availableExpirations={availableExpirations}
              currentInstruments={currentInstruments}
              anchorEl={anchorEl}
              setAnchorEl={setAnchorEl}
              expAnchorEl={expAnchorEl}
              setExpAnchorEl={setExpAnchorEl}
              handleAddTrade={handleAddTrade}
              chains={chains}
              disabled={!activeTabId}
            />
            <div style={styles.tableWrapper}>
              <div style={styles.tabSectionContainer}>
                <div style={styles.tabBarWrapper}>
                  <div style={styles.tabBar}>
                    {uniqueTabs.map(tab => (
                      <div
                        key={tab.id}
                        style={activeTabId === tab.id ? styles.activeTab : styles.tab}
                        onClick={() => switchTab(tab.id)}
                        onMouseEnter={() => setHoveredTabId(tab.id)}
                        onMouseLeave={() => setHoveredTabId(null)}
                      >
                        <div style={styles.tabLabel}>
                          {tab.name}
                        </div>
                        <span
                          style={{
                            ...styles.closeTabButton,
                            ...(hoveredTabId === tab.id && styles.tabCloseButtonOnHover),
                          }}
                          onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                        >x</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button style={styles.addTabButton} onClick={addNewTab}>+</button>
              </div>
              {activeTabId ? (
                <TradeTable
                  selectedOptions={uniqueTabs.find(t => t.id === activeTabId)?.selectedOptions || []}
                  handleEditTrade={handleEditTrade}
                  handleToggleSelect={handleToggleSelect}
                  handleDeleteTrade={handleDeleteTrade}
                  chains={chains}
                  setAnchorForRow={setAnchorForRow}
                  popoverAnchors={popoverAnchors}
                  availableExpirations={availableExpirations}
                />
              ) : <div style={styles.noDataContainer}>No tabs open</div>}
            </div>
          </div>
          <div style={styles.chartContainer}>
            {activeTabId && (
              <ProfitCharts
                selectedTrades={getSelectedTrades(uniqueTabs.find(t => t.id === activeTabId)?.selectedOptions || [], chains, btcPrice)}
                showModeToggle={true}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}