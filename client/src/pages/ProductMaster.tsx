import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Search, Plus, Upload, Pencil, Trash2 } from 'lucide-react';

const ProductMaster = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const res = await axios.get('http://localhost:3000/masters/products', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return res.data;
      } catch {
        return [
          { id: 1, code: 'V001', name: 'Tomato', name_tamil: 'தக்காளி', group_name: 'Spl. Veg', department: 'Vegetable', is_active: true },
          { id: 2, code: 'V002', name: 'Onion', name_tamil: 'வெங்காயம்', group_name: 'Spl. Veg', department: 'Vegetable', is_active: true },
          { id: 3, code: 'V003', name: 'Potato', name_tamil: 'உருளை', group_name: 'Root Veg', department: 'Vegetable', is_active: true },
          { id: 4, code: 'F001', name: 'Apple', name_tamil: 'ஆப்பிள்', group_name: 'Fruits', department: 'Fruit', is_active: false },
        ];
      }
    }
  });

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Connect to server to process
    alert('Import triggered — connect to server to process');
  };

  const handleDelete = (name: string) => {
    if (window.confirm(`Delete ${name}? This cannot be undone.`)) {
      // API call here
    }
  };

  const filtered = products?.filter((p: any) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.name_tamil && p.name_tamil.includes(searchTerm))
  ) || [];

  return (
    <div className="vb-page">

      {/* Header */}
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Products</h1>
          <p className="vb-page-sub">Manage product catalogue — பொருள் பட்டியல்</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label className="vb-btn vb-btn-outline-blue vb-btn-sm" style={{ cursor: 'pointer' }}>
            <Upload size={14} /> Import Excel
            <input type="file" style={{ display: 'none' }} accept=".xlsx,.xls" onChange={handleImport} />
          </label>
          <button className="vb-btn vb-btn-primary vb-btn-sm">
            <Plus size={14} /> Add New
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="vb-card" style={{ padding: '14px 20px' }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--vb-muted)' }} />
          <input
            type="text"
            className="vb-input"
            style={{ paddingLeft: 42, height: 42 }}
            placeholder="Search name, code, or Tamil..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="vb-card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 32 }}>
              {[1,2,3,4].map(i => <div key={i} className="vb-skeleton" style={{ height: 64, marginBottom: 8 }} />)}
            </div>
          ) : (
            <table className="vb-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ width: 80 }}>Code</th>
                  <th>English Name</th>
                  <th>Tamil Name</th>
                  <th>Group</th>
                  <th>Dept.</th>
                  <th style={{ textAlign: 'center', width: 90 }}>Status</th>
                  <th style={{ textAlign: 'center', width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--vb-muted)' }}>
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((product: any) => (
                    <tr key={product.id}>
                      <td style={{ fontWeight: 800, color: 'var(--vb-blue)', fontFamily: 'monospace', fontSize: 13 }}>
                        {product.code}
                      </td>
                      <td style={{ fontWeight: 700 }}>{product.name}</td>
                      <td style={{ fontFamily: "'Noto Sans Tamil', sans-serif", fontWeight: 600, color: 'var(--vb-blue)' }}>
                        {product.name_tamil || '—'}
                      </td>
                      <td>
                        <span className="vb-badge vb-badge-blue">{product.group_name || '—'}</span>
                      </td>
                      <td style={{ color: 'var(--vb-muted)', fontSize: 14 }}>{product.department || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`vb-badge ${product.is_active ? 'vb-badge-green' : 'vb-badge-grey'}`}>
                          {product.is_active ? '● Active' : '● Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            className="vb-btn vb-btn-outline-blue vb-btn-sm"
                            style={{ height: 32, padding: '0 10px', borderRadius: 6 }}
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="vb-btn vb-btn-outline-red vb-btn-sm"
                            style={{ height: 32, padding: '0 10px', borderRadius: 6 }}
                            title="Delete"
                            onClick={() => handleDelete(product.name)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer count */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid var(--vb-border)',
          fontSize: 13,
          color: 'var(--vb-muted)',
          fontWeight: 600,
        }}>
          {filtered.length} product{filtered.length !== 1 ? 's' : ''} shown
        </div>
      </div>
    </div>
  );
};

export default ProductMaster;
