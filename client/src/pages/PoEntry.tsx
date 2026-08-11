import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Calendar, Search, X, Filter, Building2 } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

// Shared toast hook
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const show = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };
  return { toast, show };
}

const PoEntry = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role || 'BRANCH';
  const isHeadOffice = role === 'WAREHOUSE' || role === 'ADMIN';

  const [selectedBranchId, setSelectedBranchId] = useState<number | ''>('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [poLines, setPoLines] = useState<Record<number, number>>({});
  const [poUnits, setPoUnits] = useState<Record<number, number>>({});
  const [poUnitQtys, setPoUnitQtys] = useState<Record<number, number>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [showEnteredOnly, setShowEnteredOnly] = useState(false);
  
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const unitQtyRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const queryClient = useQueryClient();
  const { toast, show: showToast } = useToast();
  const isMobile = useIsMobile();

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const entryDateIso = new Date().toISOString().split('T')[0];

  const { data: branches, isError: branchesError } = useQuery({
    queryKey: ['branches_po'],
    queryFn: async () => {
      const res = await api.get('/masters/branches');
      return res.data.filter((b: any) => b.type === 'BRANCH');
    },
    enabled: isHeadOffice
  });

  const { data: groups, isError: groupsError } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await api.get('/masters/groups');
      return res.data;
    }
  });

  const { data: products, isLoading: isLoadingProducts, isError: productsError } = useQuery({
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

  const { data: todayPo, isLoading: isPoLoading } = useQuery({
    queryKey: ['po_entry', entryDateIso, selectedBranchId],
    queryFn: async () => {
      if (isHeadOffice && !selectedBranchId) return { lines: [] };
      const url = isHeadOffice ? `/po/entry?branch_id=${selectedBranchId}` : '/po/entry';
      const res = await api.get(url);
      return res.data;
    },
    enabled: !isHeadOffice || !!selectedBranchId
  });

  useEffect(() => {
    if (todayPo?.lines) {
      const initQty: Record<number, number> = {};
      const initUnit: Record<number, number> = {};
      const initUnitQty: Record<number, number> = {};
      (todayPo.lines as any[]).forEach((l: any) => {
        initQty[l.product_id] = l.qty;
        initUnit[l.product_id] = l.unit_id;
        initUnitQty[l.product_id] = l.unit_qty;
      });
      setPoLines(initQty);
      setPoUnits(initUnit);
      setPoUnitQtys(initUnitQty);
    } else if (isHeadOffice && !selectedBranchId) {
      setPoLines({});
      setPoUnits({});
      setPoUnitQtys({});
    }
  }, [todayPo, selectedBranchId, isHeadOffice]);

  const savePoMutation = useMutation({
    mutationFn: async (lines: any[]) => {
      const payload: any = { lines };
      if (isHeadOffice) payload.branch_id = selectedBranchId;
      await api.post('/po/entry', payload);
    },
    onSuccess: () => {
      setShowSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['po_entry'] });
      setTimeout(() => { setShowSuccess(false); }, 1600);
    },
    onError: () => showToast('Save failed. Please try again.', 'error'),
  });

  const handleQtyChange = (productId: number, val: string) => {
    const qty = parseFloat(val);
    setPoLines(prev => ({ ...prev, [productId]: isNaN(qty) ? 0 : qty }));
  };

  const handleUnitQtyChange = (productId: number, val: string) => {
    const qty = parseFloat(val);
    setPoUnitQtys(prev => ({ ...prev, [productId]: isNaN(qty) ? 0 : qty }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number, list: any[]) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const next = list[idx + 1];
      if (next && unitQtyRefs.current[next.id]) unitQtyRefs.current[next.id]?.focus();
    }
  };

  const handleUnitQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, productId: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRefs.current[productId]?.focus();
    }
  };

  const handleSave = () => {
    if (isHeadOffice && !selectedBranchId) {
      showToast('Please select a branch first.', 'error');
      return;
    }

    const linesToSave = Object.entries(poLines)
      .map(([pid, qty]) => {
        const numPid = parseInt(pid);
        return {
          product_id: numPid,
          unit_id: poUnits[numPid] || products?.find((p: any) => p.id === numPid)?.default_unit_id || 1,
          qty,
          unit_qty: poUnitQtys[numPid] || 0
        };
      })
      .filter(l => l.qty > 0 || l.unit_qty > 0);

    if (linesToSave.length === 0) {
      showToast('Please enter at least one quantity.', 'error');
      return;
    }
    savePoMutation.mutate(linesToSave);
  };

  const baseFiltered = products?.filter((p: any) => {
    const matchesGroup = selectedGroupId === '' || p.group_id === selectedGroupId;
    if (!matchesGroup) return false;
    if (searchTerm.trim() === '') return true;
    const term = searchTerm.toLowerCase();
    return (p.name || '').toLowerCase().includes(term) ||
      (p.name_tamil || '').toLowerCase().includes(term) ||
      (p.code || '').toLowerCase().includes(term);
  }) || [];

  const filteredProducts = showEnteredOnly
    ? baseFiltered.filter((p: any) => (poLines[p.id] || 0) > 0 || (poUnitQtys[p.id] || 0) > 0)
    : baseFiltered;

  const enteredCount = Object.keys(poLines).filter(id => poLines[parseInt(id)] > 0 || poUnitQtys[parseInt(id)] > 0).length;
  const isLocked = (todayPo as any)?.status === 'LOCKED';

  return (
    <div className="vb-page">

      {/* Success Overlay */}
      {showSuccess && (
        <div className="vb-success-overlay">
          <div className="vb-success-icon">✅</div>
          <div className="vb-success-text">Order Saved!</div>
          <div style={{ color: 'rgba(255,255,255,0.85)', marginTop: 8, fontSize: 15, fontFamily: "'Noto Sans Tamil', sans-serif" }}>
            ஆர்டர் சேமிக்கப்பட்டது!
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="vb-toast-wrap">
          <div className={`vb-toast ${toast.type}`}>{toast.msg}</div>
        </div>
      )}

      {/* Header */}
      <div className="vb-page-header" style={{ flexWrap: isMobile ? 'nowrap' : 'wrap', alignItems: 'center', marginBottom: isMobile ? 12 : 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="vb-page-title" style={{ fontSize: isMobile ? 20 : 22, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Today Closing Stock</h1>
          <p className="vb-page-sub" style={{ fontFamily: "'Noto Sans Tamil', sans-serif", fontSize: isMobile ? 12 : 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            இன்றைய கையிருப்பு / Today's Closing Stock
          </p>
        </div>
        <div className="vb-date-chip" style={{ flexShrink: 0, padding: isMobile ? '4px 8px' : undefined, fontSize: isMobile ? 12 : undefined }}>
          <Calendar size={isMobile ? 12 : 14} />
          {today}
        </div>
      </div>

      {(groupsError || productsError || branchesError) && (
        <div className="vb-error-banner">
          ⚠ Could not load required data. Please check your connection and refresh.
        </div>
      )}

      {/* Locked banner */}
      {isLocked && (
        <div className="vb-warning-banner">
          🔒 This order has been locked by the Warehouse and cannot be edited.
        </div>
      )}

      {/* Branch Selector for WAREHOUSE / ADMIN */}
      {isHeadOffice && (
        <div className="vb-card" style={{ padding: isMobile ? '12px' : '16px', marginBottom: isMobile ? '12px' : '16px' }}>
          <label className="vb-label" style={{ fontSize: isMobile ? '11px' : '13px', marginBottom: isMobile ? '4px' : '8px' }}>Select Branch to Order For</label>
          <select
            className="vb-select"
            value={selectedBranchId}
            style={{ height: isMobile ? 40 : 48, fontSize: isMobile ? 14 : 15 }}
            onChange={e => {
              setSelectedBranchId(e.target.value === '' ? '' : parseInt(e.target.value));
              setPoLines({});
            }}
          >
            <option value="">— Select Branch —</option>
            {branches?.map((b: any) => (
              <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
            ))}
          </select>
        </div>
      )}

      {isHeadOffice && !selectedBranchId ? (
         <div className="vb-card" style={{ padding: '64px 32px', textAlign: 'center', flex: 1 }}>
           <Building2 size={48} style={{ color: 'var(--vb-muted)', marginBottom: 16 }} />
           <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--vb-muted)' }}>
             Select a branch to enter their order
           </div>
         </div>
      ) : (
        <div className="vb-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Search + Category */}
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

          {/* Toolbar: count + entered-only toggle */}
          <div className="vb-entry-toolbar" style={{ padding: isMobile ? '8px 12px' : '12px 16px' }}>
            <span style={{ fontSize: isMobile ? 12 : 13, color: 'var(--vb-muted)', fontWeight: 500 }}>
              {filteredProducts.length} items
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {enteredCount > 0 && (
                <span className="vb-badge vb-badge-green" style={{ fontSize: isMobile ? 11 : 12, padding: isMobile ? '2px 8px' : '4px 10px' }}>
                  ✓ {enteredCount} entered
                </span>
              )}
              {enteredCount > 0 && (
                <button
                  className={`vb-toggle-btn${showEnteredOnly ? ' active' : ''}`}
                  style={{ height: isMobile ? 28 : 32, fontSize: isMobile ? 12 : 13, padding: isMobile ? '0 8px' : '0 12px' }}
                  onClick={() => setShowEnteredOnly(v => !v)}
                >
                  <Filter size={isMobile ? 12 : 13} />
                  {showEnteredOnly ? 'Show All' : 'Review'}
                </button>
              )}
            </div>
          </div>

          {/* Product List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoadingProducts || isPoLoading ? (
              <div style={{ padding: 32 }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="vb-skeleton" style={{ height: 56, marginBottom: 8 }} />
                ))}
              </div>
            ) : isMobile ? (
              /* ── Mobile Card Layout ── */
              <div className="vb-mobile-list">
                {filteredProducts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--vb-muted)' }}>
                    No products found.
                  </div>
                ) : filteredProducts.map((product: any, index: number) => {
                  const qty = poLines[product.id] || 0;
                  const hasQty = qty > 0;
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

                      <div className="vb-mobile-card-inputs">
                        <div className="vb-mobile-qty-wrap">
                          <span className="vb-mobile-qty-label">Unit Qty</span>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            inputMode="decimal"
                            enterKeyHint="next"
                            ref={(el) => { unitQtyRefs.current[product.id] = el; }}
                            value={poUnitQtys[product.id] || ''}
                            onChange={e => handleUnitQtyChange(product.id, e.target.value)}
                            onKeyDown={e => handleUnitQtyKeyDown(e, product.id)}
                            disabled={isLocked}
                            className="vb-mobile-qty-input"
                            placeholder="0"
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span className="vb-mobile-qty-label">Unit</span>
                          <select
                            className="vb-mobile-unit-select"
                            value={poUnits[product.id] || product.default_unit_id || 1}
                            onChange={(e) => setPoUnits(prev => ({ ...prev, [product.id]: parseInt(e.target.value) }))}
                            disabled={isLocked}
                          >
                            {units?.map((u: any) => (
                              <option key={u.id} value={u.id}>{u.code}</option>
                            ))}
                          </select>
                        </div>
                        <div className="vb-mobile-qty-wrap">
                          <span className="vb-mobile-qty-label">Quantity / அளவு</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            enterKeyHint="next"
                            ref={(el) => { inputRefs.current[product.id] = el; }}
                            value={qty || ''}
                            onChange={e => handleQtyChange(product.id, e.target.value)}
                            onKeyDown={e => handleKeyDown(e, index, filteredProducts)}
                            disabled={isLocked}
                            className="vb-mobile-qty-input"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── Desktop Table Layout ── */
              <table className="vb-table">
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th>Item</th>
                    <th style={{ textAlign: 'right', width: 90 }}>Unit Qty</th>
                    <th style={{ textAlign: 'center', width: 80 }}>Unit</th>
                    <th style={{ textAlign: 'right', width: 130 }}>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--vb-muted)' }}>
                        No products in this category.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product: any, index: number) => {
                      const qty = poLines[product.id];
                      const hasQty = qty && qty > 0;
                      return (
                        <tr key={product.id} style={{ background: hasQty ? 'var(--vb-green-pale)' : undefined }}>
                          <td>
                            <span className="vb-product-name-ta">{product.name_tamil || product.name}</span>
                            {product.name_tamil && (
                              <span className="vb-product-name-en">{product.name}</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              inputMode="decimal"
                              ref={(el): void => { unitQtyRefs.current[product.id] = el; }}
                              value={poUnitQtys[product.id] || ''}
                              onChange={e => handleUnitQtyChange(product.id, e.target.value)}
                              onKeyDown={e => handleUnitQtyKeyDown(e, product.id)}
                              disabled={isLocked}
                              className="vb-qty-input"
                              style={{ width: 90 }}
                              placeholder="0"
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <select
                              className="vb-select"
                              style={{ width: 80, padding: '4px 8px', fontSize: 13, height: 32 }}
                              value={poUnits[product.id] || product.default_unit_id || 1}
                              onChange={(e) => setPoUnits(prev => ({ ...prev, [product.id]: parseInt(e.target.value) }))}
                              disabled={isLocked}
                            >
                              {units?.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.code}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              ref={(el): void => { inputRefs.current[product.id] = el; }}
                              value={qty || ''}
                              onChange={e => handleQtyChange(product.id, e.target.value)}
                              onKeyDown={e => handleKeyDown(e, index, filteredProducts)}
                              disabled={isLocked}
                              className="vb-qty-input"
                              style={{ width: 110 }}
                              placeholder="0"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Sticky Save */}
      <div className="vb-sticky-action" style={{ padding: isMobile ? '8px 0 0 0' : '16px 0 8px 0' }}>
        <button
          onClick={handleSave}
          disabled={savePoMutation.isPending || isLocked || (isHeadOffice && !selectedBranchId)}
          className="vb-btn vb-btn-save"
          style={{ width: '100%', height: isMobile ? 44 : 48 }}
        >
          {savePoMutation.isPending ? (
            <span style={{ width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
          ) : <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: isMobile ? 14 : 16 }}>
                ✅ Save Closing Stock
                {!isMobile && <span style={{ opacity: 0.8, fontSize: 14 }}>— கையிருப்பு சேமிக்கவும்</span>}
              </span>}
        </button>
      </div>
    </div>
  );
};

export default PoEntry;
