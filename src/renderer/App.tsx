import { Navigate, Route, Routes } from 'react-router-dom';
import { useWallet } from './context/WalletContext';
import { Layout } from './components/Layout';
import { LoadingSpinner } from './components/ui';
import { WelcomePage, UnlockPage } from './pages/AuthPages';
import { CreateWalletPage, ImportWalletPage } from './pages/SetupPages';
import { DashboardPage } from './pages/DashboardPage';
import { SendPage } from './pages/SendPage';
import { ReceivePage } from './pages/ReceivePage';
import { HistoryPage } from './pages/HistoryPage';
import { AddressBookPage } from './pages/AddressBookPage';
import { SecurityPage, BackupPage, SettingsPage, HardwareWalletPage, MultisigPage } from './pages/OtherPages';
import { HelpPage } from './pages/HelpPage';

function ProtectedRoutes() {
  const { session, loading } = useWallet();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!session.unlocked) {
    return <Navigate to="/unlock" replace />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/send" element={<SendPage />} />
        <Route path="/receive" element={<ReceivePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/address-book" element={<AddressBookPage />} />
        <Route path="/backup" element={<BackupPage />} />
        <Route path="/hardware" element={<HardwareWalletPage />} />
        <Route path="/multisig" element={<MultisigPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

function AppRoutes() {
  const { session, loading } = useWallet();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          !session.hasVault ? (
            <WelcomePage />
          ) : session.unlocked ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/unlock" replace />
          )
        }
      />
      <Route
        path="/unlock"
        element={session.unlocked ? <Navigate to="/dashboard" replace /> : <UnlockPage />}
      />
      <Route path="/create" element={<CreateWalletPage />} />
      <Route path="/import" element={!session.hasVault ? <ImportWalletPage /> : <Navigate to="/unlock" replace />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
}

export default function App() {
  return <AppRoutes />;
}
