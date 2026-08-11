import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Plus, Pencil, Trash2, Search, X, Store } from 'lucide-react';

const HALLS = ['A', 'B', 'C', 'D', 'E', 'F'];

const emptyForm = {
  hall: 'A',
  shop_no: '',
  name: '',
  name_tamil: '',
  whatsapp: '',
  address: '',
};

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const show = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };
  return { toast, show };
}

const SupplierMaster = () => {
  const [search, setSearch] = useState('');
  const [hallFilter, setHallFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast, show: showToast } = useToast();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', search, hallFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (hallFilter) params.set('hall', hallFilter);
      const res = await api.get(`/masters/suppliers?${params.toString()}`);
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editing) {
        return api.put(`/masters/suppliers/${editing.id}`, data);
      }
      return api.post('/masters/suppliers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      showToast(editing ? 'Supplier updated!' : 'Supplier added!');
      closeForm();
    },
    onError: (err: any) => showToast(err?.response?.data?.error || 'Save failed', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/masters/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      showToast('Supplier removed.');
      setDeleteTarget(null);
    },
    onError: () => showToast('Could not delete supplier.', 'error'),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({ hall: s.hall, shop_no: s.shop_no, name: s.name, name_tamil: s.name_tamil || '', whatsapp: s.whatsapp || '', address: s.address || '' });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shop_no.trim() || !form.name.trim()) {
      showToast('Hall, Shop No, and Name are required.', 'error');
      return;
    }
    saveMutation.mutate(form);
  };

  return (
    <div className="vb-page">

      {/* Toast */}
      {toast && (
        <div className="vb-toast-wrap">
          <div className={`vb-toast ${toast.type}`}>{toast.msg}</div>
        </div>
      )}

      {/* Header */}
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Supplier Master</h1>
          <p className="vb-page-sub">Koyambedu market halls & shop numbers</p>
        </div>
        <button className="vb-btn vb-btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      {/* Search + Hall Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            className="vb-input"
            style={{ paddingLeft: 38, height: 42 }}
            placeholder="Search by name, shop no..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
              <X size={15} />
            </button>
          )}
        </div>
        <select className="vb-select" value={hallFilter} onChange={e => setHallFilter(e.target.value)} style={{ height: 42, minWidth: 130 }}>
          <option value="">All Halls</option>
          {HALLS.map(h => <option key={h} value={h}>Hall {h}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="vb-card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 24 }}>
              {[1, 2, 3].map(i => <div key={i} className="vb-skeleton" style={{ height: 52, marginBottom: 8 }} />)}
            </div>
          ) : !suppliers.length ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--vb-muted)' }}>
              <Store size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
              <div>No suppliers found.</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Add your first supplier to get started.</div>
            </div>
          ) : (
            <table className="vb-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ width: 70 }}>Hall</th>
                  <th style={{ width: 90 }}>Shop No</th>
                  <th>Name</th>
                  <th style={{ width: 130 }}>WhatsApp</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s: any) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700, color: 'var(--vb-blue)', textAlign: 'center' }}>
                      <span style={{ background: 'var(--vb-blue-pale)', padding: '2px 10px', borderRadius: 6, fontSize: 13 }}>
                        {s.hall}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: 15 }}>{s.shop_no}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      {s.name_tamil && (
                        <div style={{ fontFamily: "'Noto Sans Tamil', sans-serif", fontSize: 12, color: 'var(--vb-muted)' }}>{s.name_tamil}</div>
                      )}
                      {s.address && <div style={{ fontSize: 11, color: 'var(--vb-muted)', marginTop: 2 }}>{s.address}</div>}
                    </td>
                    <td style={{ fontSize: 13 }}>{s.whatsapp || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="vb-btn vb-btn-outline-blue vb-btn-sm" onClick={() => openEdit(s)}>
                          <Pencil size={13} />
                        </button>
                        <button className="vb-btn vb-btn-outline-red vb-btn-sm" onClick={() => setDeleteTarget(s)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="vb-modal-overlay" onClick={closeForm}>
          <div className="vb-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="vb-modal-header">
              <h2 className="vb-modal-title">{editing ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button className="vb-modal-close" onClick={closeForm}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="vb-label">Hall *</label>
                  <select className="vb-select" value={form.hall} onChange={e => setForm(f => ({ ...f, hall: e.target.value }))} required>
                    {HALLS.map(h => <option key={h} value={h}>Hall {h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="vb-label">Shop Number *</label>
                  <input
                    className="vb-input"
                    value={form.shop_no}
                    onChange={e => setForm(f => ({ ...f, shop_no: e.target.value }))}
                    placeholder="e.g. 189"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="vb-label">Name (English) *</label>
                <input className="vb-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Supplier name" required />
              </div>
              <div>
                <label className="vb-label">Name (Tamil)</label>
                <input
                  className="vb-input"
                  value={form.name_tamil}
                  onChange={e => setForm(f => ({ ...f, name_tamil: e.target.value }))}
                  placeholder="விற்பனையாளர் பெயர்"
                  style={{ fontFamily: "'Noto Sans Tamil', sans-serif" }}
                />
              </div>
              <div>
                <label className="vb-label">WhatsApp Number</label>
                <input className="vb-input" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="9876543210" type="tel" />
              </div>
              <div>
                <label className="vb-label">Address</label>
                <input className="vb-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Optional address" />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="vb-btn vb-btn-outline-blue" onClick={closeForm}>Cancel</button>
                <button type="submit" className="vb-btn vb-btn-primary" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving…' : (editing ? 'Update' : 'Add Supplier')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="vb-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="vb-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="vb-modal-header">
              <h2 className="vb-modal-title">Remove Supplier?</h2>
              <button className="vb-modal-close" onClick={() => setDeleteTarget(null)}><X size={20} /></button>
            </div>
            <p style={{ margin: '0 0 20px', color: 'var(--vb-muted)' }}>
              Remove <strong>Hall {deleteTarget.hall} – {deleteTarget.shop_no} ({deleteTarget.name})</strong>?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="vb-btn vb-btn-outline-blue" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                className="vb-btn vb-btn-danger"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
              >
                {deleteMutation.isPending ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierMaster;
