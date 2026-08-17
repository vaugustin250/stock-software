import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Filter, Search, X } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

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
  const [purchaseLines, setPurchaseLines] = useState<Record<number, { qty: number, rate: number, unit_id: number, unit_qty: number }>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [showEnteredOnly, setShowEnteredOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRefs = useRef<Record<number, { qty: HTMLInputElement | null; rate: HTMLInputElement | null; unit_qty: HTMLInputElement | null }>>({});
  const queryClient = useQueryClient();
  const { toast, show: showToast } = useToast();
  const isMobile = useIsMobile();

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

  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: async () => (await api.get('/masters/units')).data
  });

  const { data: todayPurchase } = useQuery({
    queryKey: ['purchase_entry', new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      const res = await api.get('/purchase/entry');
      return res.data;
    },
  });

  const { data: purchasedItems = [] } = useQuery({
    queryKey: ['warehouse_purchases', new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      const res = await api.get(`/purchase/men-summary?date=${new Date().toISOString().split('T')[0]}`);
      return res.data;
    }
  });

  useEffect(() => {
    if ((todayPurchase as any)?.lines) {
      const init: Record<number, { qty: number; rate: number; unit_id: number; unit_qty: number }> = {};
      ((todayPurchase as any).lines as any[]).forEach((l: any) => {
        init[l.product_id] = { qty: l.qty_purchased, rate: l.rate, unit_id: l.unit_id, unit_qty: l.unit_qty };
      });
      setPurchaseLines(init);
    }
  }, [todayPurchase]);

  const saveMutation = useMutation({
    mutationFn: async (lines: any[]) => {
      await api.post('/purchase/entry', { lines, supplier_id: null });
    },
    onSuccess: () => {
      setShowSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['purchase_entry'] });
      setTimeout(() => setShowSuccess(false), 1600);
    },
    onError: () => showToast('Save failed. Please try again.', 'error'),
  });

  const handleChange = (pid: number, field: 'qty' | 'rate' | 'unit_qty', val: string) => {
    const num = parseFloat(val);
    setPurchaseLines(prev => ({
      ...prev,
      [pid]: { ...(prev[pid] || { qty: 0, rate: 0, unit_id: 1, unit_qty: 0 }), [field]: isNaN(num) ? 0 : num }
    }));
  };

  const handleUnitChange = (pid: number, unit_id: number) => {
    setPurchaseLines(prev => ({
      ...prev,
      [pid]: { ...(prev[pid] || { qty: 0, rate: 0, unit_qty: 0 }), unit_id }
    }));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    pid: number, field: 'qty' | 'rate' | 'unit_qty', idx: number, list: any[]
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'unit_qty') {
        inputRefs.current[pid]?.qty?.focus();
      } else if (field === 'qty') {
        inputRefs.current[pid]?.rate?.focus();
      } else {
        const next = list[idx + 1];
        if (next) inputRefs.current[next.id]?.unit_qty?.focus();
      }
    }
  };

  const handleSave = () => {
    const lines = Object.entries(purchaseLines)
      .map(([pid, data]) => ({
        product_id: parseInt(pid),
        unit_id: data.unit_id || products?.find((p: any) => p.id === parseInt(pid))?.default_unit_id || 1,
        qty_purchased: data.qty,
        unit_qty: data.unit_qty,
        rate: data.rate,
      }))
      .filter(l => l.qty_purchased > 0 || l.unit_qty > 0);
    if (lines.length === 0) { showToast('Please enter at least one quantity.', 'error'); return; }
    saveMutation.mutate(lines);
  };

  const purchasedMap = new Map();
  purchasedItems.forEach((row: any) => {
    purchasedMap.set(row.product_id, {
      qty: row.total_qty,
      unit_qty: row.total_unit_qty,
      unit_name: row.unit_name
    });
  });

  const baseFiltered = (products || []).filter((p: any) => {
    const matchesGroup = selectedGroupId === '' || p.group_id === selectedGroupId;
    if (!matchesGroup) return false;
    if (searchTerm.trim() === '') return true;
    const term = searchTerm.toLowerCase();
    return (p.name || '').toLowerCase().includes(term) ||
      (p.name_tamil || '').toLowerCase().includes(term) ||
      (p.code || '').toLowerCase().includes(term);
  });

  const filteredProducts = (showEnteredOnly
    ? baseFiltered.filter((p: any) => (purchaseLines[p.id]?.qty || 0) > 0 || (purchaseLines[p.id]?.unit_qty || 0) > 0)
    : baseFiltered
  ).sort((a: any, b: any) => {
    const aPurchased = purchasedMap.has(a.id);
    const bPurchased = purchasedMap.has(b.id);
    if (aPurchased && !bPurchased) return -1;
    if (!aPurchased && bPurchased) return 1;
    return 0;
  });

  const enteredCount = Object.values(purchaseLines).filter(l => l.qty > 0 || l.unit_qty > 0).length;

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
          <h1 className="vb-page-title">Stock Inward Entry</h1>
          <p className="vb-page-sub">Godown — {today}</p>
        </div>
      </div>

      {productsError && (
        <div className="vb-error-banner">
          ⚠ Could not load products. Please check your connection and refresh.
        </div>
      )}



      {/* Table */}
      <div className="vb-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: isMobile ? '8px 12px' : '12px 16px', borderBottom: '1px solid var(--vb-border)', display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, flexWrap: 'nowrap', backgroundColor: '#f8fafc' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 50 }}>
            <div style={{ position: 'absolute', top: isMobile ? 10 : 12, left: isMobile ? 10 : 14, color: '#64748b' }}>
              <Search size={isMobile ? 16 : 18} />
            </div>
            <input
              type="text"
              className="pos-input"
              style={{ paddingLeft: isMobile ? 32 : 40, paddingRight: 28, height: isMobile ? 36 : 44, fontSize: isMobile ? 13 : 15 }}
              placeholder={isMobile ? "Search..." : "Search item / பொருள் தேடு..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', top: isMobile ? 10 : 12, right: isMobile ? 8 : 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <X size={isMobile ? 16 : 18} />
              </button>
            )}
          </div>

          <div style={{ position: 'relative', minWidth: isMobile ? 120 : 150, flexShrink: 0 }}>
            <select
              className="pos-input"
              style={{ borderColor: '#cbd5e1', color: '#334155', height: isMobile ? 36 : 44, fontSize: isMobile ? 13 : 15, paddingLeft: isMobile ? 8 : 12 }}
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

        {/* Toolbar */}
        <div className="vb-entry-toolbar">
          <span style={{ fontSize: 13, color: 'var(--vb-muted)', fontWeight: 500 }}>
            {filteredProducts.length} items shown
          </span>
          {enteredCount > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="vb-badge vb-badge-green" style={{ fontSize: 12, padding: '4px 10px' }}>
                ✓ {enteredCount} entered
              </span>
              <button
                className={`vb-toggle-btn${showEnteredOnly ? ' active' : ''}`}
                onClick={() => setShowEnteredOnly(v => !v)}
              >
                <Filter size={13} />
                {showEnteredOnly ? 'Show All' : 'Review entered'}
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 32 }}>
              {[1, 2, 3].map(i => <div key={i} className="vb-skeleton" style={{ height: 64, marginBottom: 8 }} />)}
            </div>
          ) : isMobile ? (
            /* ── Mobile Card Layout ── */
            <div className="vb-mobile-list">
              {filteredProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--vb-muted)' }}>
                  No products found.
                </div>
              ) : filteredProducts.map((product: any, idx: number) => {
                if (!inputRefs.current[product.id]) inputRefs.current[product.id] = { qty: null, rate: null, unit_qty: null };
                const line = purchaseLines[product.id];
                const hasQty = line?.qty && line.qty > 0;
                const purchasedData = purchasedMap.get(product.id);
                return (
                  <div
                    key={product.id}
                    className={`vb-mobile-card${hasQty ? ' has-qty' : ''}`}
                  >
                    <div className="vb-mobile-card-name">
                      {product.name_tamil || product.name}
                    </div>
                    {product.name_tamil && (
                      <span className="vb-mobile-card-name-en">{product.name}</span>
                    )}
                    {purchasedData && (
                      <div className="vb-mobile-card-chips">
                        <span className="vb-chip vb-chip-blue" style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' }}>
                          🛒 Purchased: {purchasedData.qty} KG {purchasedData.unit_qty > 0 && `(${purchasedData.unit_qty} ${purchasedData.unit_name})`}
                        </span>
                        {hasQty && line.qty < purchasedData.qty && (
                          <span className="vb-chip vb-chip-red" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}>
                            ⚠ Deficient: {parseFloat((purchasedData.qty - line.qty).toFixed(3))} KG
                          </span>
                        )}
                      </div>
                    )}
                    <div className="vb-mobile-card-inputs">
                      <div className="vb-mobile-qty-wrap">
                        <span className="vb-mobile-qty-label">Unit Qty</span>
                        <input
                          type="number" min="0" step="0.1" inputMode="decimal" enterKeyHint="next"
                          ref={(el): void => { inputRefs.current[product.id].unit_qty = el; }}
                          value={line?.unit_qty || ''}
                          onChange={e => handleChange(product.id, 'unit_qty', e.target.value)}
                          onKeyDown={e => handleKeyDown(e, product.id, 'unit_qty', idx, filteredProducts)}
                          className="vb-mobile-qty-input" placeholder="0"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span className="vb-mobile-qty-label">Unit</span>
                        <select
                          className="vb-mobile-unit-select"
                          value={line?.unit_id || product.default_unit_id || 1}
                          onChange={(e) => handleUnitChange(product.id, parseInt(e.target.value))}
                        >
                          {units?.map((u: any) => (
                            <option key={u.id} value={u.id}>{u.code}</option>
                          ))}
                        </select>
                      </div>
                      <div className="vb-mobile-qty-wrap" style={{ flex: 1 }}>
                        <span className="vb-mobile-qty-label">Received Qty (KG)</span>
                        <input
                          type="number" min="0" step="0.01" inputMode="decimal" enterKeyHint="next"
                          ref={(el): void => { inputRefs.current[product.id].qty = el; }}
                          value={line?.qty || ''}
                          onChange={e => handleChange(product.id, 'qty', e.target.value)}
                          onKeyDown={e => handleKeyDown(e, product.id, 'qty', idx, filteredProducts)}
                          className="vb-mobile-qty-input" placeholder="0"
                        />
                      </div>
                      <div className="vb-mobile-qty-wrap">
                        <span className="vb-mobile-qty-label">Rate ₹</span>
                        <input
                          type="number" min="0" step="0.01" inputMode="decimal" enterKeyHint="next"
                          ref={(el): void => { inputRefs.current[product.id].rate = el; }}
                          value={line?.rate || ''}
                          onChange={e => handleChange(product.id, 'rate', e.target.value)}
                          onKeyDown={e => handleKeyDown(e, product.id, 'rate', idx, filteredProducts)}
                          className="vb-mobile-qty-input" placeholder="Rate"
                          style={{ fontSize: 18 }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Desktop Table ── */
            <table className="vb-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th>Item</th>
                  <th style={{ textAlign: 'right', width: 90 }}>Unit Qty</th>
                  <th style={{ textAlign: 'center', width: 80 }}>Unit</th>
                  <th style={{ textAlign: 'right', width: 150 }}>Purchased Qty</th>
                  <th style={{ textAlign: 'right', width: 150 }}>Received Qty (KG)</th>
                  <th style={{ textAlign: 'right', width: 150 }}>Rate ₹ (Optional)</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product: any, idx: number) => {
                  if (!inputRefs.current[product.id]) inputRefs.current[product.id] = { qty: null, rate: null, unit_qty: null };
                  const line = purchaseLines[product.id];
                  const hasQty = line?.qty && line.qty > 0;
                  const purchasedData = purchasedMap.get(product.id);
                  const rowStyle = hasQty ? 'var(--vb-green-pale)' : undefined;

                  return (
                    <tr key={product.id} style={{ background: rowStyle }}>
                      <td>
                        <span className="vb-product-name-ta">{product.name_tamil || product.name}</span>
                        {product.name_tamil && <span className="vb-product-name-en">{product.name}</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <input
                          type="number" min="0" step="0.1" inputMode="decimal"
                          ref={(el): void => { inputRefs.current[product.id].unit_qty = el; }}
                          value={line?.unit_qty || ''}
                          onChange={e => handleChange(product.id, 'unit_qty', e.target.value)}
                          onKeyDown={e => handleKeyDown(e, product.id, 'unit_qty', idx, filteredProducts)}
                          className="vb-qty-input"
                          style={{ width: 90 }}
                          placeholder="0"
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <select
                          className="vb-select"
                          style={{ width: 80, padding: '4px 8px', fontSize: 13, height: 32 }}
                          value={line?.unit_id || product.default_unit_id || 1}
                          onChange={(e) => handleUnitChange(product.id, parseInt(e.target.value))}
                        >
                          {units?.map((u: any) => (
                            <option key={u.id} value={u.id}>{u.code}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 14, color: '#475569' }}>
                        {purchasedData ? (
                          <>
                            <div style={{ fontWeight: 700 }}>{purchasedData.qty} KG</div>
                            {purchasedData.unit_qty > 0 && (
                              <div style={{ fontSize: 12, color: '#64748b' }}>
                                ({purchasedData.unit_qty} {purchasedData.unit_name})
                              </div>
                            )}
                          </>
                        ) : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {hasQty && purchasedData && line.qty < purchasedData.qty && (
                          <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 4, fontWeight: 600 }}>
                            Deficient: {parseFloat((purchasedData.qty - line.qty).toFixed(3))} KG
                          </div>
                        )}
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
