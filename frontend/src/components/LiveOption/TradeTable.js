import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import { formatExpirationLabel, formatStrikeLabel } from '../utils/chartHelpers';
import { styles } from './styles';

export default function TradeTable({
  selectedOptions,
  handleEditTrade,
  handleToggleSelect,
  handleDeleteTrade,
  chains,
  setAnchorForRow,
  popoverAnchors,
  availableExpirations,
  btcPrice, // <- pass current BTC price from parent
}) {
  // inject defaults into every trade before rendering
  const tradesWithDefaults = selectedOptions.map((option, index) => {
    const chain = chains.find(
      (c) =>
        c.Expiration_Date === option.expiration_date &&
        c.Strike_Price === parseFloat(option.strike_price) &&
        c.Option_Type.toLowerCase() === option.type.toLowerCase()
    );
  
    const isBuy = option.side?.toLowerCase() === 'buy';
  
    const priceFromChain = chain ? (isBuy ? chain.Ask_Price_USD : chain.Bid_Price_USD) : 0;
    const ivFromChain = chain ? (isBuy ? chain.Ask_IV : chain.Bid_IV) : 0;
    const defaultUnderlying = btcPrice?.btcprice || 60000;
  

  
    return {
      ...option,
      price: priceFromChain,
      iv_percent: ivFromChain,
      underlying_price: option.underlying_price || defaultUnderlying,
    };
  });

  return (
    <div style={styles.mainSimulationContainer}>
      <table style={styles.tableContainer}>
        <thead>
          <tr style={styles.tableRowContainer}>
            <th style={styles.tableHeader}>Select</th>
            <th style={styles.tableHeader}>Exp. Date</th>
            <th style={styles.tableHeader}>Strike Price</th>
            <th style={styles.tableHeader}>Type</th>
            <th style={styles.tableHeader}>Side</th>
            <th style={styles.tableHeader}>Size</th>
            <th style={styles.tableHeader}>Price (USD)</th>
            <th style={styles.tableHeader}>IV (%)</th>
            <th style={styles.tableHeader}>BTC Price</th>
            <th style={styles.tableHeader}>Action</th>
          </tr>
        </thead>
        <tbody>
          {tradesWithDefaults.length > 0 ? (
            tradesWithDefaults.map((option, index) => {
              const rowStrikes =
                option.expiration_date && chains
                  ? chains
                      .filter((item) => {
                        const date = new Date(item.Expiration_Date);
                        return (
                          date.toISOString().split('T')[0] ===
                            option.expiration_date &&
                          item.Option_Type.toLowerCase() ===
                            option.type.toLowerCase()
                        );
                      })
                      .map((item) => item.Strike_Price)
                      .sort((a, b) => a - b)
                  : [];

              return (
                <tr key={index} style={styles.tableRowContainer}>
                  <td style={styles.tableCell}>
                    <input
                      type="checkbox"
                      checked={option.isSelected}
                      onChange={() => handleToggleSelect(index)}
                      style={styles.checkbox}
                      className="checkbox"
                    />
                  </td>
                  <td style={styles.tableCell}>
                    <Button
                      variant="outlined"
                      onClick={(e) =>
                        setAnchorForRow(index, 'expiration', e.currentTarget)
                      }
                      style={{
                        height: 'clamp(20px, 2.5vh, 25px)',
                        width: '100%',
                        fontSize: 'clamp(0.5rem,0.5vw,0.7rem)',
                        color: 'white',
                        borderColor: '#444',
                        backgroundColor: 'var(--color-background)',
                        textTransform: 'none',
                        padding: '6px',
                      }}
                      aria-label="Select expiration date"
                    >
                      {option.expiration_date
                        ? formatExpirationLabel(option.expiration_date)
                        : 'Select'}
                    </Button>
                    <Popover
                      open={Boolean(popoverAnchors[`${index}-expiration`])}
                      anchorEl={popoverAnchors[`${index}-expiration`]}
                      onClose={() =>
                        setAnchorForRow(index, 'expiration', null)
                      }
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'center',
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'center',
                      }}
                    >
                      <div
                        style={{
                          maxHeight: '200px',
                          width: '100%',
                          overflow: 'auto',
                          backgroundColor: 'transparent',
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          borderRadius: '0 0 10px 10px',
                          border: '1px solid #444',
                        }}
                      >
                        <Table stickyHeader size="small">
                          <TableBody>
                            {availableExpirations.map((exp) => (
                              <TableRow key={exp}>
                                <TableCell
                                  onClick={() => {
                                    console.log(
                                      `Editing expiration for trade ${index} to ${exp}`
                                    );
                                    handleEditTrade(
                                      index,
                                      'expiration_date',
                                      exp
                                    );
                                    handleEditTrade(index, 'strike_price', '');
                                    setAnchorForRow(index, 'expiration', null);
                                  }}
                                  style={{
                                    cursor: 'pointer',
                                    fontSize:
                                      'clamp(0.5rem,0.5vw,0.7rem)',
                                    color: 'white',
                                    textAlign: 'center',
                                    backgroundColor: 'transparent',
                                  }}
                                >
                                  {formatExpirationLabel(exp)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </Popover>
                  </td>
                  <td style={styles.tableCell}>
                    <Button
                      variant="outlined"
                      onClick={(e) =>
                        setAnchorForRow(index, 'strike', e.currentTarget)
                      }
                      disabled={!option.expiration_date || rowStrikes.length === 0}
                      style={{
                        height: 'clamp(20px, 2.5vh, 25px)',
                        width: '100%',
                        fontSize: 'clamp(0.58rem,0.6vw,0.7rem)',
                        color: 'white',
                        borderColor: '#444',
                        backgroundColor: 'var(--color-background)',
                        textTransform: 'none',
                        padding: '6px',
                      }}
                      aria-label="Select strike price"
                    >
                      {option.strike_price
                        ? formatStrikeLabel(option.strike_price)
                        : 'Select'}
                    </Button>
                    <Popover
                      open={Boolean(popoverAnchors[`${index}-strike`])}
                      anchorEl={popoverAnchors[`${index}-strike`]}
                      onClose={() => setAnchorForRow(index, 'strike', null)}
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'center',
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'center',
                      }}
                    >
                      <div
                        style={{
                          maxHeight: '200px',
                          width: '100%',
                          overflow: 'auto',
                          backgroundColor: 'transparent',
                          textAlign: 'center',
                          borderRadius: '0 0 10px 10px',
                          border: '1px solid #444',
                        }}
                      >
                        <Table stickyHeader size="small">
                          <TableBody>
                            {rowStrikes.map((s) => (
                              <TableRow key={s}>
                                <TableCell
                                  onClick={() => {
                                    console.log(
                                      `Editing strike price for trade ${index} to ${s}`
                                    );
                                    handleEditTrade(
                                      index,
                                      'strike_price',
                                      s
                                    );
                                    setAnchorForRow(index, 'strike', null);
                                  }}
                                  style={{
                                    cursor: 'pointer',
                                    fontSize:
                                      'clamp(0.6rem,0.6vw,0.7rem)',
                                    color: 'white',
                                    textAlign: 'center',
                                    backgroundColor: 'transparent',
                                  }}
                                >
                                  {formatStrikeLabel(s)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </Popover>
                  </td>
                  <td style={styles.tableCell}>
                    <button
                      onClick={() =>
                        handleEditTrade(index, 'type', option.type)
                      }
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          'var(--color-input-bg)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          'var(--color-background)';
                      }}
                      style={styles.cellButton}
                    >
                      {option.type}
                    </button>
                  </td>
                  <td style={styles.tableCell}>
                    <button
                      onClick={() =>
                        handleEditTrade(index, 'side', option.side)
                      }
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          'var(--color-input-bg)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          'var(--color-background)';
                      }}
                      style={styles.cellButton}
                    >
                      {option.side}
                    </button>
                  </td>
                  <td style={styles.tableCell}>
                    <input
                      type="number"
                      value={option.size}
                      onChange={(e) => {
                        console.log(
                          `Editing size for trade ${index} to ${e.target.value}`
                        );
                        handleEditTrade(index, 'size', e.target.value);
                      }}
                      min="0.1"
                      step={0.1}
                      style={styles.cellInput}
                    />
                  </td>
                  <td style={styles.tableCell}>
                    <input
                      type="number"
                      value={option.price}
                      onChange={(e) => {
                        console.log(
                          `Editing price for trade ${index} to ${e.target.value}`
                        );
                        handleEditTrade(index, 'price', e.target.value);
                      }}
                      step="0.01"
                      style={styles.cellInput}
                    />
                  </td>
                  <td style={styles.tableCell}>
                    <input
                      type="number"
                      value={option.iv_percent}
                      onChange={(e) => {
                        console.log(
                          `Editing IV percent for trade ${index} to ${e.target.value}`
                        );
                        handleEditTrade(index, 'iv_percent', e.target.value);
                      }}
                      step="0.01"
                      style={styles.cellInput}
                    />
                  </td>
                  <td style={styles.tableCell}>
                    <input
                      type="number"
                      value={option.underlying_price}
                      onChange={(e) => {
                        console.log(
                          `Editing underlying price for trade ${index} to ${e.target.value}`
                        );
                        handleEditTrade(
                          index,
                          'underlying_price',
                          e.target.value
                        );
                      }}
                      step="50"
                      style={styles.cellInput}
                    />
                  </td>
                  <td style={styles.tableCell}>
                    <img
                      src="/remove.png"
                      alt="Remove"
                      onClick={() => handleDeleteTrade(index)}
                      style={styles.deleteIcon}
                    />
                  </td>
                </tr>
              );
            })
          ) : (
            <tr style={styles.tableRowContainer}>
              <td colSpan={10} style={styles.noTradesCell}>
                No trades added yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
