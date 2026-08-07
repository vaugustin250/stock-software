import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Download, Calendar } from 'lucide-react';

const PoCombinedReport = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: report, isLoading } = useQuery({
    queryKey: ['po_combined', date],
    queryFn: async () => {
      try {
        const res = await axios.get(`http://localhost:3000/po/combined-report?date=${date}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return res.data;
      } catch {
        return {
          columns: [{ id: 2, code: 'RPC1' }, { id: 3, code: 'RPC2' }, { id: 4, code: 'RPC3' }],
          data: [
            { product_id: 101, product_name: 'Tomato', branch_2: 100, branch_3: 150, branch_4: 60, total: 310 },
            { product_id: 102, product_name: 'Onion', branch_2: 50, branch_3: 60, branch_4: 30, total: 140 },
            { product_id: 103, product_name: 'Potato', branch_2: 20, branch_3: 40, branch_4: 10, total: 70 },
          ]
        };
      }
    }
  });

  return (
    <div className="vb-page">

      {/* Header */}
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">All Branch Orders</h1>
          <p className="vb-page-sub">Combined PO summary across all branches</p>
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

      {/* Table */}
      <div className="vb-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 32 }}>
              {[1,2,3].map(i => <div key={i} className="vb-skeleton" style={{ height: 56, marginBottom: 8 }} />)}
            </div>
          ) : (
            <table className="vb-table" style={{ minWidth: 600 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ position: 'sticky', left: 0, zIndex: 11, background: 'var(--vb-blue)' }}>Item</th>
                  {report?.columns?.map((col: any) => (
                    <th key={col.id} style={{ textAlign: 'right' }}>{col.code}</th>
                  ))}
                  <th style={{ textAlign: 'right', background: '#174d91' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {!report?.data?.length ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--vb-muted)' }}>
                      No POs found for this date.
                    </td>
                  </tr>
                ) : (
                  report.data.map((row: any) => (
                    <tr key={row.product_id}>
                      <td className="sticky-col" style={{
                        fontWeight: 700, fontSize: 15,
                        background: 'var(--vb-card)',
                        borderRight: '2px solid var(--vb-border)',
                        minWidth: 140,
                      }}>
                        {row.product_name}
                      </td>
                      {report.columns.map((col: any) => (
                        <td key={col.id} style={{ textAlign: 'right', fontSize: 15 }}>
                          {row[`branch_${col.id}`] || <span style={{ color: 'var(--vb-muted)' }}>—</span>}
                        </td>
                      ))}
                      <td style={{
                        textAlign: 'right', fontWeight: 800, fontSize: 18,
                        color: 'var(--vb-blue)',
                        background: 'var(--vb-blue-pale)',
                        borderLeft: '2px solid rgba(30,86,160,0.15)',
                      }}>
                        {row.total}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PoCombinedReport;
