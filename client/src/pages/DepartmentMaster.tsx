import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';

export default function DepartmentMaster() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', name_tamil: '' });

  const { data: depts, isLoading, isError, refetch } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/masters/departments');
      return res.data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingId) {
        return api.put(`/masters/departments/${editingId}`, data);
      }
      return api.post('/masters/departments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsModalOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/masters/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    }
  });

  const handleOpenModal = (dept?: any) => {
    if (dept) {
      setEditingId(dept.id);
      setFormData({ name: dept.name, name_tamil: dept.name_tamil || '' });
    } else {
      setEditingId(null);
      setFormData({ name: '', name_tamil: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      deleteMutation.mutate(id);
    }
  };

  const filtered = depts?.filter((d: any) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="vb-page">
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Departments</h1>
          <p className="vb-page-sub">Product department categories — துறைகள்</p>
        </div>
        <button className="vb-btn vb-btn-primary vb-btn-sm" onClick={() => handleOpenModal()}>
          <Plus size={14} /> Add Department
        </button>
      </div>

      <div className="vb-card" style={{ padding: '14px 20px' }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--vb-muted)' }} />
          <input
            type="text"
            className="vb-input"
            style={{ paddingLeft: 42, height: 42 }}
            placeholder="Search departments..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isError && (
        <div className="vb-error-banner">
          ⚠ Could not load departments.{' '}
          <button className="vb-btn vb-btn-sm vb-btn-outline-blue" onClick={() => refetch()}>Retry</button>
        </div>
      )}
      
      {deleteMutation.isError && (
        <div className="vb-error-banner">
          ⚠ Could not delete department. It might be in use by a product.
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
                  <th style={{ width: 60 }}>#</th>
                  <th>Name (English)</th>
                  <th>Name (Tamil)</th>
                  <th style={{ textAlign: 'center', width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((dept: any) => (
                  <tr key={dept.id}>
                    <td style={{ fontWeight: 700, color: 'var(--vb-muted)' }}>{dept.id}</td>
                    <td style={{ fontWeight: 700 }}>{dept.name}</td>
                    <td style={{ fontFamily: "'Noto Sans Tamil', sans-serif", fontWeight: 600, color: 'var(--vb-blue)' }}>
                      {dept.name_tamil || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button 
                          className="vb-btn vb-btn-outline-blue vb-btn-sm" 
                          style={{ height: 32, padding: '0 10px', borderRadius: 6 }}
                          onClick={() => handleOpenModal(dept)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button 
                          className="vb-btn vb-btn-outline-red vb-btn-sm" 
                          style={{ height: 32, padding: '0 10px', borderRadius: 6 }}
                          onClick={() => handleDelete(dept.id)}
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
        title={editingId ? 'Edit Department' : 'Add New Department'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="vb-label">Department Name (English)</label>
            <input 
              type="text" 
              className="vb-input" 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="vb-label">Department Name (Tamil)</label>
            <input 
              type="text" 
              className="vb-input" 
              style={{ fontFamily: "'Noto Sans Tamil', sans-serif" }}
              value={formData.name_tamil}
              onChange={e => setFormData({...formData, name_tamil: e.target.value})}
            />
          </div>
          
          <div className="vb-modal-footer" style={{ margin: '20px -20px -20px', padding: '16px 20px' }}>
            <button type="button" className="vb-btn vb-btn-outline-blue" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="vb-btn vb-btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
