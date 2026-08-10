import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Download } from 'lucide-react';

// Constants removed as they are dynamic now

const RateWeeklyReport = () => {
  const { data: reportData, isLoading, isError, refetch } = useQuery({
    queryKey: ['rate_weekly'],
    queryFn: async () => {
      const res = await api.get('/rates/weekly');
      return res.data; // { dates: string[], formattedDates: string[], rates: any[] }
    }
  });

  const getArrow = (cur: number, prev: number) => {
    if (prev === null || prev === undefined || cur === prev) return null;
    return cur > prev
      ? <span style={{ color: 'var(--vb-red)', fontSize: 10, fontWeight: 800 }}> ▲</span>
      : <span style={{ color: 'var(--vb-green-dark)', fontSize: 10, fontWeight: 800 }}> ▼</span>;
  };

  const dates = reportData?.dates || [];
  const formattedDates = reportData?.formattedDates || [];
  const rates = reportData?.rates || [];

  return (
    <div className="vb-page">

      {/* Header */}
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Weekly Rate Report</h1>
          <p className="vb-page-sub">Closing rates for the last 7 days — ▲ up, ▼ down vs previous day</p>
        </div>
        <button className="vb-btn vb-btn-outline-blue vb-btn-sm">
          <Download size={14} /> Excel
        </button>
      </div>

      {isError && (
        <div className="vb-error-banner">
          ⚠ Could not load weekly rates.{' '}
          <button className="vb-btn vb-btn-sm vb-btn-outline-blue" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="vb-card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 32 }}>
              {[1,2,3].map(i => <div key={i} className="vb-skeleton" style={{ height: 56, marginBottom: 8 }} />)}
            </div>
          ) : !rates.length ? (
            <div style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--vb-muted)' }}>
              No active products found.
            </div>
          ) : (
            <table className="vb-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ minWidth: 140 }}>Product</th>
                  {formattedDates.map((fd: string, i: number) => (
                    <th key={i} style={{ textAlign: 'right', minWidth: 90 }}>{fd}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rates.map((row: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{row.product_name}</td>
                    {dates.map((dateStr: string, di: number) => {
                      const val = row[dateStr];
                      const prev = di > 0 ? row[dates[di - 1]] : null;
                      return (
                        <td key={dateStr} style={{ textAlign: 'right', fontSize: 15, fontWeight: 700 }}>
                          {val !== null && val !== undefined ? `₹${val.toFixed(2)}` : '—'}
                          {prev !== null && val !== null && val !== undefined && getArrow(val, prev)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default RateWeeklyReport;
