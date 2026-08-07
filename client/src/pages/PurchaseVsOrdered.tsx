import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Download, Calendar } from 'lucide-react';

const PurchaseVsOrdered = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: report, isLoading, isError, refetch } = useQuery({
    queryKey: ['purchase_vs_ordered', date],
    queryFn: async () => {
      const res = await api.get(`/reports/purchase-vs-ordered?date=${date}`);
      return res.data;
    }
  });

  const rows = report?.filter((r: any) => r.ordered > 0 || r.purchased > 0) || [];

  return (
    <div className="vb-page">

      {/* Header */}
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Purchase vs Ordered</h1>
          <p className="vb-page-sub">Compare what branches ordered vs what was actually purchased</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Calendar size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--vb-muted)' }} />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="vb-input"
              style={{ paddingLeft: 32, height: 40, fontSize: 14 }}
            />
          </div>
          <button className="vb-btn vb-btn-outline-blue vb-btn-sm">
            <Download size={14} /> Excel
          </button>
        </div>
      </div>

      {isError && (
        <div className="vb-error-banner">
          ⚠ Could not load report.{' '}
          <button className="vb-btn vb-btn-sm vb-btn-outline-blue" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="vb-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 32 }}>
              {[1,2,3].map(i => <div key={i} className="vb-skeleton" style={{ height: 56, marginBottom: 8 }} />)}
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--vb-muted)' }}>
              No orders or purchases found for this date.
            </div>
          ) : (
            <table className="vb-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ width: 80 }}>Code</th>
                  <th>Item</th>
                  <th style={{ textAlign: 'right' }}>Total Ordered</th>
                  <th style={{ textAlign: 'right' }}>Total Purchased</th>
                  <th style={{ textAlign: 'right', width: 130 }}>Variance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, i: number) => {
                  const isNeg = row.variance < 0;
                  const isPos = row.variance > 0;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--vb-muted)', fontSize: 13 }}>{row.product_code}</td>
                      <td style={{ fontWeight: 700 }}>{row.product_name}</td>
                      <td style={{ textAlign: 'right', fontSize: 16, fontWeight: 700 }}>{row.ordered.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontSize: 16, fontWeight: 700 }}>{row.purchased.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {row.variance === 0 ? (
                          <span className="vb-badge vb-badge-green">✓ Even</span>
                        ) : (
                          <span className={`vb-badge ${isNeg ? 'vb-badge-red' : 'vb-badge-blue'}`} style={{ fontSize: 14 }}>
                            {isPos ? '+' : ''}{row.variance.toFixed(2)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseVsOrdered;
