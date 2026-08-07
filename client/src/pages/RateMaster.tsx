import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { History } from 'lucide-react';

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const show = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  return { toast, show };
}

const RateMaster = () => {
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');
  const [rateEdits, setRateEdits] = useState<Record<number, number>>({});
  const [savedRows, setSavedRows] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();
  const { toast, show: showToast } = useToast();

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await api.get('/masters/groups');
      return res.data;
    }
  });

  const { data: products, isLoading, isError, refetch } = useQuery({
    queryKey: ['products_with_rates'],
    queryFn: async () => {
      const prodRes = await api.get('/masters/products');
      const ratesRes = await api.get('/rates');
      const ratesDict: Record<number, number> = {};
      ratesRes.data.rates.forEach((r: any) => ratesDict[r.product_id] = r.rate);
      return prodRes.data.map((p: any) => ({ ...p, current_rate: ratesDict[p.id] || 0 }));
    }
  });

  const saveRateMutation = useMutation({
    mutationFn: async (updates: { product_id: number; rate: number }[]) => {
      await Promise.all(updates.map(u => api.post('/rates', u)));
    },
    onSuccess: (_, updates) => {
      const ids = new Set(updates.map(u => u.product_id));
      setSavedRows(prev => new Set([...prev, ...ids]));
      const newEdits = { ...rateEdits };
      updates.forEach(u => delete newEdits[u.product_id]);
      setRateEdits(newEdits);
      queryClient.invalidateQueries({ queryKey: ['products_with_rates'] });
      showToast('Rates updated — branches notified 🔔', 'success');
      setTimeout(() => setSavedRows(new Set()), 2000);
    },
    onError: () => showToast('Update failed. Please try again.', 'error'),
  });

  const handleRateChange = (productId: number, val: string) => {
    const rate = parseFloat(val);
    setRateEdits(prev => ({ ...prev, [productId]: isNaN(rate) ? 0 : rate }));
  };

  const handleSaveAll = () => {
    const updates = Object.entries(rateEdits)
      .map(([pid, rate]) => ({ product_id: parseInt(pid), rate }))
      .filter(u => u.rate > 0);
    if (updates.length === 0) {
      showToast('No rates edited yet.', 'info');
      return;
    }
    saveRateMutation.mutate(updates);
  };

  const filteredProducts = products?.filter((p: any) =>
    selectedGroupId === '' || p.group_id === selectedGroupId
  ) || [];

  const editCount = Object.keys(rateEdits).length;

  return (
    <div className="vb-page">

      {toast && (
        <div className="vb-toast-wrap">
          <div className={`vb-toast ${toast.type}`}>{toast.msg}</div>
        </div>
      )}

      {/* Header */}
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Update Rates</h1>
          <p className="vb-page-sub">Push live prices to all branches</p>
        </div>
        {editCount > 0 && (
          <div className="vb-badge vb-badge-amber" style={{ fontSize: 13, padding: '6px 12px' }}>
            {editCount} item{editCount !== 1 ? 's' : ''} edited
          </div>
        )}
      </div>

      {isError && (
        <div className="vb-error-banner">
          ⚠ Could not load rates.{' '}
          <button className="vb-btn vb-btn-sm vb-btn-outline-blue" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* Table card */}
      <div className="vb-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--vb-border)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="vb-label" style={{ margin: 0 }}>Category</label>
          <div style={{ position: 'relative', minWidth: 200, flex: 1 }}>
            <select
              className="vb-select"
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value === '' ? '' : parseInt(e.target.value))}
            >
              <option value="">— All Categories —</option>
              {groups?.map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 32 }}>
              {[1,2,3].map(i => <div key={i} className="vb-skeleton" style={{ height: 64, marginBottom: 8 }} />)}
            </div>
          ) : (
            <table className="vb-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th>Item / பொருள்</th>
                  <th style={{ textAlign: 'right', width: 150 }}>Current Rate ₹</th>
                  <th style={{ textAlign: 'right', width: 160 }}>New Rate ₹</th>
                  <th style={{ textAlign: 'center', width: 80 }}>History</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product: any) => {
                  const isEditing = rateEdits[product.id] !== undefined;
                  const isSaved = savedRows.has(product.id);
                  return (
                    <tr key={product.id} style={{
                      background: isSaved ? 'var(--vb-green-pale)' : isEditing ? 'var(--vb-amber-pale)' : undefined,
                    }}>
                      <td>
                        <span className="vb-product-name-ta">{product.name_tamil || product.name}</span>
                        {product.name_tamil && (
                          <span className="vb-product-name-en">{product.name}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 18, fontWeight: 800 }}>
                        ₹{product.current_rate.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={isEditing ? rateEdits[product.id] : ''}
                          onChange={e => handleRateChange(product.id, e.target.value)}
                          className="vb-qty-input"
                          style={{ width: 130 }}
                          placeholder={product.current_rate.toFixed(2)}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vb-muted)', padding: 6 }}
                          title="View rate history"
                        >
                          <History size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Sticky Save */}
      <div className="vb-sticky-action">
        <button
          onClick={handleSaveAll}
          disabled={saveRateMutation.isPending}
          className="vb-btn vb-btn-save"
          style={{ width: '100%' }}
        >
          {saveRateMutation.isPending ? (
            <span style={{ width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
          ) : `💰 Update Rates${editCount > 0 ? ` (${editCount} changed)` : ''}`}
        </button>
      </div>
    </div>
  );
};

export default RateMaster;
