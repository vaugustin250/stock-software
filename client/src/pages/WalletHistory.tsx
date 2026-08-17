import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ArrowDownRight, ArrowUpRight, History } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

export default function WalletHistory() {
  const isMobile = useIsMobile();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const { data: history, isLoading } = useQuery({
    queryKey: ['wallet_history', user.id],
    queryFn: async () => (await api.get(`/wallet/history/${user.id}`)).data
  });

  const { data: balanceData } = useQuery({
    queryKey: ['wallet_balance', user.id],
    queryFn: async () => (await api.get(`/wallet/balance/${user.id}`)).data
  });

  return (
    <div className="vb-page">
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Wallet History</h1>
          <p className="vb-page-sub">Current Balance: ₹{parseFloat(balanceData?.balance || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="vb-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '8px' : '16px' }}>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Loading...</div>
          ) : history?.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
              <History size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              No transactions yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history?.map((tx: any) => {
                const isCredit = tx.type === 'CREDIT';
                const date = new Date(tx.created_at);
                
                return (
                  <div key={tx.id} style={{ 
                    display: 'flex', alignItems: 'center', gap: 12, padding: 16, 
                    border: '1px solid var(--vb-border)', borderRadius: 8, backgroundColor: '#fff' 
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
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
                        {tx.description || (isCredit ? 'Cash Received' : 'Purchase')}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontSize: 16, fontWeight: 700, 
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
      </div>
    </div>
  );
}
