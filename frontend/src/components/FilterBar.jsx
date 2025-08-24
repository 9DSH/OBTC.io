import {
  formatExpirationLabel,
  formatStrikeLabel,
} from "./utils/chartHelpers";
import React, { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import DoneIcon from '@mui/icons-material/Done';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Tooltip from '@mui/material/Tooltip';
import { createPortal } from 'react-dom';
import {
  TextField,
  MenuItem,
  Button,
  Grid,
  InputLabel,
  Select,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Slider,
  Popover,
  IconButton,
  Box,
} from '@mui/material';
import './FilterBar.css';

const ITEM_HEIGHT = 40;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 5 + ITEM_PADDING_TOP,
      width: 'auto',
      borderRadius: '0 0 10px 10px',
      backgroundColor: 'var(--color-background-bar)',
      color: '#fff',
    },
  },
};

export const DEFAULT_FILTERS = {
  Entry_Date: { start: null, end: null },
  Side: '',
  Option_Type: '',
  Size: [0.1, 2000],
  Entry_Value: [0, 100000000],
  Strike_Price: [],
  Expiration_Date: [],
};

const DatePickerPortal = ({ children }) => {
  const portalRef = useRef(null);

  useEffect(() => {
    let portalRoot = document.getElementById('datepicker-portal');
    if (!portalRoot) {
      portalRoot = document.createElement('div');
      portalRoot.setAttribute('id', 'datepicker-portal');
      document.body.appendChild(portalRoot);
    }
    portalRef.current = portalRoot;

    return () => {
      if (portalRef.current && document.body.contains(portalRef.current)) {
        document.body.removeChild(portalRef.current);
      }
    };
  }, []);

  return portalRef.current ? createPortal(children, portalRef.current) : null;
};

// Helper function to format numbers with K, M, B
const formatValue = (value) => {
  if (value >= 1000000000) {
    return (value / 1000000000).toFixed(1) + 'B';
  }
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toFixed(1);
};

