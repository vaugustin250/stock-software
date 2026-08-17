import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { IndianRupee, ShoppingCart, Info } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

export default function PurchaseManDashboard() {
  const isMobile = useIsMobile();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const today = new Date().toISOString().split('T')[0];

  const { data: balanceData, isLoading: loadingBalance } = useQuery({
    queryKey: ['wallet_balance', user.id],
    queryFn: async () => (await api.get(`/wallet/balance/${user.id}`)).data
  });

  const { data: requirements, isLoading: loadingReq } = useQuery({
    queryKey: ['my_allocations', today],
    queryFn: async () => (await api.get(`/allocation/my?date=${today}`)).data
  });

  return (
    <div className="vb-page">
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">My Dashboard</h1>
          <p className="vb-page-sub">Hello, {user.username}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Wallet Card */}
        <div className="vb-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 12 }}>
            <IndianRupee size={24} style={{ color: '#38bdf8' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>Available Cash</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {loadingBalance ? '...' : `₹${parseFloat(balanceData?.balance || 0).toLocaleString()}`}
            </div>
          </div>
        </div>

        {/* Requirements summary */}
        <div className="vb-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: 'var(--vb-blue-pale)', padding: 12, borderRadius: 12 }}>
            <ShoppingCart size={24} style={{ color: 'var(--vb-blue)' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--vb-muted)', marginBottom: 4 }}>Pending Items to Buy</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--vb-blue)' }}>
              {loadingReq ? '...' : (requirements?.data?.length || 0)}
            </div>
          </div>
        </div>
      </div>

      <div className="vb-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--vb-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Info size={18} style={{ color: 'var(--vb-muted)' }} />
          <h2 style={{ fontSize: 16, margin: 0, fontWeight: 600 }}>My Assigned Purchases for Today</h2>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '8px' : '16px' }}>
          {loadingReq ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Loading...</div>
          ) : requirements?.data?.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>No requirements found for today.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {requirements?.data?.map((item: any) => (
                <div key={item.product_id} style={{ border: '1px solid var(--vb-border)', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{item.product_name}</div>
                  {item.product_name_tamil && (
                    <div style={{ fontSize: 12, color: '#64748b', fontFamily: "'Noto Sans Tamil', sans-serif" }}>
                      {item.product_name_tamil}
                    </div>
                  )}
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Assigned</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>{parseFloat(item.total)} {item.unit_name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
