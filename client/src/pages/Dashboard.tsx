import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  ShoppingCart, CheckSquare, IndianRupee, BarChart2,
  ClipboardList, Box, Truck, Calculator, Package, Settings, Users,
  AlertCircle, Clock, TrendingUp, Warehouse, Building2
} from 'lucide-react';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const TileCard = ({
  title, titleTa, sub, icon: Icon, iconClass, tileClass, href, badge, badgeType, delay,
}: {
  title: string; titleTa?: string; sub: string;
  icon: React.ElementType; iconClass: string; tileClass: string;
  href: string; badge?: string; badgeType?: 'green' | 'amber' | 'red'; delay?: number;
}) => (
  <Link
    to={href}
    className={`vb-tile ${tileClass}`}
    style={{ animationDelay: `${delay || 0}ms` }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div className={`vb-tile-icon ${iconClass}`}>
        <Icon size={24} />
      </div>
      {badge && (
        <span className={`vb-badge vb-badge-${badgeType || 'amber'}`}>
          {badge}
        </span>
      )}
    </div>
    <div>
      {titleTa && (
        <div style={{ fontFamily: "'Noto Sans Tamil', sans-serif", fontSize: 13, color: 'var(--vb-muted)', marginBottom: 2 }}>
          {titleTa}
        </div>
      )}
      <p className="vb-tile-title">{title}</p>
      <p className="vb-tile-sub">{sub}</p>
    </div>
    <div style={{
      marginTop: 'auto',
      fontSize: 13,
      fontWeight: 700,
      color: 'var(--vb-blue)',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    }}>
      Open →
    </div>
  </Link>
);

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role || 'BRANCH';
  const name = user.username || 'User';
  const greeting = getGreeting();
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  
  const isHeadOffice = role === 'WAREHOUSE' || role === 'ADMIN';

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await api.get('/reports/dashboard-summary');
      return res.data;
    },
    enabled: isHeadOffice
  });

  const branchTiles = [
    {
      title: "Today's Order",
      titleTa: 'இன்றைய ஆர்டர்',
      sub: 'Enter your daily order',
      icon: ShoppingCart,
      iconClass: 'vb-tile-icon-blue',
      tileClass: 'vb-tile-blue',
      href: '/po/entry',
      badge: 'Not done ⚠',
      badgeType: 'amber' as const,
      delay: 0,
    },
    {
      title: 'Receive Stock',
      titleTa: 'பொருட்கள் பெறுதல்',
      sub: 'Confirm goods from godown',
      icon: CheckSquare,
      iconClass: 'vb-tile-icon-green',
      tileClass: 'vb-tile-green',
      href: '/inventory/receiving',
      badge: 'Pending',
      badgeType: 'amber' as const,
      delay: 80,
    },
    {
      title: 'Rate Updates',
      titleTa: 'விலை மாற்றங்கள்',
      sub: 'Live prices from head office',
      icon: IndianRupee,
      iconClass: 'vb-tile-icon-amber',
      tileClass: 'vb-tile-amber',
      href: '/rates/view',
      delay: 160,
    },
    {
      title: 'My Reports',
      titleTa: 'என் அறிக்கைகள்',
      sub: 'Orders, receipts & rates',
      icon: BarChart2,
      iconClass: 'vb-tile-icon-blue',
      tileClass: 'vb-tile-blue',
      href: '/reports/variance',
      delay: 240,
    },
  ];

  const warehouseTiles = [
    {
      title: 'Branch Order Entry',
      sub: 'Place order for branches',
      icon: ShoppingCart,
      iconClass: 'vb-tile-icon-blue',
      tileClass: 'vb-tile-blue',
      href: '/po/entry',
      delay: 0,
    },
    {
      title: 'Combined Orders',
      sub: 'All branch PO summary',
      icon: ClipboardList,
      iconClass: 'vb-tile-icon-amber',
      tileClass: 'vb-tile-amber',
      href: '/po/combined-report',
      delay: 80,
    },
    {
      title: 'Purchase Entry',
      sub: 'Record godown purchases',
      icon: Box,
      iconClass: 'vb-tile-icon-green',
      tileClass: 'vb-tile-green',
      href: '/inventory/purchase',
      delay: 80,
    },
    {
      title: 'Send Stock',
      sub: 'Transfer to branches',
      icon: Truck,
      iconClass: 'vb-tile-icon-amber',
      tileClass: 'vb-tile-amber',
      href: '/inventory/transfer',
      delay: 160,
    },
    {
      title: 'Rate Master',
      sub: 'Update live prices',
      icon: IndianRupee,
      iconClass: 'vb-tile-icon-red',
      tileClass: 'vb-tile-red',
      href: '/rates/master',
      delay: 240,
    },
    {
      title: 'Godown Stock',
      sub: 'Purchased vs dispatched',
      icon: Calculator,
      iconClass: 'vb-tile-icon-blue',
      tileClass: 'vb-tile-blue',
      href: '/reports/stock-ledger',
      delay: 320,
    },
    {
      title: 'Reports',
      sub: 'Variance & rate history',
      icon: TrendingUp,
      iconClass: 'vb-tile-icon-green',
      tileClass: 'vb-tile-green',
      href: '/reports/variance',
      delay: 400,
    },
  ];

  const adminTiles = [
    {
      title: 'Products',
      sub: 'Manage product catalogue',
      icon: Package,
      iconClass: 'vb-tile-icon-blue',
      tileClass: 'vb-tile-blue',
      href: '/masters/products',
      delay: 0,
    },
    {
      title: 'Branches',
      sub: 'Manage branch list',
      icon: Warehouse,
      iconClass: 'vb-tile-icon-green',
      tileClass: 'vb-tile-green',
      href: '/masters/branches',
      delay: 80,
    },
    {
      title: 'Users',
      sub: 'Add & manage logins',
      icon: Users,
      iconClass: 'vb-tile-icon-amber',
      tileClass: 'vb-tile-amber',
      href: '/masters/users',
      delay: 160,
    },
    {
      title: 'Settings',
      sub: 'Groups, depts, units',
      icon: Settings,
      iconClass: 'vb-tile-icon-red',
      tileClass: 'vb-tile-red',
      href: '/masters/groups',
      delay: 240,
    },
  ];

  const tiles = role === 'BRANCH'
    ? branchTiles
    : role === 'ADMIN'
    ? [...warehouseTiles, ...adminTiles]
    : warehouseTiles;

  return (
    <div className="vb-page">

      {/* Greeting */}
      <div style={{
        background: 'linear-gradient(135deg, var(--vb-blue) 0%, #2980B9 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        animation: 'fadeIn 0.4s ease',
        boxShadow: '0 4px 24px rgba(30,86,160,0.25)',
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
            {greeting}, {name}! 👋
          </div>
          <div style={{ fontSize: 14, opacity: 0.85, fontWeight: 500 }}>{today}</div>
          {role === 'BRANCH' && (
            <div style={{
              marginTop: 12, fontSize: 13, opacity: 0.9,
              fontFamily: "'Noto Sans Tamil', sans-serif",
              background: 'rgba(255,255,255,0.12)',
              borderRadius: 8, padding: '6px 12px', display: 'inline-block',
            }}>
              உங்கள் இன்றைய பணிகளை முடிக்கவும் ✓
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900 }}>
              {new Date().toLocaleDateString('en-IN', { day: '2-digit' })}
            </div>
            <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {new Date().toLocaleDateString('en-IN', { month: 'short' })}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Clock size={28} style={{ opacity: 0.7 }} />
            <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600, letterSpacing: '0.05em', marginTop: 2, textTransform: 'uppercase' }}>
              {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </div>
          </div>
        </div>
      </div>

      {/* --- WAREHOUSE / ADMIN Analytics Dashboard --- */}
      {isHeadOffice && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.5s ease' }}>
          
          {/* Summary KPI Cards */}
          <div>
            <h2 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: 'var(--vb-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Today's Overview
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12,
            }}>
              <div className="vb-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '4px solid var(--vb-blue)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--vb-muted)' }}>
                  <ClipboardList size={18} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Branch Orders</span>
                </div>
                {isLoadingSummary ? <div className="vb-skeleton" style={{ height: 28, width: 40 }} /> : (
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--vb-text)' }}>
                    {summary?.branches_ordered || 0}
                  </div>
                )}
              </div>
              <div className="vb-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '4px solid var(--vb-amber)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--vb-muted)' }}>
                  <Truck size={18} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Sent</span>
                </div>
                {isLoadingSummary ? <div className="vb-skeleton" style={{ height: 28, width: 40 }} /> : (
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--vb-text)' }}>
                    {summary?.items_sent || 0} <span style={{ fontSize: 14, color: 'var(--vb-muted)' }}>dispatches</span>
                  </div>
                )}
              </div>
              <div className="vb-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '4px solid var(--vb-green)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--vb-muted)' }}>
                  <Box size={18} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Purchased</span>
                </div>
                {isLoadingSummary ? <div className="vb-skeleton" style={{ height: 28, width: 40 }} /> : (
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--vb-text)' }}>
                    {summary?.purchased_today || 0} <span style={{ fontSize: 14, color: 'var(--vb-muted)' }}>items</span>
                  </div>
                )}
              </div>
              <div className="vb-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '4px solid var(--vb-red)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--vb-muted)' }}>
                  <AlertCircle size={18} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Short Items</span>
                </div>
                {isLoadingSummary ? <div className="vb-skeleton" style={{ height: 28, width: 40 }} /> : (
                  <div style={{ fontSize: 24, fontWeight: 800, color: (summary?.short_products?.length > 0) ? 'var(--vb-red-dark)' : 'var(--vb-green-dark)' }}>
                    {summary?.short_products?.length || 0}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Short items alert list */}
          {summary?.short_products?.length > 0 && (
            <div className="vb-card" style={{ border: '1px solid var(--vb-red)', overflow: 'hidden' }}>
              <div style={{ background: 'var(--vb-red-pale)', padding: '12px 16px', borderBottom: '1px solid var(--vb-red)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={18} style={{ color: 'var(--vb-red)' }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--vb-red-dark)' }}>Action Required: Short Stock</h3>
              </div>
              <div style={{ padding: 12, maxHeight: 180, overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {summary.short_products.map((p: any) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                      <span style={{ fontSize: 13, color: 'var(--vb-red)', fontWeight: 600 }}>Ordered: {p.ordered} | Bal: {p.stock_balance}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Branch Status Horizontal List */}
          <div>
            <h2 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: 'var(--vb-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between' }}>
              <span>Branch Status</span>
              {summary && <span style={{ fontSize: 12, textTransform: 'none' }}>{summary.branches_not_ordered} waiting</span>}
            </h2>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'thin' }}>
              {isLoadingSummary ? (
                [1,2,3].map(i => <div key={i} className="vb-skeleton" style={{ height: 100, minWidth: 200, flexShrink: 0, borderRadius: 12 }} />)
              ) : (
                summary?.branch_status?.map((b: any) => (
                  <div key={b.id} className="vb-card" style={{ padding: '16px', minWidth: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15 }}>
                      <Building2 size={16} style={{ color: 'var(--vb-muted)' }} />
                      {b.code}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, fontWeight: 500 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Order Placed</span>
                        {b.has_ordered ? <span style={{ color: 'var(--vb-green-dark)' }}>✓ Yes</span> : <span style={{ color: 'var(--vb-muted)' }}>— Waiting</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Stock Sent</span>
                        {b.has_sent ? <span style={{ color: 'var(--vb-green-dark)' }}>✓ Yes</span> : <span style={{ color: 'var(--vb-muted)' }}>— Waiting</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <hr style={{ border: 'none', borderBottom: '1px solid var(--vb-border)', margin: '8px 0' }} />

        </div>
      )}

      {/* Section title */}
      <div>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--vb-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {role === 'BRANCH' ? 'What do you want to do?' : 'Quick Actions'}
        </h2>
      </div>

      {/* Tiles Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 16,
      }}>
        {tiles.map(tile => (
          <TileCard key={tile.href} {...tile} />
        ))}
      </div>

      {/* Quick info strip */}
      <div style={{
        background: 'var(--vb-card)',
        borderRadius: 12,
        padding: '14px 20px',
        border: '1px solid var(--vb-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 13,
        color: 'var(--vb-muted)',
        fontWeight: 500,
      }}>
        <AlertCircle size={16} style={{ color: 'var(--vb-blue)', flexShrink: 0 }} />
        {role === 'BRANCH'
          ? 'Tap a tile above to get started. Use the bottom menu for quick access on mobile.'
          : 'All data is real-time. Use filters on each page to narrow by date or category.'}
      </div>
    </div>
  );
};

export default Dashboard;
