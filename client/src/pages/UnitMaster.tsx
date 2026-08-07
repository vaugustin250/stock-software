import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';

export default function UnitMaster() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', allow_decimal: false });

  const { data: units, isLoading, isError, refetch } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const res = await api.get('/masters/units');
      return res.data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingId) {
        return api.put(`/masters/units/${editingId}`, data);
      }
      return api.post('/masters/units', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setIsModalOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/masters/units/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
    }
  });

  const handleOpenModal = (unit?: any) => {
    if (unit) {
      setEditingId(unit.id);
      setFormData({ name: unit.name, code: unit.code, allow_decimal: unit.allow_decimal });
    } else {
      setEditingId(null);
      setFormData({ name: '', code: '', allow_decimal: false });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this unit?')) {
      deleteMutation.mutate(id);
    }
  };

  const filtered = units?.filter((u: any) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.code.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="vb-page">
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Units</h1>
          <p className="vb-page-sub">Measurement units for products — அலகுகள்</p>
        </div>
        <button className="vb-btn vb-btn-primary vb-btn-sm" onClick={() => handleOpenModal()}>
          <Plus size={14} /> Add Unit
        </button>
      </div>

      <div className="vb-card" style={{ padding: '14px 20px' }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--vb-muted)' }} />
          <input
            type="text"
            className="vb-input"
            style={{ paddingLeft: 42, height: 42 }}
            placeholder="Search units..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isError && (
        <div className="vb-error-banner">
          ⚠ Could not load units.{' '}
          <button className="vb-btn vb-btn-sm vb-btn-outline-blue" onClick={() => refetch()}>Retry</button>
        </div>
      )}
      
      {deleteMutation.isError && (
        <div className="vb-error-banner">
          ⚠ Could not delete unit. It might be in use by a product.
        </div>
      )}

      <div className="vb-card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 32 }}>
              {[1,2,3].map(i => <div key={i} className="vb-skeleton" style={{ height: 56, marginBottom: 8 }} />)}
            </div>
          ) : (
            <table className="vb-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ width: 80 }}>Code</th>
                  <th>Name</th>
                  <th style={{ textAlign: 'center', width: 140 }}>Decimal Allowed</th>
                  <th style={{ textAlign: 'center', width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((unit: any) => (
                  <tr key={unit.id}>
                    <td style={{ fontWeight: 800, color: 'var(--vb-blue)', fontFamily: 'monospace', fontSize: 15 }}>
                      {unit.code}
                    </td>
                    <td style={{ fontWeight: 700 }}>{unit.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`vb-badge ${unit.allow_decimal ? 'vb-badge-green' : 'vb-badge-grey'}`}>
                        {unit.allow_decimal ? '✓ Yes (e.g. 0.5 KG)' : '✗ Whole numbers'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button 
                          className="vb-btn vb-btn-outline-blue vb-btn-sm" 
                          style={{ height: 32, padding: '0 10px', borderRadius: 6 }}
                          onClick={() => handleOpenModal(unit)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button 
                          className="vb-btn vb-btn-outline-red vb-btn-sm" 
                          style={{ height: 32, padding: '0 10px', borderRadius: 6 }}
                          onClick={() => handleDelete(unit.id)}
                        >
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

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? 'Edit Unit' : 'Add New Unit'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="vb-label">Unit Code (e.g. KG)</label>
            <input 
              type="text" 
              className="vb-input" 
              required
              value={formData.code}
              onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
            />
          </div>
          <div>
            <label className="vb-label">Unit Name (e.g. Kilograms)</label>
            <input 
              type="text" 
              className="vb-input" 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
            <input 
              type="checkbox" 
              checked={formData.allow_decimal}
              onChange={e => setFormData({...formData, allow_decimal: e.target.checked})}
              style={{ width: 18, height: 18 }}
            />
            Allow Decimals (e.g. 1.5 KG vs 1 BOX)
          </label>
          
          <div className="vb-modal-footer" style={{ margin: '20px -20px -20px', padding: '16px 20px' }}>
            <button type="button" className="vb-btn vb-btn-outline-blue" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="vb-btn vb-btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Unit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
