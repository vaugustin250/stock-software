import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Package, Search, X } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const show = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };
  return { toast, show };
}

const ReceivingConfirmation = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [receivingLines, setReceivingLines] = useState<Record<number, number>>({});
  const [receivingUnitQtys, setReceivingUnitQtys] = useState<Record<number, number>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const unitQtyRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const queryClient = useQueryClient();
  const { toast, show: showToast } = useToast();
  const isMobile = useIsMobile();

  const { data: receivingData, isLoading, isError, refetch } = useQuery({
    queryKey: ['receiving_entry', new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      const res = await api.get('/receiving/pending');
      return res.data;
    },
  });

  useEffect(() => {
    if (receivingData?.lines) {
      const init: Record<number, number> = {};
      const initUnitQty: Record<number, number> = {};
      receivingData.lines.forEach((l: any) => {
        init[l.transfer_entry_line_id] = l.qty_received !== null ? l.qty_received : l.qty_sent;
        initUnitQty[l.transfer_entry_line_id] = l.received_unit_qty !== null ? l.received_unit_qty : (l.sent_unit_qty || 0);
      });
      setReceivingLines(init);
      setReceivingUnitQtys(initUnitQty);
    }
  }, [receivingData]);

  const saveMutation = useMutation({
    mutationFn: async (lines: any[]) => {
      await api.post('/receiving/confirm', {
        transfer_entry_id: (receivingData as any)?.transfer?.id,
        lines,
      });
    },
    onSuccess: () => {
      setShowSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['receiving_entry'] });
      setTimeout(() => setShowSuccess(false), 1600);
    },
    onError: () => showToast('Save failed. Please try again.', 'error'),
  });

  const handleQtyChange = (id: number, val: string) => {
    const qty = parseFloat(val);
    setReceivingLines(prev => ({ ...prev, [id]: isNaN(qty) ? 0 : qty }));
  };

  const handleUnitQtyChange = (id: number, val: string) => {
    const qty = parseFloat(val);
    setReceivingUnitQtys(prev => ({ ...prev, [id]: isNaN(qty) ? 0 : qty }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number, lines: any[]) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const next = lines[idx + 1];
      if (next && unitQtyRefs.current[next.transfer_entry_line_id]) {
        unitQtyRefs.current[next.transfer_entry_line_id]?.focus();
      }
    }
  };

  const handleUnitQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRefs.current[id]?.focus();
    }
  };

  const handleSave = () => {
    if (!receivingData?.transfer) return;
    const lines = Object.entries(receivingLines).map(([id, qty]) => ({
      transfer_entry_line_id: parseInt(id),
      qty_received: qty,
      unit_qty: receivingUnitQtys[parseInt(id)] || 0
    }));
    saveMutation.mutate(lines);
  };

  const allLines = receivingData?.lines || [];

  const lines = allLines.filter((l: any) => {
    if (searchTerm.trim() === '') return true;
    const term = searchTerm.toLowerCase();
    return (l.product_name || '').toLowerCase().includes(term) ||
      (l.product_name_tamil || '').toLowerCase().includes(term) ||
      (l.product_code || '').toLowerCase().includes(term);
  });

  const shortages = lines.filter((l: any) => {
    const recv = receivingLines[l.transfer_entry_line_id];
    return recv !== undefined && recv < l.qty_sent;
  });

  return (
    <div className="vb-page">

      {/* Success overlay */}
      {showSuccess && (
        <div className="vb-success-overlay">
          <div className="vb-success-icon">✅</div>
          <div className="vb-success-text">Received & Saved!</div>
          <div style={{ color: 'rgba(255,255,255,0.85)', marginTop: 8, fontSize: 15, fontFamily: "'Noto Sans Tamil', sans-serif" }}>
            பொருட்கள் உறுதிசெய்யப்பட்டது!
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
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Receive Stock</h1>
          <p className="vb-page-sub">
            From Godown — Sent Today&nbsp;
            {receivingData?.transfer?.transfer_date && (
              <span className="vb-badge vb-badge-blue">{receivingData.transfer.transfer_date}</span>
            )}
          </p>
        </div>
        {shortages.length > 0 && (
          <div className="vb-badge vb-badge-amber" style={{ fontSize: 13, padding: '6px 12px' }}>
            ⚠ {shortages.length} shortage{shortages.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>

      {isError && (
        <div className="vb-error-banner">
          ⚠ Could not load pending transfers.{' '}
          <button className="vb-btn vb-btn-sm vb-btn-outline-blue" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* No transfer */}
      {!receivingData?.transfer && !isLoading ? (
        <div className="vb-card" style={{ padding: '64px 32px', textAlign: 'center' }}>
          <Package size={48} style={{ color: 'var(--vb-muted)', marginBottom: 16 }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--vb-muted)' }}>
            No pending transfers from Godown today.
          </div>
          <div style={{ fontSize: 14, color: 'var(--vb-muted)', marginTop: 8, fontFamily: "'Noto Sans Tamil', sans-serif" }}>
            இன்று எந்த பொருளும் அனுப்பப்படவில்லை.
          </div>
        </div>
      ) : (
        <>
          <div className="vb-card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Search Bar */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--vb-border)', backgroundColor: '#f8fafc' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <div style={{ position: 'absolute', top: 12, left: 14, color: '#64748b' }}>
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  className="pos-input"
                  style={{ paddingLeft: 40, paddingRight: 36, height: 44 }}
                  placeholder="Search item / பொருள் தேடு..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{ position: 'absolute', top: 12, right: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {isLoading ? (
                <div style={{ padding: 32 }}>
                  {[1, 2, 3].map(i => <div key={i} className="vb-skeleton" style={{ height: 64, marginBottom: 8 }} />)}
                </div>
              ) : isMobile ? (
                /* ── Mobile Card Layout ── */
                <div className="vb-mobile-list">
                  {lines.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--vb-muted)' }}>
                      No items found.
                    </div>
                  ) : lines.map((line: any, index: number) => {
                    const recv = receivingLines[line.transfer_entry_line_id];
                    const diff = recv !== undefined ? recv - line.qty_sent : 0;
                    const isShort = diff < 0;
                    const hasRecv = recv !== undefined && recv > 0;

                    return (
                      <div
                        key={line.transfer_entry_line_id}
                        className={`vb-mobile-card${isShort ? ' is-over' : hasRecv ? ' has-qty' : ''}`}
                      >
                        <div className="vb-mobile-card-name">
                          {line.product_name_tamil || line.product_name}
                        </div>
                        {line.product_name_tamil && (
                          <span className="vb-mobile-card-name-en">{line.product_name}</span>
                        )}

                        <div className="vb-mobile-card-chips">
                          <span className="vb-chip vb-chip-blue">📦 Sent: {line.qty_sent}</span>
                          {diff !== 0 && (
                            <span className={`vb-chip ${diff < 0 ? 'vb-chip-red' : 'vb-chip-green'}`}>
                              {diff > 0 ? `+${diff.toFixed(2)} extra` : `${Math.abs(diff).toFixed(2)} short`}
                            </span>
                          )}
                          {diff === 0 && recv !== undefined && (
                            <span className="vb-chip vb-chip-green">✓ Matches</span>
                          )}
                        </div>

                        <div className="vb-mobile-card-inputs">
                          <div className="vb-mobile-qty-wrap">
                            <span className="vb-mobile-qty-label">Unit Qty Received</span>
                            <input
                              type="number" min="0" step="0.1" inputMode="decimal" enterKeyHint="next"
                              ref={(el) => { unitQtyRefs.current[line.transfer_entry_line_id] = el; }}
                              value={receivingUnitQtys[line.transfer_entry_line_id] !== undefined ? receivingUnitQtys[line.transfer_entry_line_id] : ''}
                              onChange={e => handleUnitQtyChange(line.transfer_entry_line_id, e.target.value)}
                              onKeyDown={e => handleUnitQtyKeyDown(e, line.transfer_entry_line_id)}
                              className="vb-mobile-qty-input"
                            />
                          </div>
                          <div className="vb-mobile-qty-wrap">
                            <span className="vb-mobile-qty-label">You Received (KG) / பெற்றது</span>
                            <input
                              type="number" min="0" step="0.01" inputMode="decimal" enterKeyHint="next"
                              ref={(el) => { inputRefs.current[line.transfer_entry_line_id] = el; }}
                              value={recv !== undefined ? recv : ''}
                              onChange={e => handleQtyChange(line.transfer_entry_line_id, e.target.value)}
                              onKeyDown={e => handleKeyDown(e, index, lines)}
                              className={`vb-mobile-qty-input${isShort ? ' shortage' : ''}`}
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
                      <th>Item / பொருள்</th>
                      <th style={{ textAlign: 'right', width: 90 }}>Unit Qty</th>
                      <th style={{ textAlign: 'right', width: 110 }}>Sent</th>
                      <th style={{ textAlign: 'right', width: 160 }}>You Received (KG)</th>
                      <th style={{ textAlign: 'right', width: 110 }}>Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line: any, index: number) => {
                      const recv = receivingLines[line.transfer_entry_line_id];
                      const diff = recv !== undefined ? recv - line.qty_sent : 0;
                      const isShort = diff < 0;

                      return (
                        <tr key={line.transfer_entry_line_id} className={isShort ? 'row-shortage' : ''}>
                          <td>
                            <span className="vb-product-name-ta">{line.product_name_tamil || line.product_name}</span>
                            {line.product_name_tamil && (
                              <span className="vb-product-name-en">{line.product_name}</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number" min="0" step="0.1" inputMode="decimal"
                              ref={(el): void => { unitQtyRefs.current[line.transfer_entry_line_id] = el; }}
                              value={receivingUnitQtys[line.transfer_entry_line_id] !== undefined ? receivingUnitQtys[line.transfer_entry_line_id] : ''}
                              onChange={e => handleUnitQtyChange(line.transfer_entry_line_id, e.target.value)}
                              onKeyDown={e => handleUnitQtyKeyDown(e, line.transfer_entry_line_id)}
                              className="vb-qty-input"
                              style={{ width: 90 }}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 16 }}>
                            {line.qty_sent}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number" min="0" step="0.01" inputMode="decimal"
                              ref={(el) => { inputRefs.current[line.transfer_entry_line_id] = el; }}
                              value={recv !== undefined ? recv : ''}
                              onChange={e => handleQtyChange(line.transfer_entry_line_id, e.target.value)}
                              onKeyDown={e => handleKeyDown(e, index, lines)}
                              className={`vb-qty-input${isShort ? ' shortage' : ''}`}
                              style={{ width: 130 }}
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {diff !== 0 ? (
                              <div>
                                <span style={{ fontSize: 14, fontWeight: 800, color: diff < 0 ? 'var(--vb-red-dark)' : 'var(--vb-green-dark)' }}>
                                  {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                                </span>
                                {isShort && (
                                  <div style={{ fontSize: 11, color: 'var(--vb-amber-dark)', fontWeight: 600, marginTop: 2 }}>
                                    {Math.abs(diff).toFixed(2)} short
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--vb-muted)', fontSize: 13 }}>✓ OK</span>
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

          {/* Sticky Save */}
          <div className="vb-sticky-action">
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending || !(receivingData as any)?.transfer}
              className="vb-btn vb-btn-save"
              style={{ width: '100%' }}
            >
              {saveMutation.isPending ? (
                <span style={{ width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              ) : '✅ Confirm Receipt — பெறுதல் உறுதி'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ReceivingConfirmation;
