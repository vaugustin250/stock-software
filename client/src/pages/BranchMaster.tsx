import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Search, Plus, Pencil, Trash2, Building2, Store } from 'lucide-react';
import { Modal } from '../components/Modal';

export default function BranchMaster() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';

  // State
  const [selectedGodownId, setSelectedGodownId] = useState<number | null>(null);

  // Modals state
  const [isGodownModalOpen, setIsGodownModalOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  
  const [editingGodownId, setEditingGodownId] = useState<number | null>(null);
  const [editingBranchId, setEditingBranchId] = useState<number | null>(null);
  
  const [godownFormData, setGodownFormData] = useState({ name: '', code: '', is_active: true });
  const [branchFormData, setBranchFormData] = useState({ name: '', code: '', is_active: true });

  // 1. Fetch Godowns
  const { data: godowns, isLoading: isLoadingGodowns, isError: isErrorGodowns } = useQuery({
    queryKey: ['godowns'],
    queryFn: async () => {
      const res = await api.get('/masters/godowns');
      return res.data;
    }
  });

  // Auto-select first godown if none selected
  useEffect(() => {
    if (godowns && godowns.length > 0 && !selectedGodownId) {
      setSelectedGodownId(godowns[0].id);
    }
  }, [godowns, selectedGodownId]);

  // 2. Fetch Branches for selected Godown
  const { data: branches, isLoading: isLoadingBranches, isError: isErrorBranches } = useQuery({
    queryKey: ['branches', selectedGodownId],
    queryFn: async () => {
      const res = await api.get(`/masters/godowns/${selectedGodownId}/branches`);
      return res.data;
    },
    enabled: !!selectedGodownId
  });

  // --- Godown Mutations ---
  const saveGodownMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingGodownId) {
        return api.put(`/masters/godowns/${editingGodownId}`, data);
      }
      return api.post('/masters/godowns', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['godowns'] });
      setIsGodownModalOpen(false);
    }
  });

  const deleteGodownMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/masters/godowns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['godowns'] });
      if (selectedGodownId === deleteGodownMutation.variables) {
        setSelectedGodownId(null);
      }
    }
  });

  // --- Branch Mutations ---
  const saveBranchMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingBranchId) {
        return api.put(`/masters/branches/${editingBranchId}`, data);
      }
      return api.post(`/masters/godowns/${selectedGodownId}/branches`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches', selectedGodownId] });
      setIsBranchModalOpen(false);
    }
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/masters/branches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches', selectedGodownId] });
    }
  });

  // --- Handlers ---
  const handleOpenGodownModal = (godown?: any) => {
    if (godown) {
      setEditingGodownId(godown.id);
      setGodownFormData({ name: godown.name, code: godown.code, is_active: godown.is_active });
    } else {
      setEditingGodownId(null);
      setGodownFormData({ name: '', code: '', is_active: true });
    }
    setIsGodownModalOpen(true);
  };

  const handleOpenBranchModal = (branch?: any) => {
    if (branch) {
      setEditingBranchId(branch.id);
      setBranchFormData({ name: branch.name, code: branch.code, is_active: branch.is_active });
    } else {
      setEditingBranchId(null);
      setBranchFormData({ name: '', code: '', is_active: true });
    }
    setIsBranchModalOpen(true);
  };

  const handleDeleteGodown = (id: number, name: string) => {
    if (window.confirm(`Delete Godown "${name}" and ALL its branches? This cannot be undone.`)) {
      deleteGodownMutation.mutate(id);
    }
  };

  const handleDeleteBranch = (id: number, name: string) => {
    if (window.confirm(`Delete Branch "${name}"? This cannot be undone.`)) {
      deleteBranchMutation.mutate(id);
    }
  };

  const filteredBranches = branches?.filter((b: any) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.code.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="vb-page">
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Hierarchy Management</h1>
          <p className="vb-page-sub">Manage Godowns and their Branches</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT PANEL: Godowns */}
        <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="vb-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--vb-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={18} color="var(--vb-blue)" /> Godowns
              </h2>
              {isAdmin && (
                <button className="vb-btn vb-btn-sm vb-btn-outline-blue" onClick={() => handleOpenGodownModal()}>
                  <Plus size={14} /> Add
                </button>
              )}
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
              {isLoadingGodowns ? (
                <div style={{ padding: '0 20px' }}>Loading godowns...</div>
              ) : isErrorGodowns ? (
                <div style={{ padding: '0 20px', color: 'red' }}>Error loading godowns</div>
              ) : (
                godowns?.map((g: any) => (
                  <div 
                    key={g.id}
                    onClick={() => setSelectedGodownId(g.id)}
                    style={{
                      padding: '12px 20px',
                      cursor: 'pointer',
                      borderLeft: `4px solid ${selectedGodownId === g.id ? 'var(--vb-blue)' : 'transparent'}`,
                      background: selectedGodownId === g.id ? 'var(--vb-blue-pale)' : 'transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background 0.2s'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--vb-text)' }}>{g.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--vb-muted)', fontFamily: 'monospace' }}>{g.code}</div>
                    </div>
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="vb-btn vb-btn-sm" style={{ padding: '4px', border: 'none', background: 'transparent' }} onClick={() => handleOpenGodownModal(g)}>
                          <Pencil size={14} color="var(--vb-blue)" />
                        </button>
                        <button className="vb-btn vb-btn-sm" style={{ padding: '4px', border: 'none', background: 'transparent' }} onClick={() => handleDeleteGodown(g.id, g.name)}>
                          <Trash2 size={14} color="var(--vb-red)" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
              {godowns?.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--vb-muted)' }}>No godowns found.</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Branches */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {selectedGodownId ? (
            <div className="vb-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--vb-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Store size={18} color="var(--vb-blue)" /> 
                  Branches under {godowns?.find((g: any) => g.id === selectedGodownId)?.name}
                </h2>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--vb-muted)' }} />
                    <input
                      type="text"
                      className="vb-input"
                      style={{ paddingLeft: 30, height: 32, fontSize: 13, borderRadius: 6 }}
                      placeholder="Search branches..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button className="vb-btn vb-btn-sm vb-btn-primary" onClick={() => handleOpenBranchModal()}>
                    <Plus size={14} /> Add Branch
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {isLoadingBranches ? (
                  <div style={{ padding: 32 }}>Loading branches...</div>
                ) : isErrorBranches ? (
                  <div style={{ padding: 32, color: 'red' }}>Error loading branches</div>
                ) : (
                  <table className="vb-table">
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr>
                        <th style={{ width: 100 }}>Code</th>
                        <th>Branch Name</th>
                        <th style={{ textAlign: 'center', width: 100 }}>Status</th>
                        <th style={{ textAlign: 'center', width: 120 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBranches.map((branch: any) => (
                        <tr key={branch.id}>
                          <td style={{ fontWeight: 800, color: 'var(--vb-blue)', fontFamily: 'monospace', fontSize: 14 }}>
                            {branch.code}
                          </td>
                          <td style={{ fontWeight: 700 }}>{branch.name}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`vb-badge ${branch.is_active ? 'vb-badge-green' : 'vb-badge-grey'}`}>
                              {branch.is_active ? '● Active' : '● Inactive'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                              <button 
                                className="vb-btn vb-btn-outline-blue vb-btn-sm" 
                                style={{ height: 32, padding: '0 10px', borderRadius: 6 }}
                                onClick={() => handleOpenBranchModal(branch)}
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                className="vb-btn vb-btn-outline-red vb-btn-sm"
                                style={{ height: 32, padding: '0 10px', borderRadius: 6 }}
                                onClick={() => handleDeleteBranch(branch.id, branch.name)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredBranches.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--vb-muted)' }}>
                            No branches found for this Godown.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div className="vb-card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--vb-muted)' }}>
              Select a Godown from the left to view its Branches
            </div>
          )}
        </div>
      </div>

      {/* GODOWN MODAL */}
      <Modal 
        isOpen={isGodownModalOpen} 
        onClose={() => setIsGodownModalOpen(false)} 
        title={editingGodownId ? 'Edit Godown' : 'Add New Godown'}
      >
        <form onSubmit={(e) => { e.preventDefault(); saveGodownMutation.mutate(godownFormData); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="vb-label">Godown Code</label>
            <input type="text" className="vb-input" required value={godownFormData.code} onChange={e => setGodownFormData({...godownFormData, code: e.target.value})} />
          </div>
          <div>
            <label className="vb-label">Godown Name</label>
            <input type="text" className="vb-input" required value={godownFormData.name} onChange={e => setGodownFormData({...godownFormData, name: e.target.value})} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
            <input type="checkbox" checked={godownFormData.is_active} onChange={e => setGodownFormData({...godownFormData, is_active: e.target.checked})} style={{ width: 18, height: 18 }} /> Active
          </label>
          
          {saveGodownMutation.isError && (
            <div className="vb-error-banner" style={{ marginTop: 0 }}>
              ⚠ {(saveGodownMutation.error as any)?.response?.data?.error || 'Could not save godown. Ensure code is unique.'}
            </div>
          )}

          <div className="vb-modal-footer" style={{ margin: '20px -20px -20px', padding: '16px 20px' }}>
            <button type="button" className="vb-btn vb-btn-outline-blue" onClick={() => setIsGodownModalOpen(false)}>Cancel</button>
            <button type="submit" className="vb-btn vb-btn-primary" disabled={saveGodownMutation.isPending}>{saveGodownMutation.isPending ? 'Saving...' : 'Save Godown'}</button>
          </div>
        </form>
      </Modal>

      {/* BRANCH MODAL */}
      <Modal 
        isOpen={isBranchModalOpen} 
        onClose={() => setIsBranchModalOpen(false)} 
        title={editingBranchId ? 'Edit Branch' : 'Add New Branch'}
      >
        <form onSubmit={(e) => { e.preventDefault(); saveBranchMutation.mutate(branchFormData); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="vb-label">Branch Code</label>
            <input type="text" className="vb-input" required value={branchFormData.code} onChange={e => setBranchFormData({...branchFormData, code: e.target.value})} />
          </div>
          <div>
            <label className="vb-label">Branch Name</label>
            <input type="text" className="vb-input" required value={branchFormData.name} onChange={e => setBranchFormData({...branchFormData, name: e.target.value})} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
            <input type="checkbox" checked={branchFormData.is_active} onChange={e => setBranchFormData({...branchFormData, is_active: e.target.checked})} style={{ width: 18, height: 18 }} /> Active
          </label>
          
          {saveBranchMutation.isError && (
            <div className="vb-error-banner" style={{ marginTop: 0 }}>
              ⚠ {(saveBranchMutation.error as any)?.response?.data?.error || 'Could not save branch. Ensure code is unique.'}
            </div>
          )}

          <div className="vb-modal-footer" style={{ margin: '20px -20px -20px', padding: '16px 20px' }}>
            <button type="button" className="vb-btn vb-btn-outline-blue" onClick={() => setIsBranchModalOpen(false)}>Cancel</button>
            <button type="submit" className="vb-btn vb-btn-primary" disabled={saveBranchMutation.isPending}>{saveBranchMutation.isPending ? 'Saving...' : 'Save Branch'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
