import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, createSocket } from '../lib/api';
import { Bell } from 'lucide-react';

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const show = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2000);
  };
  return { toast, show };
}

const RateView = () => {
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');
  const [liveChanges, setLiveChanges] = useState<Record<number, boolean>>({});
  const queryClient = useQueryClient();
  const { toast, show: showToast } = useToast();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const { data: groups, isError: groupsError } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await api.get('/masters/groups');
      return res.data;
    }
  });

  const { data: ratesData, isLoading, isError: ratesError, refetch } = useQuery({
    queryKey: ['rates_view'],
    queryFn: async () => {
      const prodRes = await api.get('/masters/products');
      const ratesRes = await api.get('/rates');
      const ratesDict: Record<number, any> = {};
      ratesRes.data.rates.forEach((r: any) => ratesDict[r.product_id] = r);
      const products = prodRes.data.map((p: any) => ({
        ...p,
        current_rate: ratesDict[p.id]?.rate || 0,
        prev_rate: ratesDict[p.id]?.prev_rate || null,
        rate_change_id: ratesDict[p.id]?.id,
      }));
      return { products, unacknowledged: ratesRes.data.unacknowledged || [] };
    },
  });

  useEffect(() => {
    if (!ratesData) return;
    const init: Record<number, boolean> = {};
    ratesData.products.forEach((p: any) => {
      if (ratesData.unacknowledged.includes(p.rate_change_id)) init[p.id] = true;
    });
    setLiveChanges(init);
    const count = Object.values(init).filter(Boolean).length;
    localStorage.setItem('vb_unread', String(count));
  }, [ratesData]);

  useEffect(() => {
    try {
      const socket = createSocket();
      socket.on('rate_changed', (d: any) => {
        if (!d.branch_id || d.branch_id === user.branch_id || d.branch_id === 1) {
          queryClient.setQueryData(['rates_view'], (old: any) => {
            if (!old) return old;
            return {
              ...old,
              products: old.products.map((p: any) =>
                p.id === d.product_id
                  ? { ...p, current_rate: d.rate, prev_rate: p.current_rate, rate_change_id: d.id }
                  : p
              ),
            };
          });
          setLiveChanges(prev => {
            const next = { ...prev, [d.product_id]: true };
            localStorage.setItem('vb_unread', String(Object.values(next).filter(Boolean).length));
            return next;
          });
        }
      });
      return () => { socket.disconnect(); };
    } catch { /* socket not available */ }
  }, [queryClient, user.branch_id]);

  const ackMutation = useMutation({
    mutationFn: async (rate_change_id: number) => {
      await api.post('/rates/ack', { rate_change_id });
    },
    onSuccess: (_, rate_change_id) => {
      const product = ratesData?.products.find((p: any) => p.rate_change_id === rate_change_id);
      if (product) {
        setLiveChanges(prev => {
          const next = { ...prev, [product.id]: false };
          localStorage.setItem('vb_unread', String(Object.values(next).filter(Boolean).length));
          return next;
        });
      }
      showToast('Noted ✓', 'info');
    }
  });

  const filteredProducts = ratesData?.products?.filter((p: any) =>
    selectedGroupId === '' || p.group_id === selectedGroupId
  ) || [];

  const unreadCount = Object.values(liveChanges).filter(Boolean).length;

  return (
    <div className="vb-page">

      {toast && (
        <div className="vb-toast-wrap">
          <div className={`vb-toast ${toast.type}`}>{toast.msg}</div>
        </div>
      )}

      {/* Header */}
      <div className="vb-page-header">
        <div>
          <h1 className="vb-page-title">Today's Rates</h1>
          <p className="vb-page-sub" style={{ fontFamily: "'Noto Sans Tamil', sans-serif" }}>
            இன்றைய விலைகள் — Live prices from Head Office
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {unreadCount > 0 && (
            <div className="vb-badge vb-badge-red" style={{ fontSize: 13, padding: '6px 12px', gap: 6 }}>
              <Bell size={14} />
              {unreadCount} rate{unreadCount !== 1 ? 's' : ''} updated
            </div>
          )}
        </div>
      </div>

      {(groupsError || ratesError) && (
        <div className="vb-error-banner">
          ⚠ Could not load rates.{' '}
          <button className="vb-btn vb-btn-sm vb-btn-outline-blue" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {unreadCount > 0 && (
        <div className="vb-info-banner">
          🔴 {unreadCount} rate{unreadCount !== 1 ? 's' : ''} changed today — tap a red row to acknowledge.
        </div>
      )}

      {/* Filter + Table */}
      <div className="vb-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--vb-border)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="vb-label" style={{ margin: 0 }}>Category</label>
          <div style={{ position: 'relative', minWidth: 200, flex: 1 }}>
            <select
              className="vb-select"
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value === '' ? '' : parseInt(e.target.value))}
            >
              <option value="">— All Categories —</option>
              {groups?.map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 32 }}>
              {[1,2,3].map(i => <div key={i} className="vb-skeleton" style={{ height: 64, marginBottom: 8 }} />)}
            </div>
          ) : (
            <table className="vb-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th>Item / பொருள்</th>
                  <th style={{ textAlign: 'right' }}>Rate ₹</th>
                  <th style={{ textAlign: 'center', width: 130 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product: any) => {
                  const isChanged = liveChanges[product.id];
                  const wentDown = product.prev_rate && product.current_rate < product.prev_rate;
                  const wentUp = product.prev_rate && product.current_rate > product.prev_rate;

                  return (
                    <tr
                      key={product.id}
                      className={isChanged ? 'row-changed' : ''}
                      onClick={() => {
                        if (isChanged && product.rate_change_id) {
                          ackMutation.mutate(product.rate_change_id);
                        }
                      }}
                      style={{ cursor: isChanged ? 'pointer' : 'default' }}
                      title={isChanged ? 'Tap to mark as seen' : ''}
                    >
                      <td>
                        <span className="vb-product-name-ta">{product.name_tamil || product.name}</span>
                        {product.name_tamil && (
                          <span className="vb-product-name-en">{product.name}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <span className={isChanged ? 'vb-rate-changed' : ''} style={{ fontSize: 18, fontWeight: 800 }}>
                            {wentDown ? '↓' : wentUp ? '↑' : ''} ₹{product.current_rate}
                          </span>
                          {isChanged && product.prev_rate && product.prev_rate !== product.current_rate && (
                            <span className="vb-rate-was">was ₹{product.prev_rate}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isChanged ? (
                          <span className="vb-badge vb-badge-red">🔴 New — tap to note</span>
                        ) : (
                          <span className="vb-badge vb-badge-green">✓ Viewed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default RateView;
