import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Truck } from 'lucide-react';

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
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const queryClient = useQueryClient();
  const { toast, show: showToast } = useToast();

  const { data: branches } = useQuery({
    queryKey: ['branches_transfer'],
    queryFn: async () => {
      try {
        const res = await axios.get('http://localhost:3000/masters/branches', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return res.data.filter((b: any) => b.type === 'BRANCH');
      } catch {
        return [
          { id: 2, name: 'RPC Branch 1', code: 'RPC1' },
          { id: 3, name: 'RPC Branch 2', code: 'RPC2' },
          { id: 4, name: 'RPC Branch 3', code: 'RPC3' },
        ];
      }
    }
  });

  const { data: groups } = useQuery({ queryKey: ['groups'] as const });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products_with_stock'],
    queryFn: async () => {
      try {
        const res = await axios.get('http://localhost:3000/masters/products', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return res.data.map((p: any) => ({ ...p, stock_balance: Math.floor(Math.random() * 150) + 50 }));
      } catch {
        return [
          { id: 101, group_id: 1, name: 'Tomato', name_tamil: 'தக்காளி', unit_name: 'KG', stock_balance: 480 },
          { id: 102, group_id: 1, name: 'Onion', name_tamil: 'வெங்காயம்', unit_name: 'KG', stock_balance: 200 },
          { id: 103, group_id: 1, name: 'Potato', name_tamil: 'உருளை', unit_name: 'Bag', stock_balance: 80 },
        ];
      }
    }
  });

  const { data: existingTransfer } = useQuery({
    queryKey: ['transfer_entry', new Date().toISOString().split('T')[0], selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return { lines: [] };
      try {
        const res = await axios.get(`http://localhost:3000/transfer/entry?branch_id=${selectedBranchId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return res.data;
      } catch {
        return { lines: [] };
      }
    },
    enabled: !!selectedBranchId,
  });

  useEffect(() => {
    if (existingTransfer?.lines?.length) {
      const init: Record<number, number> = {};
      existingTransfer.lines.forEach((l: any) => (init[l.product_id] = l.qty_sent));
      setTransferLines(init);
    } else if (selectedBranchId) {
      setTransferLines({});
    }
  }, [existingTransfer, selectedBranchId]);

  const saveMutation = useMutation({
    mutationFn: async (lines: any[]) => {
      await axios.post('http://localhost:3000/transfer/entry', { branch_id: selectedBranchId, lines }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number, list: any[]) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const next = list[idx + 1];
      if (next && inputRefs.current[next.id]) inputRefs.current[next.id]?.focus();
    }
  };

  const handleSave = () => {
    const lines = Object.entries(transferLines)
      .map(([pid, qty]) => ({
        product_id: parseInt(pid),
        unit_id: products?.find((p: any) => p.id === parseInt(pid))?.default_unit_id || 1,
        qty_sent: qty,
      }))
      .filter(l => l.qty_sent > 0);
    if (lines.length === 0) { showToast('Please enter at least one quantity.', 'error'); return; }
    saveMutation.mutate(lines);
  };

  const filteredProducts = products?.filter((p: any) =>
    selectedGroupId === '' || p.group_id === selectedGroupId
  ) || [];

  // Compute total remaining per product
  const overAllocated = filteredProducts.some((p: any) => {
    const sent = transferLines[p.id] || 0;
    return sent > p.stock_balance;
  });

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

      {/* Branch + Group pickers */}
      <div className="vb-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px' }}>
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
          <div style={{ flex: '1 1 200px' }}>
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
          {/* Over-allocation warning */}
          {overAllocated && (
            <div className="vb-warning-banner">
              ⚠ Some quantities exceed the available godown stock. Please reduce before saving.
            </div>
          )}

          <div className="vb-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                      <th style={{ textAlign: 'right', width: 130 }}>Available</th>
                      <th style={{ textAlign: 'right', width: 150 }}>Send Qty</th>
                      <th style={{ textAlign: 'right', width: 130 }}>Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product: any, idx: number) => {
                      const sentQty = transferLines[product.id] || 0;
                      const remaining = product.stock_balance - sentQty;
                      const isOver = remaining < 0;
                      return (
                        <tr key={product.id} style={{ background: isOver ? 'var(--vb-red-pale)' : sentQty > 0 ? 'var(--vb-green-pale)' : undefined }}>
                          <td>
                            <span className="vb-product-name-ta">{product.name_tamil || product.name}</span>
                            {product.name_tamil && <span className="vb-product-name-en">{product.name}</span>}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="vb-badge vb-badge-grey">{product.unit_name || 'KG'}</span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 15, color: 'var(--vb-muted)' }}>
                            {product.stock_balance}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number" min="0" step="0.01" inputMode="decimal"
                              ref={el => inputRefs.current[product.id] = el}
                              value={sentQty || ''}
                              onChange={e => handleQtyChange(product.id, e.target.value)}
                              onKeyDown={e => handleKeyDown(e, idx, filteredProducts)}
                              className={`vb-qty-input${isOver ? ' shortage' : ''}`}
                              style={{ width: 120 }}
                              placeholder="0"
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{
                              fontSize: 16, fontWeight: 800,
                              color: isOver ? 'var(--vb-red-dark)' : 'var(--vb-green-dark)',
                            }}>
                              {remaining}
                            </span>
                            {isOver && <div style={{ fontSize: 11, color: 'var(--vb-red)', fontWeight: 600 }}>Over!</div>}
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
