import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Search, Plus, Pencil } from 'lucide-react';

const UnitMaster = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: units, isLoading, isError, refetch } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const res = await api.get('/masters/units');
      return res.data;
    }
  });

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
        <button className="vb-btn vb-btn-primary vb-btn-sm">
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
                  <th style={{ textAlign: 'center', width: 80 }}>Edit</th>
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

export default UnitMaster;
