import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Search, Plus, Pencil, Trash2 } from 'lucide-react';

const UserMaster = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const res = await axios.get('http://localhost:3000/masters/users', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return res.data;
      } catch {
        return [
          { id: 1, username: 'admin', role: 'ADMIN', branch_name: 'All Branches', is_active: true },
          { id: 2, username: 'godown_user', role: 'WAREHOUSE', branch_name: 'Head Office', is_active: true },
          { id: 3, username: 'rpc1_user', role: 'BRANCH', branch_name: 'RPC Branch 1', is_active: true },
          { id: 4, username: 'rpc2_user', role: 'BRANCH', branch_name: 'RPC Branch 2', is_active: false },
        ];
      }
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

  return (
    <div className="vb-page">

      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Users</h1>
          <p className="vb-page-sub">Manage login accounts and roles</p>
        </div>
        <button className="vb-btn vb-btn-primary vb-btn-sm">
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
                  <th style={{ textAlign: 'center', width: 100 }}>Actions</th>
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
                    <td style={{ color: 'var(--vb-muted)', fontSize: 14 }}>{user.branch_name || 'N/A'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`vb-badge ${user.is_active ? 'vb-badge-green' : 'vb-badge-grey'}`}>
                        {user.is_active ? '● Active' : '● Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button className="vb-btn vb-btn-outline-blue vb-btn-sm" style={{ height: 32, padding: '0 10px', borderRadius: 6 }}>
                          <Pencil size={13} />
                        </button>
                        <button
                          className="vb-btn vb-btn-outline-red vb-btn-sm"
                          style={{ height: 32, padding: '0 10px', borderRadius: 6 }}
                          onClick={() => window.confirm(`Delete user ${user.username}? This cannot be undone.`)}
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
    </div>
  );
};

export default UserMaster;
