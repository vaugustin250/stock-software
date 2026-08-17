import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Calendar, Search } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

export default function WarehousePurchases() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const isMobile = useIsMobile();

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['warehouse_purchases', date],
    queryFn: async () => {
      const res = await api.get(`/purchase/men-summary?date=${date}`);
      return res.data;
    }
  });

  const filteredPurchases = purchases.filter((p: any) => 
    p.product_name.toLowerCase().includes(search.toLowerCase()) ||
    p.purchase_man_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.supplier_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="vb-content-container">
      <div className="vb-header-flex">
        <div>
          <h1 className="vb-page-title">Purchases</h1>
          <p className="vb-page-subtitle">View items bought by Purchase Men</p>
        </div>
      </div>

      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: 24,
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Date</label>
          <div className="vb-input-icon-wrapper">
            <Calendar className="vb-input-icon" size={16} />
            <input
              type="date"
              className="vb-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
        </div>

        <div style={{ flex: '2 1 300px' }}>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Search</label>
          <div className="vb-input-icon-wrapper">
            <Search className="vb-input-icon" size={16} />
            <input
              type="text"
              className="vb-input"
              placeholder="Search product, purchase man, or supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
        </div>
      </div>

      <div className="vb-card">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading purchases...</div>
        ) : filteredPurchases.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No purchases found for this date.</div>
        ) : isMobile ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {filteredPurchases.map((p: any, idx: number) => (
              <div key={idx} style={{ padding: 16, border: '1px solid var(--vb-border)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: 'var(--vb-blue)' }}>{p.product_name}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.total_qty} KG</div>
                </div>
                <div style={{ fontSize: 13, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{p.total_unit_qty > 0 ? `${p.total_unit_qty} ${p.unit_name}` : '-'}</span>
                  <span>{p.purchase_man_name}</span>
                </div>
                {p.supplier_name && (
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    Supplier: {p.supplier_name}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="vb-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Purchased By</th>
                  <th>Supplier</th>
                  <th style={{ textAlign: 'center' }}>Unit</th>
                  <th style={{ textAlign: 'right' }}>Unit Qty</th>
                  <th style={{ textAlign: 'right' }}>Total Qty (KG)</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((p: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--vb-blue)' }}>{p.product_name}</td>
                    <td>{p.purchase_man_name}</td>
                    <td>{p.supplier_name || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="vb-badge vb-badge-gray">{p.unit_name}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {p.total_unit_qty > 0 ? p.total_unit_qty : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {p.total_qty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
