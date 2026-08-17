import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProductMaster from './pages/ProductMaster';
import GroupMaster from './pages/GroupMaster';
import DepartmentMaster from './pages/DepartmentMaster';
import UnitMaster from './pages/UnitMaster';
import BranchMaster from './pages/BranchMaster';
import UserMaster from './pages/UserMaster';
import PoEntry from './pages/PoEntry';
import PoCombinedReport from './pages/PoCombinedReport';
import PurchaseEntry from './pages/PurchaseEntry';
import TransferEntry from './pages/TransferEntry';
import ReceivingConfirmation from './pages/ReceivingConfirmation';
import RateMaster from './pages/RateMaster';
import RateView from './pages/RateView';
import RateWeeklyReport from './pages/RateWeeklyReport';
import GodownStockLedger from './pages/GodownStockLedger';
import PurchaseVsOrdered from './pages/PurchaseVsOrdered';
import SupplierMaster from './pages/SupplierMaster';
import PurchaseMenWallet from './pages/PurchaseMenWallet';
import PurchaseAllocation from './pages/PurchaseAllocation';
import PurchaseManDashboard from './pages/PurchaseManDashboard';
import MarketPurchase from './pages/MarketPurchase';
import WalletHistory from './pages/WalletHistory';
import WarehousePurchases from './pages/WarehousePurchases';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    }
  }
});

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />

            <Route path="po">
              <Route path="entry" element={<PoEntry />} />
              <Route path="combined-report" element={<PoCombinedReport />} />
            </Route>

            <Route path="inventory">
              <Route path="purchase" element={<PurchaseEntry />} />
              <Route path="transfer" element={<TransferEntry />} />
              <Route path="receiving" element={<ReceivingConfirmation />} />
            </Route>

            <Route path="rates">
              <Route path="master" element={<RateMaster />} />
              <Route path="view" element={<RateView />} />
              <Route path="weekly" element={<RateWeeklyReport />} />
            </Route>

            <Route path="reports">
              <Route path="stock-ledger" element={<GodownStockLedger />} />
              <Route path="variance" element={<PurchaseVsOrdered />} />
            </Route>

            <Route path="warehouse">
              <Route path="allocations" element={<PurchaseAllocation />} />
              <Route path="wallets" element={<PurchaseMenWallet />} />
              <Route path="purchases" element={<WarehousePurchases />} />
            </Route>

            <Route path="purchase-man">
              <Route path="dashboard" element={<PurchaseManDashboard />} />
              <Route path="market" element={<MarketPurchase />} />
              <Route path="wallet" element={<WalletHistory />} />
            </Route>

            <Route path="masters">
              <Route path="products" element={<ProductMaster />} />
              <Route path="groups" element={<GroupMaster />} />
              <Route path="departments" element={<DepartmentMaster />} />
              <Route path="units" element={<UnitMaster />} />
              <Route path="branches" element={<BranchMaster />} />
              <Route path="users" element={<UserMaster />} />
              <Route path="suppliers" element={<SupplierMaster />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
