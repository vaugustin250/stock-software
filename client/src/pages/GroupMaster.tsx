import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Search, Plus, Pencil } from 'lucide-react';

const GroupMaster = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      try {
        const res = await axios.get('http://localhost:3000/masters/groups', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return res.data;
      } catch {
        return [
          { id: 1, name: 'Special Vegetables', name_tamil: 'சிறப்பு காய்கறிகள்', sort_order: 1 },
          { id: 2, name: 'Green Vegetables', name_tamil: 'பச்சை காய்கறிகள்', sort_order: 2 },
          { id: 3, name: 'Fruits', name_tamil: 'பழங்கள்', sort_order: 3 },
          { id: 4, name: 'Root Vegetables', name_tamil: 'கிழங்கு வகைகள்', sort_order: 4 },
        ];
      }
    }
  });

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
        <button className="vb-btn vb-btn-primary vb-btn-sm">
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
                  <th style={{ textAlign: 'center', width: 80 }}>Edit</th>
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
                      <button className="vb-btn vb-btn-outline-blue vb-btn-sm" style={{ height: 32, padding: '0 10px', borderRadius: 6 }}>
                        <Pencil size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupMaster;
