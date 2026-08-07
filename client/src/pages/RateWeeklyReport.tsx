import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Download } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

const RateWeeklyReport = () => {
  const { data: report, isLoading, isError, refetch } = useQuery({
    queryKey: ['rate_weekly'],
    queryFn: async () => {
      const res = await api.get('/rates/weekly');
      return res.data;
    }
  });

  const getArrow = (cur: number, prev: number) => {
    if (!prev || cur === prev) return null;
    return cur > prev
      ? <span style={{ color: 'var(--vb-red)', fontSize: 10, fontWeight: 800 }}> ▲</span>
      : <span style={{ color: 'var(--vb-green-dark)', fontSize: 10, fontWeight: 800 }}> ▼</span>;
  };

  return (
    <div className="vb-page">

      {/* Header */}
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Weekly Rate Report</h1>
          <p className="vb-page-sub">Closing rates Monday to Saturday — ▲ up, ▼ down vs previous day</p>
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
          ) : !report?.length ? (
            <div style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--vb-muted)' }}>
              No rate data for this week.
            </div>
          ) : (
            <table className="vb-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ minWidth: 140 }}>Product</th>
                  {DAYS.map(d => (
                    <th key={d} style={{ textAlign: 'right', minWidth: 90 }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.map((row: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{row.product_name}</td>
                    {DAY_KEYS.map((key, di) => {
                      const val = row[key];
                      const prev = di > 0 ? row[DAY_KEYS[di - 1]] : null;
                      return (
                        <td key={key} style={{ textAlign: 'right', fontSize: 15, fontWeight: 700 }}>
                          ₹{val?.toFixed(2) ?? '—'}
                          {prev !== null && val !== undefined && getArrow(val, prev)}
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
