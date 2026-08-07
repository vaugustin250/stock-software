import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Info } from 'lucide-react';

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const show = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };
  return { toast, show };
}

const PurchaseEntry = () => {
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');
  const [purchaseLines, setPurchaseLines] = useState<Record<number, { qty: number; rate: number }>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRefs = useRef<Record<number, { qty: HTMLInputElement | null; rate: HTMLInputElement | null }>>({});
  const queryClient = useQueryClient();
  const { toast, show: showToast } = useToast();

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await api.get('/masters/groups');
      return res.data;
    }
  });

  const { data: products, isLoading, isError: productsError } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/masters/products');
      return res.data;
    }
  });

  const { data: todayPurchase } = useQuery({
    queryKey: ['purchase_entry', new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      const res = await api.get('/purchase/entry');
      return res.data;
    },
  });

  const { data: combinedPO } = useQuery({
    queryKey: ['po_combined', new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      const res = await api.get(`/po/combined-report?date=${new Date().toISOString().split('T')[0]}`);
      return res.data;
    }
  });

  useEffect(() => {
    if ((todayPurchase as any)?.lines) {
      const init: Record<number, { qty: number; rate: number }> = {};
      ((todayPurchase as any).lines as any[]).forEach((l: any) => {
        init[l.product_id] = { qty: l.qty_purchased, rate: l.rate };
      });
      setPurchaseLines(init);
    }
  }, [todayPurchase]);

  const saveMutation = useMutation({
    mutationFn: async (lines: any[]) => {
      await api.post('/purchase/entry', { lines });
    },
    onSuccess: () => {
      setShowSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['purchase_entry'] });
      setTimeout(() => setShowSuccess(false), 1600);
    },
    onError: () => showToast('Save failed. Please try again.', 'error'),
  });

  const handleChange = (pid: number, field: 'qty' | 'rate', val: string) => {
    const num = parseFloat(val);
    setPurchaseLines(prev => ({
      ...prev,
      [pid]: { ...prev[pid], [field]: isNaN(num) ? 0 : num }
    }));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    pid: number, field: 'qty' | 'rate', idx: number, list: any[]
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'qty') {
        inputRefs.current[pid]?.rate?.focus();
      } else {
        const next = list[idx + 1];
        if (next) inputRefs.current[next.id]?.qty?.focus();
      }
    }
  };

  const handleSave = () => {
    const lines = Object.entries(purchaseLines)
      .map(([pid, data]) => ({
        product_id: parseInt(pid),
        unit_id: products?.find((p: any) => p.id === parseInt(pid))?.default_unit_id || 1,
        qty_purchased: data.qty,
        rate: data.rate,
      }))
      .filter(l => l.qty_purchased > 0);
    if (lines.length === 0) { showToast('Please enter at least one quantity.', 'error'); return; }
    saveMutation.mutate(lines);
  };

  const requiredMap = new Map();
  combinedPO?.data?.forEach((row: any) => {
    requiredMap.set(row.product_id, row.total);
  });

  const filteredProducts = (products || [])
    .filter((p: any) => selectedGroupId === '' || p.group_id === selectedGroupId)
    .sort((a: any, b: any) => {
      const reqA = requiredMap.get(a.id) || 0;
      const reqB = requiredMap.get(b.id) || 0;
      if (reqA > 0 && reqB === 0) return -1;
      if (reqB > 0 && reqA === 0) return 1;
      return 0;
    });

  const combinedTotal = (todayPurchase as any)?.combined_total;
  const combinedText = combinedTotal
    ? Object.entries(combinedTotal as Record<string, any>).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ')
    : null;

  return (
    <div className="vb-page">

      {showSuccess && (
        <div className="vb-success-overlay">
          <div className="vb-success-icon">✅</div>
          <div className="vb-success-text">Purchase Recorded!</div>
        </div>
      )}

      {toast && (
        <div className="vb-toast-wrap">
          <div className={`vb-toast ${toast.type}`}>{toast.msg}</div>
        </div>
      )}

      {/* Header */}
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Purchase Entry</h1>
          <p className="vb-page-sub">Godown — {today}</p>
        </div>
      </div>

      {productsError && (
        <div className="vb-error-banner">
          ⚠ Could not load products. Please check your connection and refresh.
        </div>
      )}

      {/* Info banner */}
      {combinedText && (
        <div className="vb-info-banner">
          <Info size={16} />
          Combined order total: {combinedText} — tap to view full list
        </div>
      )}

      {/* Table */}
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
                  <th>Item</th>
                  <th style={{ textAlign: 'center', width: 80 }}>Unit</th>
                  <th style={{ textAlign: 'right', width: 100 }}>Required</th>
                  <th style={{ textAlign: 'right', width: 150 }}>Purchased Qty</th>
                  <th style={{ textAlign: 'right', width: 150 }}>Rate ₹ (Optional)</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product: any, idx: number) => {
                  if (!inputRefs.current[product.id]) inputRefs.current[product.id] = { qty: null, rate: null };
                  const line = purchaseLines[product.id];
                  const hasQty = line?.qty && line.qty > 0;
                  const reqQty = requiredMap.get(product.id) || 0;
                  const rowStyle = hasQty ? 'var(--vb-green-pale)' : (reqQty > 0 ? '#f0f7ff' : undefined);
                  
                  return (
                    <tr key={product.id} style={{ background: rowStyle }}>
                      <td>
                        <span className="vb-product-name-ta">{product.name_tamil || product.name}</span>
                        {product.name_tamil && <span className="vb-product-name-en">{product.name}</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="vb-badge vb-badge-grey">{product.unit_name || 'KG'}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15, color: 'var(--vb-blue)' }}>
                        {reqQty > 0 ? reqQty : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <input
                          type="number" min="0" step="0.01" inputMode="decimal"
                          ref={(el): void => { inputRefs.current[product.id].qty = el; }}
                          value={line?.qty || ''}
                          onChange={e => handleChange(product.id, 'qty', e.target.value)}
                          onKeyDown={e => handleKeyDown(e, product.id, 'qty', idx, filteredProducts)}
                          className="vb-qty-input" style={{ width: 120 }} placeholder="0"
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <input
                          type="number" min="0" step="0.01" inputMode="decimal"
                          ref={(el): void => { inputRefs.current[product.id].rate = el; }}
                          value={line?.rate || ''}
                          onChange={e => handleChange(product.id, 'rate', e.target.value)}
                          onKeyDown={e => handleKeyDown(e, product.id, 'rate', idx, filteredProducts)}
                          className="vb-qty-input" style={{ width: 120 }} placeholder="Rate"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="vb-sticky-action">
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="vb-btn vb-btn-save"
          style={{ width: '100%' }}
        >
          {saveMutation.isPending ? (
            <span style={{ width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
          ) : '✅ Save Purchase'}
        </button>
      </div>
    </div>
  );
};

export default PurchaseEntry;
