import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Calendar, Search, X } from 'lucide-react';

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
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [poLines, setPoLines] = useState<Record<number, number>>({});
  const [poUnits, setPoUnits] = useState<Record<number, number>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const queryClient = useQueryClient();
  const { toast, show: showToast } = useToast();

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

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

  const { data: todayPo } = useQuery({
    queryKey: ['po_entry', new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      const res = await api.get('/po/entry');
      return res.data;
    },
  });

  useEffect(() => {
    if (todayPo?.lines) {
      const initQty: Record<number, number> = {};
      const initUnit: Record<number, number> = {};
      (todayPo.lines as any[]).forEach((l: any) => {
        initQty[l.product_id] = l.qty;
        initUnit[l.product_id] = l.unit_id;
      });
      setPoLines(initQty);
      setPoUnits(initUnit);
    }
  }, [todayPo]);

  const savePoMutation = useMutation({
    mutationFn: async (lines: any[]) => {
      await api.post('/po/entry', { lines });
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number, list: any[]) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const next = list[idx + 1];
      if (next && inputRefs.current[next.id]) inputRefs.current[next.id]?.focus();
    }
  };

  const handleSave = () => {
    const linesToSave = Object.entries(poLines)
      .map(([pid, qty]) => {
        const numPid = parseInt(pid);
        return {
          product_id: numPid,
          unit_id: poUnits[numPid] || products?.find((p: any) => p.id === numPid)?.default_unit_id || 1,
          qty,
        };
      })
      .filter(l => l.qty > 0);

    if (linesToSave.length === 0) {
      showToast('Please enter at least one quantity.', 'error');
      return;
    }
    savePoMutation.mutate(linesToSave);
  };

  const filteredProducts = products?.filter((p: any) => {
    const matchesGroup = selectedGroupId === '' || p.group_id === selectedGroupId;
    if (!matchesGroup) return false;
    
    if (searchTerm.trim() === '') return true;
    const term = searchTerm.toLowerCase();
    const enName = (p.name || '').toLowerCase();
    const taName = (p.name_tamil || '').toLowerCase();
    const code = (p.code || '').toLowerCase();
    
    return enName.includes(term) || taName.includes(term) || code.includes(term);
  }) || [];

  const enteredCount = Object.values(poLines).filter(q => q > 0).length;
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
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Today's Order</h1>
          <p className="vb-page-sub" style={{ fontFamily: "'Noto Sans Tamil', sans-serif" }}>
            இன்றைய ஆர்டர் / Daily PO Entry
          </p>
        </div>
        <div className="vb-date-chip">
          <Calendar size={14} />
          {today}
        </div>
      </div>

      {(groupsError || productsError) && (
        <div className="vb-error-banner">
          ⚠ Could not load products or categories. Please check your connection and refresh.
        </div>
      )}

      {/* Locked banner */}
      {isLocked && (
        <div className="vb-warning-banner">
          🔒 This order has been locked by the Warehouse and cannot be edited.
        </div>
      )}

      {/* Filter + table card */}
      <div className="vb-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Category Selector & Search */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--vb-border)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', backgroundColor: '#f8fafc' }}>
          
          <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
            <div style={{ position: 'absolute', top: 12, left: 14, color: '#64748b' }}>
              <Search size={22} />
            </div>
            <input
              type="text"
              className="pos-input"
              style={{ paddingLeft: 44, paddingRight: 40 }}
              placeholder="🔍 Search English or Tamil... / பொருள் தேடு..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', top: 12, right: 14, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            )}
          </div>

          <div style={{ position: 'relative', width: 260 }}>
            <select
              className="pos-input"
              style={{ borderColor: '#cbd5e1', color: '#334155' }}
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value === '' ? '' : parseInt(e.target.value))}
            >
              <option value="">— All Categories —</option>
              {groups?.map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {enteredCount > 0 && (
            <div className="vb-badge vb-badge-green" style={{ fontSize: 13, padding: '6px 12px' }}>
              ✓ {enteredCount} item{enteredCount !== 1 ? 's' : ''} entered
            </div>
          )}
        </div>

        {/* Product Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoadingProducts ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              {[1,2,3,4].map(i => (
                <div key={i} className="vb-skeleton" style={{ height: 56, marginBottom: 8 }} />
              ))}
            </div>
          ) : (
            <table className="vb-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th>Item</th>
                  <th style={{ textAlign: 'center', width: 80 }}>Unit</th>
                  <th style={{ textAlign: 'right', width: 160 }}>Quantity</th>
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
                            style={{ width: 130 }}
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

      {/* Sticky Save */}
      <div className="vb-sticky-action">
        <button
          onClick={handleSave}
          disabled={savePoMutation.isPending || isLocked}
          className="vb-btn vb-btn-save"
          style={{ width: '100%' }}
        >
          {savePoMutation.isPending ? (
            <span style={{ width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
          ) : <>✅ Save Order — ஆர்டர் சேமிக்கவும்</>}
        </button>
      </div>
    </div>
  );
};

export default PoEntry;
