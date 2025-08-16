import React, { useMemo } from 'react';
import { useTable, useSortBy } from 'react-table';
import dayjs from 'dayjs';

const numericColumns = [
  'Strike_Price',
  'Size',
  'Price_BTC',
  'Price_USD',
  'Entry_Value',
  'Underlying_Price',
  'IV_Percent',
];

const columnClamp = {
  Instrument: 'clamp(100px, 16vw, 200px)',
  Entry_Date: 'clamp(80px, 12vw, 100px)',
  Side: 'clamp(40px, 5vw, 50px)',
  Option_Type: 'clamp(50px, 8vw, 60px)',
  Size: 'clamp(30px, 5vw, 40px)',
  Price_BTC: 'clamp(60px, 10vw, 70px)',
  Price_USD: 'clamp(60px, 10vw, 70px)',
  Entry_Value: 'clamp(70px, 10vw, 90px)',
  IV_Percent: 'clamp(40px, 8vw, 50px)',
  Strike_Price: 'clamp(80px, 9vw, 90px)',
  Underlying_Price: 'clamp(80px, 9vw, 90px)',
  Expiration_Date: 'clamp(90px, 10vw, 120px)',
};

function formatNumber(value, decimals = 1) {
  if (value == null || value === '') return '-';
  const n = Number(value);
  if (isNaN(n)) return '-';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatLargeNumber(num, decimals = 1, forceKNoDecimal = false) {
  if (num == null || num === '') return '-';
  const n = Number(num);
  if (isNaN(n)) return '-';
  const absNum = Math.abs(n);

  const base = {
    fontWeight: 600,
    fontSize: 'clamp(8px, 1.2vw, 11px)',
    marginLeft: '0.5em',
    background: 'linear-gradient(45deg, #e63946, #d90429, #a4161a)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };
  const styles = {
    K: { ...base, background: 'linear-gradient(45deg, #ffc300, #ff5733)' },
    M: { ...base, background: 'linear-gradient(45deg, #ff006e, #d62828)' },
    B: { ...base, background: 'linear-gradient(45deg, #00b894, #00cec9)' },
  };

  if (forceKNoDecimal && absNum >= 1e3) {
    return (
      <>
        {Math.round(n / 1e3)}
        <span style={styles.K}>K</span>
      </>
    );
  }
  if (absNum >= 1e9) {
    return (
      <>
        {(n / 1e9).toFixed(decimals)}
        <span style={styles.B}>B</span>
      </>
    );
  }
  if (absNum >= 1e6) {
    return (
      <>
        {(n / 1e6).toFixed(decimals)}
        <span style={styles.M}>M</span>
      </>
    );
  }
  if (absNum >= 1e3) {
    return (
      <>
        {(n / 1e3).toFixed(decimals)}
        <span style={styles.K}>K</span>
      </>
    );
  }
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function toValidDate(val) {
  const d = new Date(val);
  return isNaN(d) ? new Date('1900-01-01') : d;
}

const numericSortType = (rowA, rowB, columnId) => {
  const a = Number(rowA.values[columnId]) || 0;
  const b = Number(rowB.values[columnId]) || 0;
  return a > b ? 1 : a < b ? -1 : 0;
};

const dateSortType = (rowA, rowB, columnId) => {
  const a = rowA.values[columnId].getTime();
  const b = rowB.values[columnId].getTime();
  return a > b ? 1 : a < b ? -1 : 0;
};

export default function TradesTable({ data = [], filters }) {
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const itemDate = item.Entry_Date ? new Date(item.Entry_Date) : null;
      if (!itemDate || isNaN(itemDate.getTime())) return true;
      return Object.entries(filters).every(([key, value]) => {
        if (
          value == null ||
          (Array.isArray(value) && value.length === 0) ||
          value === ''
        ) {
          return true;
        }
        if (key === 'Entry_Date') {
          if (!value || (!value.start && !value.end)) return true;
          const start = value.start ? new Date(value.start) : null;
          const end = value.end ? new Date(value.end) : null;
          if (start && isNaN(start.getTime())) return true;
          if (end && isNaN(end.getTime())) return true;
          return (!start || itemDate >= start) && (!end || itemDate <= end);
        }
        if ((key === 'Size' || key === 'Entry_Value') && Array.isArray(value)) {
          const [min, max] = value.map(Number);
          const val = Number(item[key]);
          return !isNaN(val) && val >= min && val <= max;
        }
        if (Array.isArray(value)) {
          return value.includes(item[key]);
        }
        return String(item[key]) === value;
      });
    });
  }, [data, filters]);

  const formatEntry = (v) =>
    v ? dayjs(v).format('YYYY MMM DD HH:mm:ss').toUpperCase() : '-';
  const formatExpire = (v) =>
    v ? dayjs(v).format('YYYY MMM DD').toUpperCase() : '-';

  const columns = useMemo(
    () => [
      {
        Header: 'Instrument',
        accessor: 'Instrument',
        minWidth: columnClamp.Instrument,
        sortType: 'alphanumeric',
      },
      {
        Header: 'Entry Date',
        accessor: (row) => toValidDate(row.Entry_Date),
        id: 'Entry_Date',
        minWidth: columnClamp.Entry_Date,
        Cell: ({ row }) => <span>{formatEntry(row.original.Entry_Date)}</span>,
        sortType: dateSortType,
      },
      {
        Header: 'Expiration',
        accessor: (row) => toValidDate(row.Expiration_Date),
        id: 'Expiration_Date',
        minWidth: columnClamp.Expiration_Date,
        Cell: ({ row }) => <span>{formatExpire(row.original.Expiration_Date)}</span>,
        sortType: dateSortType,
      },
      {
        Header: 'Side',
        accessor: 'Side',
        minWidth: columnClamp.Side,
        sortType: 'alphanumeric',
      },
      {
        Header: 'Type',
        accessor: 'Option_Type',
        minWidth: columnClamp.Option_Type,
        sortType: 'alphanumeric',
      },
      ...numericColumns.map((col) => ({
        Header: col.replace(/_/g, ' '),
        accessor: col,
        minWidth: columnClamp[col],
        Cell: ({ value }) => {
          if (col === 'Price_BTC' || col === 'Size') {
            return value ?? '-';
          }
          if (col === 'Strike_Price') {
            return formatLargeNumber(value, 0, true);
          }
          if (col === 'Price_USD' || col === 'Entry_Value') {
            return formatLargeNumber(value, 1);
          }
          return formatNumber(value, 0);
        },
        sortType: numericSortType,
      })),
    ],
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state: { sortBy },
  } = useTable(
    {
      columns,
      data: filteredData,
      autoResetSortBy: false,
      initialState: {
        sortBy: [{ id: 'Entry_Date', desc: true }],
      },
      disableMultiSort: false,
    },
    useSortBy
  );

  const visible = rows.slice(0, 10);

  return (
    <div style={{ marginTop: '1rem'  }}>
      <div
        style={{
          overflowX: 'auto',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 0.5rem',
          marginTop: '1rem',
        }}
      >
        <table
          {...getTableProps()}
          style={{
            display: 'inline-table',
            borderCollapse: 'separate',
            borderSpacing: 0,
            tableLayout: 'auto', // Changed to auto for responsiveness
            backgroundColor: '#1b1c22',
            borderRadius: '12px',
            boxShadow: '0 6px 16px rgba(27,28,34,0.8)',
            border: '1px solid #3a3b44',
            overflow: 'hidden',
            width: '100%',
            maxWidth: '100%',
          }}
        >
          <thead>
            {headerGroups.map((hg) => (
              <tr {...hg.getHeaderGroupProps()} key={hg.id}>
                {hg.headers.map((col) => (
                  <th
                    key={col.id}
                    {...col.getHeaderProps(col.getSortByToggleProps())}
                    style={{
                      backgroundColor: 'var(--color-background-bar)',
                      color: '#d1d1e0',
                      padding: 'clamp(8px, 1vw, 10px) clamp(10px, 1.5vw, 12px)',
                      borderBottom: '2px solid #3a3b44',
                      width: col.minWidth, // Use width instead of minWidth
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: 600,
                      fontSize: 'clamp(7px, 1.1vw, 10px)',
                      letterSpacing: '0.02em',
                      cursor: col.canSort ? 'pointer' : 'default',
                      userSelect: 'none',
                    }}
                    title={
                      col.canSort
                        ? 'Click to sort. Shift+click to add secondary sort. Click again to toggle direction or remove.'
                        : undefined
                    }
                    onMouseEnter={(e) =>
                      col.canSort &&
                      (e.currentTarget.style.backgroundColor =
                        'var(--color-primary-hover)')
                    }
                    onMouseLeave={(e) =>
                      col.canSort &&
                      (e.currentTarget.style.backgroundColor =
                        'var(--color-background-bar)')
                    }
                  >
                    {col.render('Header')}
                    {col.canSort && col.isSorted && (
                      <span
                        style={{
                          marginLeft: 6,
                          color: 'var(--color-primary)',
                        }}
                      >
                        {col.isSortedDesc ? '▼' : '▲'}
                        {sortBy.length > 1 && (
                          <sup>{sortBy.findIndex((x) => x.id === col.id) + 1}</sup>
                        )}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    textAlign: 'center',
                    padding: 'clamp(10px, 1.5vw, 12px)',
                    color: '#d1d1e0',
                    fontSize: 'clamp(8px, 1.2vw, 12px)',
                  }}
                >
                  No trades found.
                </td>
              </tr>
            ) : (
              visible.map((row, i) => {
                prepareRow(row);
                return (
                  <tr
                    {...row.getRowProps()}
                    key={row.id}
                    style={{
                      backgroundColor: i % 2 === 0 ? '#22232c' : '#1e1f27',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        'var(--color-primary-hover)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        i % 2 === 0 ? '#22232c' : '#1e1f27')
                    }
                  >
                    {row.cells.map((cell) => (
                      <td
                        key={cell.column.id}
                        {...cell.getCellProps()}
                        style={{
                          padding: 'clamp(8px, 1vw, 10px) clamp(10px, 1.5vw, 12px)',
                          color: '#e0e0f0',
                          width: cell.column.minWidth,
                          textAlign: 'center',
                          whiteSpace: cell.column.id === 'Instrument' && window.innerWidth < 480 ? 'normal' : 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: 'clamp(7px, 1.2vw, 12px)',
                        }}
                      >
                        {cell.render('Cell')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}