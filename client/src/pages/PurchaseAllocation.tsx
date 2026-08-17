import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Save, Calendar, CheckSquare, Search, X } from 'lucide-react';

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const show = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };
  return { toast, show };
}

export default function PurchaseAllocation() {
  const queryClient = useQueryClient();
  const { toast, show: showToast } = useToast();
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [allocations, setAllocations] = useState<Record<string, Record<number, number>>>({}); // [product_id][pm_id] = qty

  const [search, setSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');
  const [selectedDeptId, setSelectedDeptId] = useState<number | ''>('');

  const { data, isLoading } = useQuery({
    queryKey: ['purchase_allocations', date],
    queryFn: async () => (await api.get(`/allocation?date=${date}`)).data
  });

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => (await api.get('/masters/group')).data
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/masters/department')).data
  });

  // Initialize state from fetched data
  useEffect(() => {
    if (data?.matrix) {
      const init: Record<string, Record<number, number>> = {};
      data.matrix.forEach((row: any) => {
        init[row.product_id] = { ...row.allocations };
      });
      setAllocations(init);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!data?.purchaseMen) return;
      const payload: any[] = [];
      
      Object.keys(allocations).forEach(productId => {
        const prodId = parseInt(productId);
        const row = data.matrix.find((m: any) => m.product_id === prodId);
        if (!row) return;

        Object.keys(allocations[productId]).forEach(pmId => {
          const qty = allocations[productId][parseInt(pmId)];
          payload.push({
            purchase_man_id: parseInt(pmId),
            product_id: prodId,
            allocated_qty: qty,
            unit_id: row.unit_id
          });
        });
      });

      return api.post('/allocation', { date, allocations: payload });
    },
    onSuccess: () => {
      showToast('Allocations saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['purchase_allocations', date] });
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  });

  const handleChange = (productId: number, pmId: number, val: string) => {
    const num = parseFloat(val);
    setAllocations(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [pmId]: isNaN(num) ? 0 : num
      }
    }));
  };

  const getRowTotal = (productId: number) => {
    if (!allocations[productId]) return 0;
    return Object.values(allocations[productId]).reduce((sum, qty) => sum + (qty || 0), 0);
  };

  const matrix = data?.matrix || [];
  const purchaseMen = data?.purchaseMen || [];

  const filteredMatrix = matrix.filter((row: any) => {
    const matchesSearch = row.product_name.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = selectedGroupId === '' || row.group_id === selectedGroupId;
    const matchesDept = selectedDeptId === '' || row.department_id === selectedDeptId;
    return matchesSearch && matchesGroup && matchesDept;
  });

  return (
    <div className="vb-page">
      {toast && (
        <div className="vb-toast-wrap">
          <div className={`vb-toast ${toast.type}`}>{toast.msg}</div>
        </div>
      )}

      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Assign Purchases</h1>
          <p className="vb-page-sub">Allocate daily godown requirements to Purchase Men</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Calendar size={16} style={{ position: 'absolute', top: 10, left: 12, color: '#64748b' }} />
            <input 
              type="date" 
              className="vb-input"
              style={{ paddingLeft: 36, height: 36 }}
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <button 
            className="vb-btn vb-btn-primary" 
            style={{ height: 36 }}
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isLoading}
          >
            <Save size={16} />
            {saveMutation.isPending ? 'Saving...' : 'Save Allocations'}
          </button>
        </div>
      </div>

      <div className="vb-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--vb-border)', display: 'flex', gap: 16, backgroundColor: '#f8fafc', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={16} style={{ position: 'absolute', top: 10, left: 12, color: '#64748b' }} />
            <input
              type="text"
              className="vb-input"
              placeholder="Search product..."
              style={{ paddingLeft: 36, height: 36 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', top: 10, right: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <select 
            className="vb-input" 
            style={{ width: 160, height: 36 }}
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value ? parseInt(e.target.value) : '')}
          >
            <option value="">All Categories</option>
            {groups?.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select 
            className="vb-input" 
            style={{ width: 160, height: 36 }}
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value ? parseInt(e.target.value) : '')}
          >
            <option value="">All Departments</option>
            {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="vb-table-container">
          <table className="vb-table">
            <thead>
              <tr>
                <th style={{ minWidth: 200, position: 'sticky', left: 0, zIndex: 10 }}>Product</th>
                <th style={{ width: 100, textAlign: 'center' }}>Unit</th>
                <th style={{ width: 120, textAlign: 'right' }}>Closing Stock (KG)</th>
                <th style={{ width: 120, textAlign: 'right', borderRight: '2px solid var(--vb-border)' }}>Total Assigned (KG)</th>
                {purchaseMen.map((pm: any) => (
                  <th key={pm.id} style={{ minWidth: 120, textAlign: 'center', background: 'var(--vb-blue-pale)', color: 'var(--vb-blue)' }}>
                    {pm.username}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={purchaseMen.length + 4} style={{ textAlign: 'center', padding: 40, color: 'var(--vb-muted)' }}>
                    Loading allocations...
                  </td>
                </tr>
              ) : filteredMatrix.length === 0 ? (
                <tr>
                  <td colSpan={purchaseMen.length + 4} style={{ textAlign: 'center', padding: 40, color: 'var(--vb-muted)' }}>
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredMatrix.map((row: any) => {
                  const totalAssigned = getRowTotal(row.product_id);
                  const isAssigned = totalAssigned > 0;
                  
                  return (
                    <tr key={row.product_id} style={{ background: isAssigned ? '#f8fafc' : 'white' }}>
                      <td style={{ position: 'sticky', left: 0, zIndex: 5, background: isAssigned ? '#f8fafc' : 'white' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.product_name}</div>
                        {row.product_name_tamil && <div style={{ fontSize: 12, color: '#64748b' }}>{row.product_name_tamil}</div>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="vb-badge vb-badge-gray">{row.unit_name}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#f59e0b' }}>
                          {row.total_closing_qty}
                        </div>
                        {row.total_closing_unit_qty > 0 && (
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            ({row.total_closing_unit_qty} {row.closing_unit_name || 'units'})
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', borderRight: '2px solid var(--vb-border)' }}>
                        <span style={{ 
                          fontWeight: 700, fontSize: 15, 
                          color: isAssigned ? '#10b981' : '#64748b'
                        }}>
                          {totalAssigned}
                        </span>
                      </td>
                      
                      {purchaseMen.map((pm: any) => {
                        const val = allocations[row.product_id]?.[pm.id] || '';
                        return (
                          <td key={pm.id} style={{ padding: '8px 12px' }}>
                            <input
                              type="number"
                              className="vb-input"
                              style={{ 
                                height: 32, textAlign: 'center', 
                                border: Number(val) > 0 ? '1px solid var(--vb-blue)' : '1px solid var(--vb-border)',
                                background: Number(val) > 0 ? 'var(--vb-blue-pale)' : 'white'
                              }}
                              value={val}
                              onChange={e => handleChange(row.product_id, pm.id, e.target.value)}
                              placeholder="0"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
