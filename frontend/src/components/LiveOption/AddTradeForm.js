import React from 'react';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { formatExpirationLabel, formatStrikeLabel } from '../utils/chartHelpers';
import { parseInstrument, updateTradePricing } from './utils';
import { styles } from './styles';

export default function AddTradeForm({
  newTrade,
  setNewTrade,
  updateCurrentInstruments,
  availableExpirations,
  currentInstruments,
  anchorEl,
  setAnchorEl,
  expAnchorEl,
  setExpAnchorEl,
  handleAddTrade,
  chains,
  disabled = false,
}) {
  const uniqueStrikes = [...new Set(currentInstruments.map(i => i.Strike_Price))].sort((a, b) => a - b);

  return (
    <div style={styles.addBarContainer}>
      <div style={styles.inputContainer}>
        <Button
          variant="outlined"
          onClick={(e) => setExpAnchorEl(e.currentTarget)}
          style={{
            width: '100%',
            fontSize: 'clamp(0.6rem,0.6vw,0.7rem)',
            color: 'white',
            borderColor: '#444',
            backgroundColor: 'var(--color-background)',
            textTransform: 'none',
          }}
          aria-label="Select new trade expiration date"
          disabled={disabled}
        >
          {newTrade.expiration_date ? formatExpirationLabel(newTrade.expiration_date) : "Select Expiration"}
        </Button>
        <Popover
          open={Boolean(expAnchorEl)}
          anchorEl={expAnchorEl}
          onClose={() => setExpAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <div style={{
            maxHeight: '200px',
            width: 'clamp(120px, 10vw,150px)',
            overflow: 'auto',
            backgroundColor: 'transparent',
            textAlign: 'center',
            borderRadius: '0 0 10px 10px',
            border: '1px solid #444'
          }}>
            <Table stickyHeader size="small">
              <TableBody>
                {availableExpirations.map(exp => (
                  <TableRow key={exp}>
                    <TableCell
                      onClick={() => {
                        console.log('Selected expiration:', exp);
                        const updatedTrade = { ...newTrade, expiration_date: exp, instrument: '', strike_price: '', type: 'Call', price: '', iv_percent: '' };
                        setNewTrade(updatedTrade);
                        updateCurrentInstruments(exp);
                        setExpAnchorEl(null);
                      }}
                      style={{
                        cursor: 'pointer',
                        fontSize: 'clamp(0.6rem,0.6vw,0.7rem)',
                        color: 'white',
                        textAlign: 'center',
                        backgroundColor: 'transparent'
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
      </div>
      <div style={styles.inputContainer}>
        <Button
          variant="outlined"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          disabled={disabled || !newTrade.expiration_date || currentInstruments.length === 0}
          style={{
            width: '100%',
            fontSize: 'clamp(0.6rem,0.6vw,0.7rem)',
            color: 'white',
            borderColor: '#444',
            backgroundColor: 'var(--color-background)',
            textTransform: 'none',
          }}
          aria-label="Select new trade instrument"
        >
          {newTrade.strike_price ? `${formatStrikeLabel(newTrade.strike_price)}-${newTrade.type[0]}` : "Select Instrument"}
        </Button>
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <div style={{
            maxHeight: '200px',
            width: 'clamp(120px, 10vw,150px)',
            overflow: 'auto',
            backgroundColor: 'transparent',
            textAlign: 'center',
            borderRadius: '0 0 10px 10px',
            border: '1px solid #444'
          }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell style={{ color: '#aaa', fontSize: 'clamp(0.6rem,0.6vw,0.7rem)', textAlign: 'center' }}>Call</TableCell>
                  <TableCell style={{ color: '#aaa', fontSize: 'clamp(0.6rem,0.6vw,0.7rem)', textAlign: 'center' }}>Put</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {uniqueStrikes.map(strike => {
                  const callItem = currentInstruments.find(i => i.Strike_Price === strike && i.Option_Type.toLowerCase() === 'call');
                  const putItem = currentInstruments.find(i => i.Strike_Price === strike && i.Option_Type.toLowerCase() === 'put');
                  return (
                    <TableRow key={strike}>
                      <TableCell
                        onClick={callItem ? () => {
                          const inst = callItem.Instrument;
                          const { strike_price, type } = parseInstrument(inst);
                          const updatedTrade = updateTradePricing({ ...newTrade, instrument: inst, strike_price, type }, chains);
                          setNewTrade(updatedTrade);
                          setAnchorEl(null);
                        } : undefined}
                        style={{
                          cursor: callItem ? 'pointer' : 'default',
                          fontSize: 'clamp(0.5rem, 0.6vw,0.7rem)',
                          color: 'white',
                          textAlign: 'center',
                          backgroundColor: 'transparent'
                        }}
                      >
                        {callItem ? `${formatStrikeLabel(strike)}-C` : ''}
                      </TableCell>
                      <TableCell
                        onClick={putItem ? () => {
                          const inst = putItem.Instrument;
                          const { strike_price, type } = parseInstrument(inst);
                          const updatedTrade = updateTradePricing({ ...newTrade, instrument: inst, strike_price, type }, chains);
                          setNewTrade(updatedTrade);
                          setAnchorEl(null);
                        } : undefined}
                        style={{
                          cursor: putItem ? 'pointer' : 'default',
                          fontSize: 'clamp(0.5rem,0.6vw,0.7rem)',
                          color: 'white',
                          textAlign: 'center',
                          backgroundColor: 'transparent'
                        }}
                      >
                        {putItem ? `${formatStrikeLabel(strike)}-P` : ''}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Popover>
      </div>
      <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
        <div style={{ ...styles.inputContainer, flex: 1 }}>
          <span style={styles.inputLabel}>Side</span>
          <button
            onClick={() => {
              console.log('Toggling side to:', newTrade.side === 'Buy' ? 'Sell' : 'Buy');
              const updatedTrade = updateTradePricing({
                ...newTrade,
                side: newTrade.side === 'Buy' ? 'Sell' : 'Buy'
              }, chains);
              setNewTrade(updatedTrade);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-input-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                newTrade.side === 'Buy'
                  ? "rgba(36, 101, 57, 0.43)"
                  : "rgba(160, 37, 26, 0.44)";
            }}
            style={{
              ...styles.sideButton,
              backgroundColor:
                newTrade.side === 'Buy'
                  ? "rgba(36, 101, 57, 0.43)"
                  : "rgba(160, 37, 26, 0.44)",
              color: newTrade.side === 'Buy' ? 'white' : 'white'
            }}
            disabled={disabled}
          >
            {newTrade.side}
          </button>
        </div>
        <div style={{ ...styles.inputContainer, flex: 1 }}>
          <span style={styles.inputLabel}>Amount</span>
          <input
            type="number"
            value={newTrade.size}
            onChange={(e) => {
              setNewTrade({ ...newTrade, size: e.target.value });
            }}
            placeholder="Amount"
            min="0.1"
            step={0.1}
            style={styles.numberInput}
            disabled={disabled}
          />
        </div>
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        padding: '6px 8px',
        border: '1px solid #444',
        borderRadius: '6px',
        marginTop: '6px',
        backgroundColor: 'var(--color-background)'
      }}>
        <span style={{ color: 'white', fontSize: 'clamp(0.6rem,0.8vw,0.7rem)' }}>
          Price: {newTrade.price || ''} 
        </span>
        <span style={{ color: 'white', fontSize: 'clamp(0.6rem,0.8vw,0.7rem)' }}>
          IV: {newTrade.iv_percent || ''} 
        </span>
        <span style={{ color: 'white', fontSize: 'clamp(0.6rem,0.8vw,0.7rem)' }}>
          Underlying: {newTrade.underlying_price || ''} 
        </span>
      </div>
      <div style={styles.inputContainer}>
        <button
          onClick={handleAddTrade}
          style={styles.addButton}
          disabled={disabled}
        >
          + Add
        </button>
      </div>
    </div>
  );
}