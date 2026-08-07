import { Link } from 'react-router-dom';
import {
  ShoppingCart, CheckSquare, IndianRupee, BarChart2,
  ClipboardList, Box, Truck, Calculator, Package, Settings, Users,
  AlertCircle, Clock, TrendingUp, Warehouse,
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
      title: 'Combined Orders',
      sub: 'All branch PO summary',
      icon: ClipboardList,
      iconClass: 'vb-tile-icon-blue',
      tileClass: 'vb-tile-blue',
      href: '/po/combined-report',
      delay: 0,
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

      {/* Section title */}
      <div>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--vb-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {role === 'BRANCH' ? 'What do you want to do?' : 'Head Office Dashboard'}
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
