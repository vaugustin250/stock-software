import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Wallet, Plus, Search, IndianRupee, History, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Modal } from '../components/Modal';
import { useIsMobile } from '../hooks/useIsMobile';

export default function PurchaseMenWallet() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedMan, setSelectedMan] = useState<any>(null);
  const [funds, setFunds] = useState({ amount: '', description: '' });

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['wallet_history', selectedMan?.id],
    queryFn: async () => (await api.get(`/wallet/history/${selectedMan.id}`)).data,
    enabled: isHistoryModalOpen && !!selectedMan?.id
  });

  const { data: purchaseMen, isLoading } = useQuery({
    queryKey: ['users', { role: 'PURCHASE_MAN' }],
    queryFn: async () => {
      const res = await api.get('/masters/users?role=PURCHASE_MAN');
      return res.data;
    }
  });

  const addFundsMutation = useMutation({
    mutationFn: async () => {
      return api.post('/wallet/add-funds', {
        user_id: selectedMan.id,
        amount: parseFloat(funds.amount),
        description: funds.description
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setFunds({ amount: '', description: '' });
      setSelectedMan(null);
    }
  });

  const filtered = purchaseMen?.filter((u: any) =>
    (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.phone || '').includes(searchTerm)
  ) || [];

  return (
    <div className="vb-page">
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Purchase Men Wallet</h1>
          <p className="vb-page-sub">Manage balances and add funds</p>
        </div>
      </div>

      <div className="vb-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--vb-border)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <Search size={16} style={{ position: 'absolute', top: 10, left: 12, color: '#64748b' }} />
            <input
              type="text"
              className="vb-input"
              style={{ paddingLeft: 36, height: 36 }}
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '8px' : '16px' }}>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
              <Wallet size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              No purchase men found.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {filtered.map((user: any) => (
                <div key={user.id} style={{ border: '1px solid var(--vb-border)', borderRadius: 8, padding: 16, backgroundColor: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{user.username}</h3>
                      <div style={{ fontSize: 13, color: '#64748b' }}>
                        {user.phone ? `📞 ${user.phone}` : 'No phone number'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Balance</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: (user.balance || 0) < 0 ? '#ef4444' : '#10b981' }}>
                        ₹{parseFloat(user.balance || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      onClick={() => { setSelectedMan(user); setIsHistoryModalOpen(true); }}
                      className="vb-btn vb-btn-outline-blue" 
                      style={{ flex: 1, height: 36, justifyContent: 'center' }}
                    >
                      <History size={16} /> History
                    </button>
                    <button 
                      onClick={() => { setSelectedMan(user); setIsModalOpen(true); }}
                      className="vb-btn vb-btn-primary" 
                      style={{ flex: 1, height: 36, justifyContent: 'center' }}
                    >
                      <Plus size={16} /> Give Money
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => !addFundsMutation.isPending && setIsModalOpen(false)} title="Give Money">
        <form onSubmit={e => { e.preventDefault(); addFundsMutation.mutate(); }}>
          <div style={{ marginBottom: 16 }}>
            <label className="vb-label">Giving funds to</label>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedMan?.username}</div>
          </div>

          <div className="vb-field">
            <label className="vb-label">Amount (₹)</label>
            <div style={{ position: 'relative' }}>
              <IndianRupee size={16} style={{ position: 'absolute', top: 13, left: 12, color: '#64748b' }} />
              <input 
                type="number" 
                className="vb-input" 
                style={{ paddingLeft: 36 }}
                required
                min="1"
                step="1"
                value={funds.amount}
                onChange={e => setFunds({...funds, amount: e.target.value})}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="vb-field">
            <label className="vb-label">Description (Optional)</label>
            <input 
              type="text" 
              className="vb-input" 
              value={funds.description}
              onChange={e => setFunds({...funds, description: e.target.value})}
              placeholder="e.g. Morning Market Cash"
            />
          </div>
          
          {addFundsMutation.isError && (
            <div className="vb-error-banner" style={{ marginTop: 0 }}>
              ⚠ {(addFundsMutation.error as any)?.response?.data?.error || 'Could not add funds.'}
            </div>
          )}
          
          <div className="vb-modal-footer" style={{ margin: '20px -20px -20px', padding: '16px 20px' }}>
            <button type="button" className="vb-btn vb-btn-outline-blue" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="vb-btn vb-btn-primary" disabled={addFundsMutation.isPending}>
              {addFundsMutation.isPending ? 'Processing...' : 'Confirm Transfer'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title={`${selectedMan?.username}'s Wallet History`}>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {loadingHistory ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Loading history...</div>
          ) : history.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
              <History size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              No transactions found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.map((tx: any) => {
                const isCredit = tx.type === 'CREDIT';
                const date = new Date(tx.created_at);
                
                return (
                  <div key={tx.id} style={{ 
                    display: 'flex', alignItems: 'center', gap: 12, padding: 12, 
                    border: '1px solid var(--vb-border)', borderRadius: 8, backgroundColor: '#f8fafc' 
                  }}>
                    <div style={{ 
                      width: 40, height: 40, borderRadius: 20, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isCredit ? '#d1fae5' : '#fee2e2',
                      color: isCredit ? '#10b981' : '#ef4444'
                    }}>
                      {isCredit ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                        {tx.description || (isCredit ? 'Cash Received' : 'Purchase')}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} at {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontSize: 15, fontWeight: 700, 
                        color: isCredit ? '#10b981' : '#ef4444' 
                      }}>
                        {isCredit ? '+' : '-'} ₹{Math.abs(tx.amount).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
