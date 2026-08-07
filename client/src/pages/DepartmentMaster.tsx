import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Search, Plus, Pencil } from 'lucide-react';

const DepartmentMaster = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: depts, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      try {
        const res = await axios.get('http://localhost:3000/masters/departments', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return res.data;
      } catch {
        return [
          { id: 1, name: 'Grocery', name_tamil: 'மளிகை' },
          { id: 2, name: 'Fresh Produce', name_tamil: 'புதிய காய்கறிகள்' },
          { id: 3, name: 'Fruits', name_tamil: 'பழங்கள்' },
        ];
      }
    }
  });

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
        <button className="vb-btn vb-btn-primary vb-btn-sm">
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
                  <th style={{ textAlign: 'center', width: 80 }}>Edit</th>
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

export default DepartmentMaster;