export default function FilterBar({ filters, setFilters, options, data }) {
  const initialMaxSize = options.maxSize || DEFAULT_FILTERS.Size[1];
  const initialMaxEntryValue = options.maxEntryValue || DEFAULT_FILTERS.Entry_Value[1];
  
  const getInitialLocalState = () => {
    return {
      ...filters,
      Entry_Date: filters.Entry_Date && typeof filters.Entry_Date === 'object'
        ? {
            start: filters.Entry_Date.start ? new Date(filters.Entry_Date.start) : null,
            end: filters.Entry_Date.end ? new Date(filters.Entry_Date.end) : null,
          }
        : { start: filters.Entry_Date ? new Date(filters.Entry_Date) : null, end: null },
      Size: filters.Size || [0.1, initialMaxSize],
      Entry_Value: filters.Entry_Value || [0, initialMaxEntryValue]
    };
  };

  const [local, setLocal] = useState(getInitialLocalState);

  // Set the default filter state based on the calculated maximums from parent
  useEffect(() => {
    setLocal(prevLocal => {
      // Check if the current filter values are the old defaults
      const isDefaultSize = prevLocal.Size[1] === DEFAULT_FILTERS.Size[1];
      const isDefaultEntryValue = prevLocal.Entry_Value[1] === DEFAULT_FILTERS.Entry_Value[1];

      // Update only if they are the old defaults
      if (isDefaultSize || isDefaultEntryValue) {
        return {
          ...prevLocal,
          Size: isDefaultSize ? [prevLocal.Size[0], options.maxSize] : prevLocal.Size,
          Entry_Value: isDefaultEntryValue ? [prevLocal.Entry_Value[0], options.maxEntryValue] : prevLocal.Entry_Value,
        };
      }
      return prevLocal;
    });
  }, [options.maxSize, options.maxEntryValue, setLocal]);

  const handleReset = () => {
    const newFilters = {
      ...DEFAULT_FILTERS,
      Size: [0.1, options.maxSize],
      Entry_Value: [0, options.maxEntryValue]
    };
    setLocal(newFilters);
    setFilters(newFilters);
  };

  const handleChange = (e) =>
    setLocal((l) => ({ ...l, [e.target.name]: e.target.value }));

  const handleMulti = (e) => {
    const { name, value } = e.target;
    setLocal((l) => ({
      ...l,
      [name]: typeof value === 'string' ? value.split(',') : value,
    }));
  };

  const handleDateRange = (dates) => {
    const [start, end] = dates;
    setLocal((l) => ({
      ...l,
      Entry_Date: {
        start: start || l.Entry_Date.start,
        end: end || l.Entry_Date.end,
      },
    }));
  };

  const handleSizeSlider = (_, v) =>
    setLocal((l) => ({ ...l, Size: v }));

  const handleEntrySlider = (_, v) =>
    setLocal((l) => ({ ...l, Entry_Value: v }));

  const handleApply = () => {
    let f = { ...local };
    if (f.Entry_Date.start || f.Entry_Date.end) {
      const start = f.Entry_Date.start instanceof Date && !isNaN(f.Entry_Date.start.getTime())
        ? new Date(f.Entry_Date.start)
        : null;
      const end = f.Entry_Date.end instanceof Date && !isNaN(f.Entry_Date.end.getTime())
        ? new Date(f.Entry_Date.end)
        : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      if (start && end && end < start) {
        f.Entry_Date = {
          start: end.toISOString(),
          end: start.toISOString(),
        };
      } else {
        f.Entry_Date = {
          start: start ? start.toISOString() : null,
          end: end ? end.toISOString() : null,
        };
      }
      if (!f.Entry_Date.start && !f.Entry_Date.end) {
        f.Entry_Date = null;
      }
    } else {
      f.Entry_Date = null;
    }
    setFilters(f);
  };

  const formatDateDisplay = (date) => {
    if (!date || isNaN(new Date(date).getTime())) return '';
    return formatExpirationLabel(date);
  };

  const dateRangeDisplay = () => {
    const { start, end } = local.Entry_Date;
    if (!start && !end) return 'Select date range';
    if (start && !end) return `${formatDateDisplay(start)} - ...`;
    if (!start && end) return `... - ${formatDateDisplay(end)}`;
    return `${formatDateDisplay(start)} - ${formatDateDisplay(end)}`;
  };

  const labelStyle = {
    width: '100%',
    color: '#bbb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    fontSize: 'clamp(0.5rem, 0.7vw, 0.6rem)',
    paddingBottom: '2px',
    textAlign: 'center',
  };

  const summaryText = (sel, isExpiration = false) => {
    if (!sel.length) return <em style={{ color: '#666' }}>No selection</em>;
    if (sel.length > 1) return `${sel.length} selected`;
    return sel.map(item => isExpiration ? formatExpirationLabel(item) : formatStrikeLabel(item)).join(', ');
  };

  const [sizeAnchor, setSizeAnchor] = useState(null);
  const [entryAnchor, setEntryAnchor] = useState(null);

  const iconButtonSize = 'clamp(1rem, 2vw, 2.1rem)';

  return (
    <Box sx={{
      width: '90%',
      maxWidth: '1200px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      margin: '0 auto',
      mt: 3.5,
      mb: 1,
      padding: '0 clamp(0.5rem, 2vw, 1rem)',
      position: 'relative',
    }}>

      <Box sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '95vw',
      }}>
        <Grid
          container
          spacing={1}
          justifyContent="center"
          alignItems="center"
          sx={{
            backgroundColor: 'rgba(27, 28, 34, 0.7)',
            backdropFilter: 'blur(10px)',
            px: 'clamp(0.5rem, 2vw, 0.5rem)',
            py: 'clamp(0.2rem, 0.5vh, 0.3rem)',
            borderRadius: 1.5,
            boxShadow: 2,
            border: '1px dotted rgba(91,83,83,0.7)',
            flexWrap: 'nowrap',
          }}
        >
          {/* Entry Date Range */}
          <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <InputLabel sx={labelStyle}>Entry Date Range</InputLabel>
            <DatePicker
              selectsRange
              startDate={local.Entry_Date.start}
              endDate={local.Entry_Date.end}
              onChange={handleDateRange}
              dateFormat="d MMM yy"
              placeholderText="Select date range"
              shouldCloseOnSelect={false}
              popperContainer={({ children }) => (
                <DatePickerPortal>
                  <div style={{ zIndex: 1000000 }}>{children}</div>
                </DatePickerPortal>
              )}
              customInput={
                <TextField
                  fullWidth
                  value={dateRangeDisplay()}
                  placeholder="Select date range"
                  sx={{
                    input: {
                      color: '#fff',
                      background: '#121212',
                      fontSize: 'clamp(9px, 1vw, 11px)',
                      '&::placeholder': { fontSize: 'clamp(0.4rem, 1.1vw, 0.7rem)', opacity: 0.6 },
                      padding: 'clamp(0.2rem, 0.5vw, 0.4rem) clamp(0.5rem, 1vw, 0.8rem)',
                      height: 'clamp(10px, 0.6vw, 14px)',
                    },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary)' },
                    '& .MuiInputBase-root': { 
                      height: 'clamp(28px, 3.5vw, 32px)',
                      display: 'flex',
                      alignItems: 'center',
                    },
                  }}
                />
              }
            />
          </Grid>

          {/* Side */}
          <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <InputLabel sx={labelStyle}>Side</InputLabel>
            <Select
              name="Side"
              value={local.Side}
              onChange={handleChange}
              displayEmpty
              fullWidth
              sx={{
                color: '#fff',
                fontSize: 'clamp(9px, 1vw, 11px)',
                '.MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary)' },
                '.MuiSelect-icon': { color: '#bbb' },
                '& .MuiSelect-select': { 
                  padding: 'clamp(0.2rem, 0.5vw, 0.4rem) clamp(0.5rem, 1vw, 0.8rem)',
                  height: 'clamp(1px, 1vw, 1px)',
                  display: 'flex',
                  alignItems: 'center',
                },
                height: 'clamp(28px, 3.5vw, 32px)',
                minWidth: 'clamp(40px, 5vw, 75px)',
              }}
              MenuProps={MenuProps}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="BUY">BUY</MenuItem>
              <MenuItem value="SELL">SELL</MenuItem>
            </Select>
          </Grid>

          {/* Type */}
          <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <InputLabel sx={labelStyle}>Type</InputLabel>
            <Select
              name="Option_Type"
              value={local.Option_Type}
              onChange={handleChange}
              displayEmpty
              fullWidth
              sx={{
                color: '#fff',
                fontSize:'clamp(9px, 1vw, 11px)',
                '.MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary)' },
                '.MuiSelect-icon': { color: '#bbb' },
                '& .MuiSelect-select': { 
                  padding: 'clamp(0.2rem, 0.5vw, 0.4rem) clamp(0.5rem, 1vw, 0.8rem)',
                  height: 'clamp(1px,1vw, 1px)',
                  display: 'flex',
                  alignItems: 'center',
                },
                height: 'clamp(28px, 3.5vw, 32px)',
                minWidth: 'clamp(40px, 5vw, 75px)',
              }}
              MenuProps={MenuProps}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Call">CALL</MenuItem>
              <MenuItem value="Put">PUT</MenuItem>
            </Select>
          </Grid>

          {/* Size Slider */}
          <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <InputLabel sx={labelStyle}>Size</InputLabel>
            <Button
              variant="outlined"
              onClick={(e) => setSizeAnchor(e.currentTarget)}
              fullWidth
              sx={{
                color: '#ccc',
                borderColor: '#444',
                fontSize: 'clamp(9px, 1vw, 11px)',
                padding: 'clamp(0.2rem, 0.5vw, 0.4rem) clamp(0.2rem, 0.5vw, 0.4rem)',
                height: 'clamp(28px, 3.5vw, 32px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {formatValue(local.Size[0])} - {formatValue(local.Size[1])}
            </Button>
            <Popover
              open={Boolean(sizeAnchor)}
              anchorEl={sizeAnchor}
              onClose={() => setSizeAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              transformOrigin={{ vertical: 'top', horizontal: 'center'}}
              PaperProps={{ sx: { background: 'rgba(27, 28, 34, 0.75)', backdropFilter: 'blur(10px)', boxShadow: 5, width: 'clamp(150px, 15vw, 200px)' } }}
            >
              <Box sx={{ pl: 3.5, pt: 3, pr: 3.5, pb: 1}}>
                <Slider
                  value={local.Size}
                  onChange={handleSizeSlider}
                  min={0.1}
                  max={options.maxSize || DEFAULT_FILTERS.Size[1]}
                  step={1}
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatValue}
                  sx={{
                    color: 'var(--color-primary)',
                    '& .MuiSlider-thumb': { width: 'clamp(8px, 1vw, 12px)', height: 'clamp(8px, 1vw, 12px)', border: '2px solid #fff' },
                    '& .MuiSlider-track': { height: 'clamp(1px, 0.15vw, 1.2px)' },
                    '& .MuiSlider-valueLabel': { bgcolor: 'var(--color-primary)', fontSize: 'clamp(0.6rem, 1vw, 0.75rem)', top: 'clamp(-0.5rem, -0.75vw, -8px)' },
                  }}
                />
              </Box>
            </Popover>
          </Grid>

          {/* Entry Value Slider */}
          <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <InputLabel sx={labelStyle}>Entry Value</InputLabel>
            <Button
              variant="outlined"
              onClick={(e) => setEntryAnchor(e.currentTarget)}
              fullWidth
              sx={{
                color: '#ccc',
                borderColor: '#444',
                fontSize: 'clamp(9px, 1vw, 11px)',
                padding: 'clamp(0.2rem, 0.5vw, 0.4rem) clamp(0.2rem, 0.5vw, 0.4rem)',
                height: 'clamp(28px, 3.5vw, 32px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {formatValue(local.Entry_Value[0])} - {formatValue(local.Entry_Value[1])}
            </Button>
            <Popover
              open={Boolean(entryAnchor)}
              anchorEl={entryAnchor}
              onClose={() => setEntryAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              transformOrigin={{ vertical: 'top', horizontal: 'center' }}
              PaperProps={{ sx: { background: 'rgba(27, 28, 34, 0.75)', backdropFilter: 'blur(10px)', boxShadow: 5, width: 'clamp(150px, 15vw, 200px)' } }}
            >
              <Box sx={{ pl: 3.5, pt: 3, pr: 3.5, pb: 1 }}>
                <Slider
                  value={local.Entry_Value}
                  onChange={handleEntrySlider}
                  min={0}
                  max={options.maxEntryValue || DEFAULT_FILTERS.Entry_Value[1]}
                  step={1000}
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatValue}
                  sx={{
                    color: 'var(--color-primary)',
                    '& .MuiSlider-thumb': { width: 'clamp(8px, 1vw, 12px)', height: 'clamp(8px, 1vw, 12px)', border: '1px solid #fff' },
                    '& .MuiSlider-track': { height: 'clamp(1px, 0.15vw, 1.2px)' },
                    '& .MuiSlider-valueLabel': { bgcolor: 'var(--color-primary)', fontSize: 'clamp(0.6rem, 1vw, 0.75rem)', top: 'clamp(-0.5rem, -0.75vw, -8px)' },
                  }}
                />
              </Box>
            </Popover>
          </Grid>

          {/* Strike Price */}
          <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <InputLabel sx={labelStyle}>Strike Price</InputLabel>
            <Select
              multiple
              name="Strike_Price"
              value={local.Strike_Price}
              onChange={handleMulti}
              input={<OutlinedInput />}
              renderValue={(sel) => summaryText(sel, false)}
              MenuProps={MenuProps}
              fullWidth
              sx={{
                color: '#fff',
                fontSize: 'clamp(9px, 1vw, 11px)',
                '.MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary)' },
                '.MuiSelect-icon': { color: '#bbb' },
                '& .MuiSelect-select': { 
                  padding: 'clamp(0.2rem, 0.5vw, 0.4rem) clamp(0.5rem, 1vw, 0.8rem)',
                  height: 'clamp(1px, 1vw, 1px)',
                  display: 'flex',
                  alignItems: 'center',
                  textOverflow: 'ellipsis',
                },
                height: 'clamp(28px, 3.5vw, 32px)',
                minWidth: 'clamp(100px, 5vw, 140px)',
              }}
            >
              {(options.strikePrices || []).map((p) => (
                <MenuItem key={p} value={p}>
                  <Checkbox checked={local.Strike_Price.includes(p)} />
                  <ListItemText primary={formatStrikeLabel(p)} />
                </MenuItem>
              ))}
            </Select>
          </Grid>

          {/* Expiration Date */}
          <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <InputLabel sx={labelStyle}>Expiration Date</InputLabel>
            <Select
              multiple
              name="Expiration_Date"
              value={local.Expiration_Date}
              onChange={handleMulti}
              input={<OutlinedInput />}
              renderValue={(sel) => summaryText(sel, true)}
              MenuProps={MenuProps}
              fullWidth
              sx={{
                color: '#fff',
                fontSize: 'clamp(9px, 1vw, 11px)',
                '.MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-primary)' },
                '.MuiSelect-icon': { color: '#bbb' },
                '& .MuiSelect-select': { 
                  padding: 'clamp(0.2rem, 0.5vw, 0.4rem) clamp(0.5rem, 1vw, 0.8rem)',
                  height: 'clamp(1px, 1vw, 1px)',
                  display: 'flex',
                  alignItems: 'center',
                  textOverflow: 'ellipsis',
                },
                height: 'clamp(28px, 3.5vw, 32px)',
                minWidth: 'clamp(100px, 5vw, 140px)',
              }}
            >
              {(options.expirationDates || []).map((d) => (
                <MenuItem key={d} value={d}>
                  <Checkbox checked={local.Expiration_Date.includes(d)} />
                  <ListItemText primary={formatExpirationLabel(d)} />
                </MenuItem>
              ))}
            </Select>
          </Grid>
        </Grid>

        {/* Reset / Apply Buttons */}
        <Box
          sx={{
            ml: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Tooltip
            title="Reset filters"
            arrow
            placement="right"
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: 'var(--color-primary)',
                  color: '#fff',
                  fontSize: 12,
                },
              },
              arrow: {
                sx: {
                  color: 'var(--color-primary)',
                },
              },
            }}
          >
            <IconButton
              color="secondary"
              onClick={handleReset}
              sx={{
                backgroundColor: 'rgba(27, 28, 34, 0.7)',
                '&:hover': { backgroundColor: 'rgb(54, 56, 63)' },
                backdropFilter: 'blur(10px)',
                width: iconButtonSize,
                height: iconButtonSize,
                borderRadius: '20%',
                border: '1px dotted rgba(91, 83, 83, 0.7)',
              }}
            >
              <RestartAltIcon sx={{ color: '#fff', fontSize: 'clamp(1rem, 1vw, 2rem)' }} />
            </IconButton>
          </Tooltip>

          <Tooltip
            title="Apply filters"
            arrow
            placement="right"
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: 'var(--color-primary)',
                  color: '#fff',
                  fontSize: 12,
                },
              },
              arrow: {
                sx: {
                  color: 'var(--color-primary)',
                },
              },
            }}
          >
            <IconButton
              color="primary"
              onClick={handleApply}
              sx={{
                backgroundColor: 'rgba(27, 28, 34, 0.7)',
                '&:hover': { backgroundColor: 'rgb(54, 56, 63)' },
                backdropFilter: 'blur(10px)',
                width: iconButtonSize,
                height: iconButtonSize,
                borderRadius: '20%',
                border: '1px dotted rgba(91, 83, 83, 0.7)',
              }}
            >
              <DoneIcon sx={{ color: '#fff', fontSize: 'clamp(1rem, 1vw, 2rem)' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}