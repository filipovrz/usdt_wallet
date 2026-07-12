import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Send, Download, History, BookUser, Settings,
  Shield, KeyRound, Lock, Wallet, CircleHelp, Usb, Users,
} from 'lucide-react';
import clsx from 'clsx';
import { useWallet } from '../context/WalletContext';
import { Button, CopyrightFooter } from './ui';
import { APP_VERSION } from '@shared/version';
import { useNotify } from '../hooks/useNotify';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'dashboard' as const },
  { to: '/send', icon: Send, key: 'send' as const },
  { to: '/receive', icon: Download, key: 'receive' as const },
  { to: '/history', icon: History, key: 'history' as const },
  { to: '/address-book', icon: BookUser, key: 'addressBook' as const },
  { to: '/backup', icon: KeyRound, key: 'backup' as const },
  { to: '/hardware', icon: Usb, key: 'hardware' as const },
  { to: '/multisig', icon: Users, key: 'multisig' as const },
  { to: '/security', icon: Shield, key: 'security' as const },
  { to: '/help', icon: CircleHelp, key: 'help' as const },
  { to: '/settings', icon: Settings, key: 'settings' as const },
];

export function Layout() {
  const { t, refreshSession } = useWallet();
  const notify = useNotify();

  const handleLock = async () => {
    await window.walletApi.lock();
    await refreshSession();
    notify.success(notify.t.toast.lockSuccess);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-900">
      <aside className="flex w-64 flex-col border-r border-surface-700 bg-surface-800/50">
        <div className="flex items-center gap-3 border-b border-surface-700 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20 text-brand-400">
            <Wallet size={22} />
          </div>
          <div>
            <h1 className="font-bold text-white">{t.appName}</h1>
            <p className="text-xs text-gray-500">{t.tagline.split('·')[0]}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map(({ to, icon: Icon, key }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-500/15 text-brand-300'
                    : 'text-gray-400 hover:bg-surface-700 hover:text-white'
                )
              }
            >
              <Icon size={18} />
              {t[key]}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-surface-700 p-3 space-y-2">
          <p className="text-center text-xs text-gray-600">v{APP_VERSION}</p>
          <CopyrightFooter />
          <Button variant="secondary" className="w-full" onClick={handleLock}>
            <Lock size={16} />
            {t.lock}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
