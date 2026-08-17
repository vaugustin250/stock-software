import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Package, Users, Settings, LogOut, FileSpreadsheet,
  ShoppingCart, ClipboardList, Truck, Box, CheckSquare,
  IndianRupee, LineChart, Calculator, BarChart2, Bell,
  Home, Menu, X, ChevronDown, Activity, Wallet
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  section?: string;
}

const navItems: NavItem[] = [
  // Branch
  { name: 'Dashboard',       href: '/dashboard',           icon: Home,           roles: ['BRANCH', 'WAREHOUSE', 'ADMIN'], section: 'Home' },
  { name: 'Today Closing Stock', href: '/po/entry',        icon: ShoppingCart,   roles: ['BRANCH', 'WAREHOUSE', 'ADMIN'], section: 'Branch' },
  { name: 'Receive Stock',   href: '/inventory/receiving', icon: CheckSquare,    roles: ['BRANCH', 'ADMIN'],              section: 'Branch' },
  { name: 'Live Rates',      href: '/rates/view',          icon: IndianRupee,    roles: ['BRANCH', 'WAREHOUSE', 'ADMIN'], section: 'Branch' },
  // Warehouse
  { name: 'Closing Stock Report', href: '/po/combined-report', icon: ClipboardList, roles: ['WAREHOUSE', 'ADMIN'],       section: 'Warehouse' },
  { name: 'Stock Inward Entry',  href: '/inventory/purchase',  icon: Box,            roles: ['WAREHOUSE', 'ADMIN'],           section: 'Warehouse' },
  { name: 'Assign Purchases',href: '/warehouse/allocations', icon: CheckSquare,  roles: ['WAREHOUSE', 'ADMIN'],           section: 'Purchase Man' },
  { name: 'Send Stock',      href: '/inventory/transfer',  icon: Truck,          roles: ['WAREHOUSE', 'ADMIN'],           section: 'Warehouse' },
  { name: 'Rate Master',     href: '/rates/master',        icon: IndianRupee,    roles: ['WAREHOUSE', 'ADMIN'],           section: 'Warehouse' },
  { name: 'Rate History',    href: '/rates/weekly',        icon: LineChart,      roles: ['WAREHOUSE', 'ADMIN'],           section: 'Warehouse' },
  { name: 'Godown Stock',    href: '/reports/stock-ledger',icon: Calculator,     roles: ['WAREHOUSE', 'ADMIN'],           section: 'Warehouse' },
  { name: 'Variance Report', href: '/reports/variance',    icon: BarChart2,      roles: ['WAREHOUSE', 'ADMIN'],           section: 'Warehouse' },
  { name: 'Purchase Men Wallet', href: '/warehouse/wallets', icon: Wallet,       roles: ['WAREHOUSE', 'ADMIN'],           section: 'Purchase Man' },
  // Purchase Man
  { name: 'My Dashboard',    href: '/purchase-man/dashboard', icon: Home,        roles: ['PURCHASE_MAN'],                 section: 'Market Purchase' },
  { name: 'Buy Stock',       href: '/purchase-man/market',    icon: ShoppingCart, roles: ['PURCHASE_MAN'],                 section: 'Market Purchase' },
  { name: 'My Wallet',       href: '/purchase-man/wallet',    icon: IndianRupee,  roles: ['PURCHASE_MAN'],                 section: 'Market Purchase' },
  // Admin Masters
  { name: 'Products',        href: '/masters/products',    icon: Package,        roles: ['ADMIN'],                        section: 'Masters' },
  { name: 'Groups',          href: '/masters/groups',      icon: FileSpreadsheet,roles: ['ADMIN'],                        section: 'Masters' },
  { name: 'Departments',     href: '/masters/departments', icon: FileSpreadsheet,roles: ['ADMIN'],                        section: 'Masters' },
  { name: 'Units',           href: '/masters/units',       icon: FileSpreadsheet,roles: ['ADMIN'],                        section: 'Masters' },
  { name: 'Branches',        href: '/masters/branches',    icon: Settings,       roles: ['ADMIN'],                        section: 'Masters' },
  { name: 'Users',           href: '/masters/users',       icon: Users,          roles: ['ADMIN'],                        section: 'Masters' },
];

const branchBottomNav: NavItem[] = [
  { name: 'Home',          href: '/dashboard',           icon: Home,         roles: ['BRANCH', 'ADMIN'] },
  { name: 'Closing Stock', href: '/po/entry',            icon: ShoppingCart, roles: ['BRANCH', 'ADMIN'] },
  { name: 'Receive',       href: '/inventory/receiving', icon: CheckSquare,  roles: ['BRANCH', 'ADMIN'] },
  { name: 'Rates',   href: '/rates/view',          icon: IndianRupee,  roles: ['BRANCH', 'ADMIN'] },
];

