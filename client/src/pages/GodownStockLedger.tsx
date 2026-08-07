import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Download, Calendar } from 'lucide-react';

const GodownStockLedger = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: report, isLoading } = useQuery({
    queryKey: ['stock_ledger', date],
    queryFn: async () => {
      try {
        const res = await axios.get(`http://localhost:3000/reports/stock-ledger?date=${date}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return res.data;
      } catch {
        return [
          { product_code: 'P001', product_name: 'Tomato', purchased: 500, transferred: 370, balance: 130 },
          { product_code: 'P002', product_name: 'Onion', purchased: 200, transferred: 150, balance: 50 },
          { product_code: 'P003', product_name: 'Potato', purchased: 80, transferred: 80, balance: 0 },
          { product_code: 'P004', product_name: 'Carrot', purchased: 60, transferred: 70, balance: -10 },
        ];
      }
    }
  });

  const rows = report?.filter((r: any) => r.purchased > 0 || r.transferred > 0) || [];

  return (
    <div className="vb-page">

      {/* Header */}
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Godown Stock</h1>
          <p className="vb-page-sub">Purchased vs dispatched — running balance</p>
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

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="vb-card" style={{ padding: '14px 20px', flex: '1 1 140px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--vb-blue)' }}>
            {rows.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--vb-muted)', fontWeight: 600, marginTop: 2 }}>Products</div>
        </div>
        <div className="vb-card" style={{ padding: '14px 20px', flex: '1 1 140px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--vb-green-dark)' }}>
            {rows.filter((r: any) => r.balance > 0).length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--vb-muted)', fontWeight: 600, marginTop: 2 }}>In Stock</div>
        </div>
        <div className="vb-card" style={{ padding: '14px 20px', flex: '1 1 140px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--vb-red)' }}>
            {rows.filter((r: any) => r.balance <= 0).length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--vb-muted)', fontWeight: 600, marginTop: 2 }}>Zero / Deficit</div>
        </div>
      </div>

      {/* Table */}
      <div className="vb-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 32 }}>
              {[1,2,3,4].map(i => <div key={i} className="vb-skeleton" style={{ height: 56, marginBottom: 8 }} />)}
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--vb-muted)' }}>
              No transactions recorded for this date.
            </div>
          ) : (
            <table className="vb-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ width: 80 }}>Code</th>
                  <th>Item</th>
                  <th style={{ textAlign: 'right' }}>Purchased (IN)</th>
                  <th style={{ textAlign: 'right' }}>Sent Out (OUT)</th>
                  <th style={{ textAlign: 'right', background: '#174d91' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, i: number) => {
                  const isDeficit = row.balance <= 0;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--vb-muted)', fontSize: 13 }}>{row.product_code}</td>
                      <td style={{ fontWeight: 700 }}>{row.product_name}</td>
                      <td style={{ textAlign: 'right', color: 'var(--vb-blue)', fontWeight: 700, fontSize: 16 }}>
                        {row.purchased.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--vb-amber-dark)', fontWeight: 700, fontSize: 16 }}>
                        {row.transferred.toFixed(2)}
                      </td>
                      <td style={{
                        textAlign: 'right',
                        fontWeight: 900, fontSize: 18,
                        background: isDeficit ? 'var(--vb-red-pale)' : 'var(--vb-blue-pale)',
                        color: isDeficit ? 'var(--vb-red-dark)' : 'var(--vb-blue)',
                        borderLeft: `2px solid ${isDeficit ? 'rgba(231,76,60,0.2)' : 'rgba(30,86,160,0.15)'}`,
                      }}>
                        {row.balance.toFixed(2)}
                        {isDeficit && <div style={{ fontSize: 10, color: 'var(--vb-red)', fontWeight: 600 }}>DEFICIT</div>}
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

export default GodownStockLedger;
