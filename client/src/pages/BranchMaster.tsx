import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Search, Plus, Pencil, Trash2 } from 'lucide-react';

const BranchMaster = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: branches, isLoading, isError, refetch } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/masters/branches');
      return res.data;
    }
  });

  const filtered = branches?.filter((b: any) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.code.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="vb-page">

      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Branches</h1>
          <p className="vb-page-sub">Manage branch and godown list</p>
        </div>
        <button className="vb-btn vb-btn-primary vb-btn-sm">
          <Plus size={14} /> Add Branch
        </button>
      </div>

      <div className="vb-card" style={{ padding: '14px 20px' }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--vb-muted)' }} />
          <input
            type="text"
            className="vb-input"
            style={{ paddingLeft: 42, height: 42 }}
            placeholder="Search branches..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isError && (
        <div className="vb-error-banner">
          ⚠ Could not load branches.{' '}
          <button className="vb-btn vb-btn-sm vb-btn-outline-blue" onClick={() => refetch()}>Retry</button>
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
                  <th style={{ width: 100 }}>Code</th>
                  <th>Branch Name</th>
                  <th style={{ width: 110 }}>Type</th>
                  <th style={{ textAlign: 'center', width: 100 }}>Status</th>
                  <th style={{ textAlign: 'center', width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((branch: any) => (
                  <tr key={branch.id}>
                    <td style={{ fontWeight: 800, color: 'var(--vb-blue)', fontFamily: 'monospace', fontSize: 14 }}>
                      {branch.code}
                    </td>
                    <td style={{ fontWeight: 700 }}>{branch.name}</td>
                    <td>
                      <span className={`vb-badge ${branch.type === 'GODOWN' ? 'vb-badge-amber' : 'vb-badge-blue'}`}>
                        {branch.type}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`vb-badge ${branch.is_active ? 'vb-badge-green' : 'vb-badge-grey'}`}>
                        {branch.is_active ? '● Active' : '● Inactive'}
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
                          onClick={() => window.confirm(`Delete ${branch.name}? This cannot be undone.`)}
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
          {filtered.length} branch{filtered.length !== 1 ? 'es' : ''} shown
        </div>
      </div>
    </div>
  );
};

export default BranchMaster;
