import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';

export default function GroupMaster() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', name_tamil: '', sort_order: 0 });

  const { data: groups, isLoading, isError, refetch } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await api.get('/masters/groups');
      return res.data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingId) {
        return api.put(`/masters/groups/${editingId}`, data);
      }
      return api.post('/masters/groups', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setIsModalOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/masters/groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    }
  });

  const handleOpenModal = (group?: any) => {
    if (group) {
      setEditingId(group.id);
      setFormData({ name: group.name, name_tamil: group.name_tamil || '', sort_order: group.sort_order || 0 });
    } else {
      setEditingId(null);
      setFormData({ name: '', name_tamil: '', sort_order: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      deleteMutation.mutate(id);
    }
  };

  const filtered = groups?.filter((g: any) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="vb-page">
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Groups</h1>
          <p className="vb-page-sub">Product category groups — குழுக்கள்</p>
        </div>
        <button className="vb-btn vb-btn-primary vb-btn-sm" onClick={() => handleOpenModal()}>
          <Plus size={14} /> Add Group
        </button>
      </div>

      <div className="vb-card" style={{ padding: '14px 20px' }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--vb-muted)' }} />
          <input
            type="text"
            className="vb-input"
            style={{ paddingLeft: 42, height: 42 }}
            placeholder="Search groups..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isError && (
        <div className="vb-error-banner">
          ⚠ Could not load groups.{' '}
          <button className="vb-btn vb-btn-sm vb-btn-outline-blue" onClick={() => refetch()}>Retry</button>
        </div>
      )}
      
      {deleteMutation.isError && (
        <div className="vb-error-banner">
          ⚠ Could not delete group. It might be in use by a product.
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
                  <th style={{ textAlign: 'center', width: 100 }}>Sort Order</th>
                  <th style={{ textAlign: 'center', width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((group: any) => (
                  <tr key={group.id}>
                    <td style={{ fontWeight: 700, color: 'var(--vb-muted)' }}>{group.id}</td>
                    <td style={{ fontWeight: 700 }}>{group.name}</td>
                    <td style={{ fontFamily: "'Noto Sans Tamil', sans-serif", fontWeight: 600, color: 'var(--vb-blue)' }}>
                      {group.name_tamil || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="vb-badge vb-badge-grey">{group.sort_order}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button 
                          className="vb-btn vb-btn-outline-blue vb-btn-sm" 
                          style={{ height: 32, padding: '0 10px', borderRadius: 6 }}
                          onClick={() => handleOpenModal(group)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button 
                          className="vb-btn vb-btn-outline-red vb-btn-sm" 
                          style={{ height: 32, padding: '0 10px', borderRadius: 6 }}
                          onClick={() => handleDelete(group.id)}
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
        title={editingId ? 'Edit Group' : 'Add New Group'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="vb-label">Group Name (English)</label>
            <input 
              type="text" 
              className="vb-input" 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="vb-label">Group Name (Tamil)</label>
            <input 
              type="text" 
              className="vb-input" 
              style={{ fontFamily: "'Noto Sans Tamil', sans-serif" }}
              value={formData.name_tamil}
              onChange={e => setFormData({...formData, name_tamil: e.target.value})}
            />
          </div>
          <div>
            <label className="vb-label">Sort Order</label>
            <input 
              type="number" 
              className="vb-input" 
              value={formData.sort_order}
              onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
            />
          </div>
          
          <div className="vb-modal-footer" style={{ margin: '20px -20px -20px', padding: '16px 20px' }}>
            <button type="button" className="vb-btn vb-btn-outline-blue" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="vb-btn vb-btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Group'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
