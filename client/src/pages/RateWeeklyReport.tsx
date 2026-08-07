import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Download } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

const RateWeeklyReport = () => {
  const { data: report, isLoading } = useQuery({
    queryKey: ['rate_weekly'],
    queryFn: async () => {
      try {
        const res = await axios.get('http://localhost:3000/rates/weekly', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return res.data;
      } catch {
        return [
          { product_name: 'Tomato', mon: 92, tue: 89, wed: 89, thu: 79, fri: 75, sat: 79 },
          { product_name: 'Onion', mon: 40, tue: 42, wed: 42, thu: 42, fri: 45, sat: 45 },
          { product_name: 'Potato', mon: 38, tue: 38, wed: 36, thu: 36, fri: 38, sat: 40 },
        ];
      }
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
