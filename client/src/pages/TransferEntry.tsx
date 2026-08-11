import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Truck, Filter } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const show = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };
  return { toast, show };
}

const TransferEntry = () => {
  const [selectedBranchId, setSelectedBranchId] = useState<number | ''>('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');
  const [transferLines, setTransferLines] = useState<Record<number, number>>({});
  const [transferUnits, setTransferUnits] = useState<Record<number, number>>({});
  const [transferUnitQtys, setTransferUnitQtys] = useState<Record<number, number>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [showEnteredOnly, setShowEnteredOnly] = useState(false);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const unitQtyRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const queryClient = useQueryClient();
  const { toast, show: showToast } = useToast();
  const isMobile = useIsMobile();

  const { data: branches, isError: branchesError } = useQuery({
    queryKey: ['branches_transfer'],
    queryFn: async () => {
      const res = await api.get('/masters/branches');
      return res.data.filter((b: any) => b.type === 'BRANCH');
    }
  });

  const { data: groups } = useQuery({ queryKey: ['groups'] as const });
  const { data: units } = useQuery({ queryKey: ['units'], queryFn: async () => (await api.get('/masters/units')).data });

  const { data: products, isLoading, isError: productsError } = useQuery({
    queryKey: ['products_with_stock'],
    queryFn: async () => {
      const res = await api.get('/masters/products');
      return res.data.map((p: any) => ({ ...p, stock_balance: p.stock_balance ?? 0 }));
    }
  });

  const { data: existingTransfer } = useQuery({
    queryKey: ['transfer_entry', new Date().toISOString().split('T')[0], selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return { lines: [] };
      const res = await api.get(`/transfer/entry?branch_id=${selectedBranchId}`);
      return res.data;
    },
    enabled: !!selectedBranchId,
  });

  const { data: branchPO } = useQuery({
    queryKey: ['po_entry', new Date().toISOString().split('T')[0], selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return { lines: [] };
      const res = await api.get(`/po/entry?branch_id=${selectedBranchId}`);
      return res.data;
    },
    enabled: !!selectedBranchId,
  });

  useEffect(() => {
    if (existingTransfer?.lines?.length) {
      const initQty: Record<number, number> = {};
      const initUnit: Record<number, number> = {};
      const initUnitQty: Record<number, number> = {};
      existingTransfer.lines.forEach((l: any) => {
        initQty[l.product_id] = l.qty_sent;
        initUnit[l.product_id] = l.unit_id;
        initUnitQty[l.product_id] = l.unit_qty;
      });
      setTransferLines(initQty);
      setTransferUnits(initUnit);
      setTransferUnitQtys(initUnitQty);
    } else if (selectedBranchId) {
      setTransferLines({});
      setTransferUnits({});
      setTransferUnitQtys({});
    }
  }, [existingTransfer, selectedBranchId]);

  const saveMutation = useMutation({
    mutationFn: async (lines: any[]) => {
      await api.post('/transfer/entry', { branch_id: selectedBranchId, lines });
    },
    onSuccess: () => {
      setShowSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['transfer_entry'] });
      setTimeout(() => setShowSuccess(false), 1600);
    },
    onError: () => showToast('Save failed. Please try again.', 'error'),
  });

  const handleQtyChange = (pid: number, val: string) => {
    const qty = parseFloat(val);
    setTransferLines(prev => ({ ...prev, [pid]: isNaN(qty) ? 0 : qty }));
  };

  const handleUnitQtyChange = (pid: number, val: string) => {
    const qty = parseFloat(val);
    setTransferUnitQtys(prev => ({ ...prev, [pid]: isNaN(qty) ? 0 : qty }));
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
    const lines = Object.entries(transferLines)
      .map(([pid, qty]) => {
        const numPid = parseInt(pid);
        return {
          product_id: numPid,
          unit_id: transferUnits[numPid] || products?.find((p: any) => p.id === numPid)?.default_unit_id || 1,
          qty_sent: qty,
          unit_qty: transferUnitQtys[numPid] || 0
        };
      })
      .filter(l => l.qty_sent > 0 || l.unit_qty > 0);
    if (lines.length === 0) { showToast('Please enter at least one quantity.', 'error'); return; }
    saveMutation.mutate(lines);
  };

  const closingStockMap = new Map();
  branchPO?.lines?.forEach((row: any) => {
    closingStockMap.set(row.product_id, row.qty);
  });

  const baseFiltered = (products || [])
    .filter((p: any) => selectedGroupId === '' || p.group_id === selectedGroupId);

  const filteredProducts = showEnteredOnly
    ? baseFiltered.filter((p: any) => (transferLines[p.id] || 0) > 0 || (transferUnitQtys[p.id] || 0) > 0)
    : baseFiltered;

  const overAllocated = filteredProducts.some((p: any) => {
    const sent = transferLines[p.id] || 0;
    return p.stock_balance > 0 && sent > p.stock_balance;
  });

  const enteredCount = Object.keys(transferLines).filter(id => transferLines[parseInt(id)] > 0 || transferUnitQtys[parseInt(id)] > 0).length;
  const selectedBranch = branches?.find((b: any) => b.id === selectedBranchId);

  return (
    <div className="vb-page">

      {showSuccess && (
        <div className="vb-success-overlay">
          <div className="vb-success-icon">🚚</div>
          <div className="vb-success-text">Stock Sent!</div>
          <div style={{ color: 'rgba(255,255,255,0.85)', marginTop: 8, fontSize: 15 }}>
            {selectedBranch ? `Sent to ${selectedBranch.name}` : ''}
          </div>
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
          <h1 className="vb-page-title">Send Stock to Branch</h1>
          <p className="vb-page-sub">Dispatch from Godown</p>
        </div>
      </div>

      {(branchesError || productsError) && (
        <div className="vb-error-banner">
          ⚠ Could not load branches or products. Please check your connection and refresh.
        </div>
      )}

      {/* Branch + Group pickers */}
      <div className="vb-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label className="vb-label">Send To Branch</label>
            <select
              className="vb-select"
              value={selectedBranchId}
              onChange={e => { setSelectedBranchId(e.target.value === '' ? '' : parseInt(e.target.value)); setTransferLines({}); }}
            >
              <option value="">— Select Branch —</option>
              {branches?.map((b: any) => (
                <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label className="vb-label">Filter by Category</label>
            <select
              className="vb-select"
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value === '' ? '' : parseInt(e.target.value))}
            >
              <option value="">— All —</option>
              {(groups as any[])?.map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedBranchId === '' ? (
        <div className="vb-card" style={{ padding: '64px 32px', textAlign: 'center' }}>
          <Truck size={48} style={{ color: 'var(--vb-muted)', marginBottom: 16 }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--vb-muted)' }}>
            Select a destination branch to begin
          </div>
        </div>
      ) : (
        <>
          {overAllocated && (
            <div className="vb-warning-banner">
              ⚠ Some quantities exceed the available godown stock. Please reduce before saving.
            </div>
          )}

          <div className="vb-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div className="vb-entry-toolbar">
              <span style={{ fontSize: 13, color: 'var(--vb-muted)', fontWeight: 500 }}>
                {filteredProducts.length} items
              </span>
              {enteredCount > 0 && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="vb-badge vb-badge-green" style={{ fontSize: 12, padding: '4px 10px' }}>
                    ✓ {enteredCount} filled
                  </span>
                  <button
                    className={`vb-toggle-btn${showEnteredOnly ? ' active' : ''}`}
                    onClick={() => setShowEnteredOnly(v => !v)}
                  >
                    <Filter size={13} />
                    {showEnteredOnly ? 'Show All' : 'Review filled'}
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
                  {filteredProducts.map((product: any, idx: number) => {
                    const sentQty = transferLines[product.id] || 0;
                    const closingStock = closingStockMap.get(product.id) || 0;
                    const isOver = product.stock_balance > 0 && sentQty > product.stock_balance;
                    const hasQty = sentQty > 0;

                    return (
                      <div
                        key={product.id}
                        className={`vb-mobile-card${isOver ? ' is-over' : hasQty ? ' has-qty' : ''}`}
                      >
                        <div className="vb-mobile-card-name">
                          {product.name_tamil || product.name}
                        </div>
                        {product.name_tamil && (
                          <span className="vb-mobile-card-name-en">{product.name}</span>
                        )}

                        <div className="vb-mobile-card-chips">
                          {product.stock_balance > 0 && (
                            <span className="vb-chip vb-chip-grey">📦 Avail: {product.stock_balance}</span>
                          )}
                          {closingStock > 0 && (
                            <span className="vb-chip vb-chip-blue" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' }}>📦 Closing Stock: {closingStock}</span>
                          )}
                          {isOver && (
                            <span className="vb-chip vb-chip-red">⚠ Exceeds stock!</span>
                          )}
                        </div>

                        <div className="vb-mobile-card-inputs">
                          <div className="vb-mobile-qty-wrap">
                            <span className="vb-mobile-qty-label">Unit Qty</span>
                            <input
                              type="number" min="0" step="0.1" inputMode="decimal" enterKeyHint="next"
                              ref={(el) => { unitQtyRefs.current[product.id] = el; }}
                              value={transferUnitQtys[product.id] || ''}
                              onChange={e => handleUnitQtyChange(product.id, e.target.value)}
                              onKeyDown={e => handleUnitQtyKeyDown(e, product.id)}
                              className="vb-mobile-qty-input"
                              placeholder="0"
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span className="vb-mobile-qty-label">Unit</span>
                            <select
                              className="vb-mobile-unit-select"
                              value={transferUnits[product.id] || product.default_unit_id || 1}
                              onChange={(e) => setTransferUnits(prev => ({ ...prev, [product.id]: parseInt(e.target.value) }))}
                            >
                              {units?.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.code}</option>
                              ))}
                            </select>
                          </div>
                          <div className="vb-mobile-qty-wrap">
                            <span className="vb-mobile-qty-label">Send Qty (KG)</span>
                            <input
                              type="number" min="0" step="0.01" inputMode="decimal" enterKeyHint="next"
                              ref={(el) => { inputRefs.current[product.id] = el; }}
                              value={sentQty || ''}
                              onChange={e => handleQtyChange(product.id, e.target.value)}
                              onKeyDown={e => handleKeyDown(e, idx, filteredProducts)}
                              className={`vb-mobile-qty-input${isOver ? ' shortage' : ''}`}
                              placeholder="0"
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
                      <th style={{ textAlign: 'right', width: 100 }}>Available</th>
                      <th style={{ textAlign: 'right', width: 120 }}>Closing Stock</th>
                      <th style={{ textAlign: 'right', width: 130 }}>Send Qty (KG)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product: any, idx: number) => {
                      const sentQty = transferLines[product.id] || 0;
                      const unitQty = transferUnitQtys[product.id] || 0;
                      const closingStock = closingStockMap.get(product.id) || 0;
                      const isOver = product.stock_balance > 0 && sentQty > product.stock_balance;
                      const rowStyle = isOver ? 'var(--vb-red-pale)' : (sentQty > 0 ? 'var(--vb-green-pale)' : undefined);

                      return (
                        <tr key={product.id} style={{ background: rowStyle }}>
                          <td>
                            <span className="vb-product-name-ta">{product.name_tamil || product.name}</span>
                            {product.name_tamil && <span className="vb-product-name-en">{product.name}</span>}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number" min="0" step="0.1" inputMode="decimal"
                              ref={(el): void => { unitQtyRefs.current[product.id] = el; }}
                              value={unitQty || ''}
                              onChange={e => handleUnitQtyChange(product.id, e.target.value)}
                              onKeyDown={e => handleUnitQtyKeyDown(e, product.id)}
                              className="vb-qty-input"
                              style={{ width: 90 }}
                              placeholder="0"
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <select
                              className="vb-select"
                              style={{ width: 80, padding: '4px 8px', fontSize: 13, height: 32 }}
                              value={transferUnits[product.id] || product.default_unit_id || 1}
                              onChange={(e) => setTransferUnits(prev => ({ ...prev, [product.id]: parseInt(e.target.value) }))}
                            >
                              {units?.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.code}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--vb-muted)' }}>
                            {product.stock_balance || '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: '#475569' }}>
                            {closingStock > 0 ? closingStock : '—'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number" min="0" step="0.01" inputMode="decimal"
                              ref={(el) => { inputRefs.current[product.id] = el; }}
                              value={sentQty || ''}
                              onChange={e => handleQtyChange(product.id, e.target.value)}
                              onKeyDown={e => handleKeyDown(e, idx, filteredProducts)}
                              className={`vb-qty-input${isOver ? ' shortage' : ''}`}
                              style={{ width: 120 }}
                              placeholder="0"
                            />
                            {isOver && <div style={{ fontSize: 11, color: 'var(--vb-red)', fontWeight: 600 }}>Over stock!</div>}
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
              disabled={saveMutation.isPending || overAllocated}
              className="vb-btn vb-btn-save"
              style={{ width: '100%' }}
            >
              {saveMutation.isPending ? (
                <span style={{ width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              ) : overAllocated ? '⚠ Fix over-allocated rows first' : '🚚 Send Stock'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TransferEntry;
