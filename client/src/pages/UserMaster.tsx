import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';

export default function UserMaster() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ 
    username: '', password: '', role: 'BRANCH', branch_id: '' 
  });

  const { data: users, isLoading, isError, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/masters/users');
      return res.data;
    }
  });

  const { data: branches } = useQuery({ 
    queryKey: ['branches'], 
    queryFn: async () => (await api.get('/masters/branches')).data 
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        branch_id: data.branch_id ? parseInt(data.branch_id) : null,
      };
      if (editingId) {
        // Only send password if it was changed
        if (!payload.password) delete payload.password;
        return api.put(`/masters/users/${editingId}`, payload);
      }
      return api.post('/masters/users', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/masters/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const roleBadgeClass: Record<string, string> = {
    ADMIN: 'vb-badge-red',
    WAREHOUSE: 'vb-badge-amber',
    BRANCH: 'vb-badge-blue',
  };

  const filtered = users?.filter((u: any) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleOpenModal = (user?: any) => {
    if (user) {
      setEditingId(user.id);
      setFormData({ 
        username: user.username, 
        password: '', // Don't prepopulate password 
        role: user.role, 
        branch_id: user.branch_id?.toString() || '' 
      });
    } else {
      setEditingId(null);
      setFormData({ username: '', password: '', role: 'BRANCH', branch_id: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId && !formData.password) {
      alert("Password is required for new users.");
      return;
    }

    const confirmMsg = `Are you sure you want to save this user?\n\nWARNING: Granting incorrect roles (especially ADMIN or WAREHOUSE) will give this user widespread access to sensitive data, inventory, and the ability to modify core settings. Please double-check the Role and Assigned Location before proceeding.`;
    
    if (window.confirm(confirmMsg)) {
      saveMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number, username: string) => {
    if (window.confirm(`Are you sure you want to delete user ${username}?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="vb-page">
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Users</h1>
          <p className="vb-page-sub">Manage login accounts and roles</p>
        </div>
        <button className="vb-btn vb-btn-primary vb-btn-sm" onClick={() => handleOpenModal()}>
          <Plus size={14} /> Add User
        </button>
      </div>

      <div className="vb-card" style={{ padding: '14px 20px' }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--vb-muted)' }} />
          <input
            type="text"
            className="vb-input"
            style={{ paddingLeft: 42, height: 42 }}
            placeholder="Search users..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isError && (
        <div className="vb-error-banner">
          ⚠ Could not load users.{' '}
          <button className="vb-btn vb-btn-sm vb-btn-outline-blue" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {deleteMutation.isError && (
        <div className="vb-error-banner">
          ⚠ {(deleteMutation.error as any)?.response?.data?.error || 'Could not delete user. They may have transactions tied to them.'}
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
                  <th>Username</th>
                  <th style={{ width: 120 }}>Role</th>
                  <th>Branch</th>
                  <th style={{ textAlign: 'center', width: 100 }}>Status</th>
                  <th style={{ textAlign: 'center', width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user: any) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'var(--vb-blue)', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 800, flexShrink: 0,
                        }}>
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        {user.username}
                      </div>
                    </td>
                    <td>
                      <span className={`vb-badge ${roleBadgeClass[user.role] || 'vb-badge-grey'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ color: 'var(--vb-muted)', fontSize: 14 }}>
                      {branches?.find((b: any) => b.id === user.branch_id)?.name || 'N/A'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`vb-badge ${user.is_active ? 'vb-badge-green' : 'vb-badge-grey'}`}>
                        {user.is_active ? '● Active' : '● Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button 
                          className="vb-btn vb-btn-outline-blue vb-btn-sm" 
                          style={{ height: 32, padding: '0 10px', borderRadius: 6 }}
                          onClick={() => handleOpenModal(user)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="vb-btn vb-btn-outline-red vb-btn-sm"
                          style={{ height: 32, padding: '0 10px', borderRadius: 6 }}
                          onClick={() => handleDelete(user.id, user.username)}
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
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--vb-border)', fontSize: 13, color: 'var(--vb-muted)', fontWeight: 600 }}>
          {filtered.length} user{filtered.length !== 1 ? 's' : ''} shown
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? 'Edit User' : 'Add New User'}
        width="500px"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="vb-label">Username</label>
            <input 
              type="text" 
              className="vb-input" 
              required
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
            />
          </div>
          <div>
            <label className="vb-label">
              Password 
              {editingId && <span style={{ fontWeight: 400, color: 'var(--vb-muted)' }}> (Leave blank to keep unchanged)</span>}
            </label>
            <input 
              type="password" 
              className="vb-input" 
              required={!editingId}
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              placeholder={editingId ? '••••••••' : 'Enter a strong password'}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="vb-label">Role</label>
              <select 
                className="vb-input" 
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
              >
                <option value="BRANCH">BRANCH</option>
                <option value="WAREHOUSE">WAREHOUSE</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div>
              <label className="vb-label">
                {formData.role === 'WAREHOUSE' ? 'Assigned Godown' : 'Assigned Branch'}
              </label>
              <select 
                className="vb-input" 
                value={formData.branch_id}
                onChange={e => setFormData({...formData, branch_id: e.target.value})}
                required={formData.role !== 'ADMIN'}
                disabled={formData.role === 'ADMIN'}
              >
                <option value="">{formData.role === 'ADMIN' ? 'None (Admin)' : 'Select...'}</option>
                {branches
                  ?.filter((b: any) => {
                    if (formData.role === 'WAREHOUSE') return b.type === 'GODOWN';
                    if (formData.role === 'BRANCH') return b.type === 'BRANCH';
                    return false;
                  })
                  .map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
              </select>
            </div>
          </div>
          
          {saveMutation.isError && (
            <div className="vb-error-banner" style={{ marginTop: 0 }}>
              ⚠ {(saveMutation.error as any)?.response?.data?.error || 'Could not save user. Username might already exist.'}
            </div>
          )}
          
          <div className="vb-modal-footer" style={{ margin: '20px -20px -20px', padding: '16px 20px' }}>
            <button type="button" className="vb-btn vb-btn-outline-blue" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="vb-btn vb-btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
