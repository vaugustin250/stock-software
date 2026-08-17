import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Store, Search, X, Check, Save } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const show = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };
  return { toast, show };
}

export default function MarketPurchase() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { toast, show: showToast } = useToast();
  
  const [step, setStep] = useState<1 | 2>(1); // 1: Supplier, 2: Products
  
  // Supplier State
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  // Products State
  const [searchTerm, setSearchTerm] = useState('');
  const [purchaseLines, setPurchaseLines] = useState<Record<number, { qty: number, rate: number, total_rate: number, unit_id: number, unit_qty: number }>>({});
  
  const { data: allSuppliers = [] } = useQuery({
    queryKey: ['all_suppliers'],
    queryFn: async () => {
      const res = await api.get(`/masters/suppliers`);
      return res.data;
    }
  });

  const supplierResults = allSuppliers.filter((s: any) => {
    if (!supplierSearch.trim()) return true;
    const term = supplierSearch.toLowerCase();
    return (s.name || '').toLowerCase().includes(term) ||
      (s.shop_no || '').toLowerCase().includes(term) ||
      (s.hall || '').toLowerCase().includes(term);
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/masters/products')).data
  });

  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: async () => (await api.get('/masters/units')).data
  });

  const today = new Date().toISOString().split('T')[0];
  const { data: allocations } = useQuery({
    queryKey: ['my_allocations', today],
    queryFn: async () => (await api.get(`/allocation/my?date=${today}`)).data
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const lines = Object.entries(purchaseLines)
        .map(([pid, data]) => ({
          product_id: parseInt(pid),
          unit_id: data.unit_id || products?.find((p: any) => p.id === parseInt(pid))?.default_unit_id || 1,
          qty_purchased: data.qty,
          unit_qty: data.unit_qty,
          rate: data.rate,
        }))
        .filter(l => l.qty_purchased > 0 || l.unit_qty > 0);
        
      if (lines.length === 0) throw new Error("No products entered");

      return api.post('/purchase/entry', { 
        lines, 
        supplier_id: selectedSupplier?.id || null 
      });
    },
    onSuccess: () => {
      showToast('Purchase saved successfully!');
      setPurchaseLines({});
      setSelectedSupplier(null);
      setSupplierSearch('');
      setStep(1);
      queryClient.invalidateQueries({ queryKey: ['wallet_balance'] });
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || err.message || 'Error saving purchase', 'error');
    }
  });

  const handleChange = (pid: number, field: 'qty' | 'rate' | 'unit_qty' | 'total_rate', val: string) => {
    const num = parseFloat(val);
    const value = isNaN(num) ? 0 : num;
    
    setPurchaseLines(prev => {
      const current = prev[pid] || { qty: 0, rate: 0, total_rate: 0, unit_id: 1, unit_qty: 0 };
      const updated = { ...current, [field]: value };
      
      if (field === 'qty') {
        if (updated.qty > 0 && updated.rate > 0) updated.total_rate = updated.qty * updated.rate;
        else if (updated.qty > 0 && updated.total_rate > 0) updated.rate = updated.total_rate / updated.qty;
      } else if (field === 'rate') {
        updated.total_rate = updated.qty * updated.rate;
      } else if (field === 'total_rate') {
        if (updated.qty > 0) updated.rate = updated.total_rate / updated.qty;
      }
      
      return { ...prev, [pid]: updated };
    });
  };

  const handleUnitChange = (pid: number, unit_id: number) => {
    setPurchaseLines(prev => ({
      ...prev,
      [pid]: { ...(prev[pid] || { qty: 0, rate: 0, total_rate: 0, unit_qty: 0 }), unit_id }
    }));
  };

  const filteredProducts = (products || []).filter((p: any) => {
    if (searchTerm.trim() === '') return true;
    const term = searchTerm.toLowerCase();
    return (p.name || '').toLowerCase().includes(term) ||
      (p.name_tamil || '').toLowerCase().includes(term) ||
      (p.code || '').toLowerCase().includes(term);
  });

  const enteredCount = Object.keys(purchaseLines).filter(id => (purchaseLines[parseInt(id)]?.qty || 0) > 0).length;
  const totalAmount = Object.values(purchaseLines).reduce((sum, item) => sum + ((item.qty || 0) * (item.rate || 0)), 0);

  return (
    <div className="vb-page">
      {toast && (
        <div className="vb-toast-wrap">
          <div className={`vb-toast ${toast.type}`}>{toast.msg}</div>
        </div>
      )}

      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Buy Stock</h1>
          <p className="vb-page-sub">Enter market purchases</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        
        {/* Step 1: Select Supplier */}
        <div className="vb-card" style={{ padding: 16, marginBottom: 16, border: step === 1 ? '2px solid var(--vb-blue)' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: step === 1 ? 12 : 0 }}>
            <label className="vb-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, color: step === 1 ? 'var(--vb-blue)' : 'var(--vb-muted)' }}>
              <Store size={18} />
              {step === 1 ? 'Step 1: Select Supplier' : 'Supplier'}
            </label>
            {step === 2 && (
              <button className="vb-btn vb-btn-outline-blue" style={{ height: 28, padding: '0 12px', fontSize: 12 }} onClick={() => setStep(1)}>
                Change
              </button>
            )}
          </div>
          
          {step === 1 && (
            <div style={{ position: 'relative' }}>
              <input
                className="vb-input"
                style={{ height: 44, paddingLeft: 14 }}
                placeholder="Search Hall, Shop No, or Name..."
                value={supplierSearch}
                onChange={e => { setSupplierSearch(e.target.value); setShowSupplierDropdown(true); }}
                onFocus={() => setShowSupplierDropdown(true)}
                onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
              />
              {showSupplierDropdown && (supplierResults as any[]).length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#fff', border: '1px solid var(--vb-border)', borderRadius: 10, boxShadow: 'var(--vb-shadow-md)', maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                  {(supplierResults as any[]).map((s: any) => (
                    <div
                      key={s.id}
                      style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid var(--vb-border)' }}
                      onMouseDown={() => { setSelectedSupplier(s); setSupplierSearch(''); setShowSupplierDropdown(false); setStep(2); }}
                    >
                      <span style={{ fontWeight: 700, color: 'var(--vb-blue)', marginRight: 8 }}>Hall {s.hall} – {s.shop_no}</span>
                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedSupplier && step === 2 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--vb-blue-pale)', borderRadius: 8, padding: '10px 14px', marginTop: 8 }}>
              <span style={{ fontWeight: 700, color: 'var(--vb-blue)' }}>Hall {selectedSupplier.hall} – {selectedSupplier.shop_no}</span>
              <span style={{ fontWeight: 600 }}>{selectedSupplier.name}</span>
            </div>
          )}
        </div>

        {/* Step 2: Select Products */}
        {step === 2 && (
          <div className="vb-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--vb-border)', background: '#f8fafc' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', top: 12, left: 12, color: '#64748b' }} />
                <input
                  type="text"
                  className="vb-input"
                  style={{ paddingLeft: 36, height: 40 }}
                  placeholder="Search item / பொருள் தேடு..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', top: 12, right: 12, color: '#ef4444', background: 'none', border: 'none' }}>
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '8px' : '16px' }}>
              {filteredProducts.map((p: any) => {
                const pd = purchaseLines[p.id] || { qty: '', rate: '', unit_id: p.default_unit_id || 1, unit_qty: '' };
                const isEntered = pd.qty > 0;
                const myAllocation = allocations?.data?.find((a: any) => a.product_id === p.id);
                
                return (
                  <div key={p.id} style={{ 
                    border: '1px solid var(--vb-border)', 
                    borderRadius: 8, 
                    marginBottom: 12,
                    background: isEntered ? 'var(--vb-blue-pale)' : '#fff',
                    borderColor: isEntered ? 'var(--vb-blue)' : myAllocation ? '#f59e0b' : 'var(--vb-border)',
                    overflow: 'hidden'
                  }}>
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--vb-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {p.name}
                          {myAllocation && (
                            <span className="vb-badge vb-badge-amber" style={{ fontSize: 10 }}>
                              Target: {parseFloat(myAllocation.total)} {myAllocation.unit_name}
                            </span>
                          )}
                        </div>
                        {p.name_tamil && <div style={{ fontSize: 13, color: '#64748b', fontFamily: "'Noto Sans Tamil', sans-serif" }}>{p.name_tamil}</div>}
                      </div>
                      {isEntered && <Check size={18} style={{ color: 'var(--vb-blue)' }} />}
                    </div>
                    
                    <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Unit</label>
                        <select
                          className="vb-select"
                          style={{ height: 36, fontSize: 13, padding: '0 8px' }}
                          value={pd.unit_id}
                          onChange={e => handleUnitChange(p.id, parseInt(e.target.value))}
                        >
                          {units?.map((u: any) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Unit Qty</label>
                        <input
                          type="number"
                          className="vb-input"
                          style={{ height: 36, fontSize: 14 }}
                          value={pd.unit_qty || ''}
                          onChange={e => handleChange(p.id, 'unit_qty', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Qty (KG)</label>
                        <input
                          type="number"
                          className="vb-input"
                          style={{ height: 36, fontSize: 14 }}
                          value={pd.qty || ''}
                          onChange={e => handleChange(p.id, 'qty', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Price per KG</label>
                        <input
                          type="number"
                          className="vb-input"
                          style={{ height: 36, fontSize: 14 }}
                          value={pd.rate || ''}
                          onChange={e => handleChange(p.id, 'rate', e.target.value)}
                          placeholder="₹ 0.00"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Total Amt</label>
                        <input
                          type="number"
                          className="vb-input"
                          style={{ height: 36, fontSize: 14 }}
                          value={pd.total_rate || ''}
                          onChange={e => handleChange(p.id, 'total_rate', e.target.value)}
                          placeholder="₹ 0.00"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid var(--vb-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{enteredCount} items</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--vb-blue)' }}>₹{totalAmount.toLocaleString()}</div>
              </div>
              
              <button 
                className="vb-btn vb-btn-primary" 
                disabled={enteredCount === 0 || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                style={{ padding: '0 24px', height: 44 }}
              >
                <Save size={18} />
                {saveMutation.isPending ? 'Saving...' : 'Save Purchase'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