const warehouseBottomNav: NavItem[] = [
  { name: 'Home',          href: '/dashboard',          icon: Home,         roles: ['WAREHOUSE', 'ADMIN'] },
  { name: 'Purchase',      href: '/inventory/purchase', icon: Box,          roles: ['WAREHOUSE', 'ADMIN'] },
  { name: 'Send',          href: '/inventory/transfer', icon: Truck,        roles: ['WAREHOUSE', 'ADMIN'] },
  { name: 'Closing Stock', href: '/po/combined-report', icon: ClipboardList,roles: ['WAREHOUSE', 'ADMIN'] },
  { name: 'Rates',         href: '/rates/view',         icon: IndianRupee,  roles: ['WAREHOUSE', 'ADMIN'] },
];

const purchaseManBottomNav: NavItem[] = [
  { name: 'Dashboard',     href: '/purchase-man/dashboard', icon: Home,         roles: ['PURCHASE_MAN'] },
  { name: 'Buy Stock',     href: '/purchase-man/market',    icon: ShoppingCart, roles: ['PURCHASE_MAN'] },
  { name: 'Wallet',        href: '/purchase-man/wallet',    icon: IndianRupee,  roles: ['PURCHASE_MAN'] },
];

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role || 'BRANCH';
  const branchName = user.username || 'User';

  // Unread rate-change count from localStorage
  const unreadCount = parseInt(localStorage.getItem('vb_unread') || '0');

  const filtered = navItems.filter(item => item.roles.includes(role));

  // Group by section
  const sections: Record<string, NavItem[]> = {};
  filtered.forEach(item => {
    const s = item.section || 'Menu';
    if (!sections[s]) sections[s] = [];
    sections[s].push(item);
  });

  const filteredBottom = role === 'WAREHOUSE'
    ? warehouseBottomNav
    : role === 'PURCHASE_MAN'
    ? purchaseManBottomNav
    : branchBottomNav.filter(item => item.roles.includes(role));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('vb_unread');
    navigate('/login');
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = (href: string) => location.pathname === href;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--vb-bg)' }}>

      {/* ── Top Bar ── */}
      <header className="vb-topbar">
        {/* Hamburger */}
        <button className="vb-topbar-icon-btn" onClick={() => setSidebarOpen(v => !v)}>
          <Menu size={20} />
        </button>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span className="vb-topbar-logo">VBills Stock</span>
          <span className="vb-topbar-sub">MANAGEMENT SYSTEM</span>
        </div>

        <div className="vb-topbar-spacer" />

        {/* Bell */}
        <Link to="/rates/view" className="vb-bell-badge" style={{ color: '#fff' }}>
          <button className="vb-topbar-icon-btn">
            <Bell size={18} />
          </button>
          {unreadCount > 0 && <span className="vb-bell-count">{unreadCount}</span>}
        </Link>

        {/* User chip */}
        <div ref={dropRef} style={{ position: 'relative' }}>
          <button className="vb-user-chip" onClick={() => setUserDropdown(v => !v)}>
            <Activity size={15} style={{ opacity: 0.8 }} />
            {branchName}
            <ChevronDown size={14} style={{ opacity: 0.7 }} />
          </button>
          {userDropdown && (
            <div style={{
              position: 'absolute', right: 0, top: '110%',
              background: 'var(--vb-card)', border: '1px solid var(--vb-border)',
              borderRadius: 10, boxShadow: 'var(--vb-shadow-md)',
              minWidth: 160, zIndex: 300, overflow: 'hidden',
              animation: 'slideUp 0.15s ease',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--vb-border)' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{branchName}</div>
                <div style={{ fontSize: 11, color: 'var(--vb-muted)', marginTop: 2 }}>{role}</div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '12px 16px', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 14, fontWeight: 600, color: 'var(--vb-red)',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                <LogOut size={15} /> Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar overlay backdrop on mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
              zIndex: 150, display: 'none',
            }}
            className="sidebar-overlay"
          />
        )}

        {/* ── Sidebar ── */}
        <aside className={`vb-sidebar${sidebarOpen ? ' open' : ''}`}>
          {/* Brand */}
          <div className="vb-sidebar-brand">
            <div className="vb-sidebar-brand-icon">V</div>
            <div>
              <div className="vb-sidebar-brand-text">VBills</div>
              <div className="vb-sidebar-brand-sub">Stock Mgmt</div>
            </div>
            <button
              className="vb-topbar-icon-btn"
              style={{ marginLeft: 'auto', background: 'var(--vb-blue-pale)', color: 'var(--vb-blue)' }}
              onClick={() => setSidebarOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          {/* Nav */}
          <nav className="vb-sidebar-nav">
            {Object.entries(sections).map(([section, items]) => (
              <div key={section}>
                <div className="vb-sidebar-section-label">{section}</div>
                {items.map(item => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`vb-nav-item${isActive(item.href) ? ' active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="nav-icon" />
                    {item.name}
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="vb-sidebar-footer">
            <button className="vb-nav-item" onClick={handleLogout} style={{ color: 'var(--vb-red)', width: '100%' }}>
              <LogOut className="nav-icon" />
              Logout
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </main>
      </div>

      {/* ── Bottom Nav (mobile) ── */}
      <nav className="vb-bottom-nav">
        {filteredBottom.map(item => (
          <Link
            key={item.href}
            to={item.href}
            className={`vb-bottom-nav-item${isActive(item.href) ? ' active' : ''}`}
          >
            <item.icon />
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
