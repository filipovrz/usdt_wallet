import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { Button, Card, Badge, NetworkSelector, LoadingSpinner, WarningAlert } from '../components/ui';
import { getNetworkConfig } from '@shared/networks';
import { getAccountAddress, getNetworkTokenLabel } from '@shared/types';
import type { TronResources } from '@shared/types';
import { useNotify } from '../hooks/useNotify';

export function DashboardPage() {
  const {
    activeAccount,
    activeNetwork,
    setActiveNetwork,
    balance,
    refreshBalance,
    settings,
    session,
    setActiveAccount,
    t,
  } = useWallet();
  const notify = useNotify();
  const [tronResources, setTronResources] = useState<TronResources | null>(null);

  useEffect(() => {
    if (activeAccount && activeNetwork === 'tron' && !settings.offlineMode) {
      window.walletApi.getTronResources(activeAccount.id).then((r) => {
        if (r.success && r.data) setTronResources(r.data);
      });
    }
  }, [activeAccount?.id, activeNetwork, settings.offlineMode]);

  const handleRefresh = async () => {
    if (settings.offlineMode) {
      notify.warning(notify.t.toast.offlineBlocked);
      return;
    }
    if (!activeAccount) return;
    const res = await window.walletApi.getBalance(activeAccount.id, activeNetwork);
    if (res.success) {
      await refreshBalance();
      notify.success(notify.t.toast.balanceRefreshed);
    } else {
      notify.apiError(res.error);
    }
  };

  const handleCopy = async () => {
    if (!activeAccount) return;
    const address = getAccountAddress(activeAccount, activeNetwork);
    await navigator.clipboard.writeText(address);
    notify.success(notify.t.toast.copied);
  };

  if (!activeAccount) return <LoadingSpinner />;

  const address = getAccountAddress(activeAccount, activeNetwork);
  const cfg = getNetworkConfig(activeNetwork, settings.testnetMode);
  const tokenLabel = getNetworkTokenLabel(activeNetwork, settings.testnetMode);

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          {session.accounts.length > 1 && (
            <select
              className="mt-2 rounded-lg border border-surface-600 bg-surface-800 px-3 py-1 text-sm"
              value={activeAccount.id}
              onChange={(e) => {
                const acc = session.accounts.find((a) => a.id === e.target.value);
                if (acc) setActiveAccount(acc);
              }}
            >
              {session.accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
        </div>
        <Button variant="secondary" onClick={handleRefresh} disabled={settings.offlineMode}>
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      {settings.offlineMode && (
        <WarningAlert message="Offline mode — balances hidden. Disable in Settings." />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-6">
          <NetworkSelector value={activeNetwork} onChange={setActiveNetwork} testnet={settings.testnetMode} />
          <div className="rounded-2xl bg-gradient-to-br from-brand-600/20 to-surface-900 p-6 border border-brand-500/20">
            <p className="text-sm text-gray-400">{tokenLabel} {t.balance}</p>
            <p className="mt-2 text-4xl font-bold">
              {settings.hideBalances ? '••••••' : balance?.usdt ?? '0'} {tokenLabel}
            </p>
            {balance?.usdValue && !settings.hideBalances && (
              <p className="mt-1 text-sm text-gray-500">≈ {balance.usdValue}</p>
            )}
            <p className="mt-4 text-sm text-gray-500">
              Native: {settings.hideBalances ? '••••' : `${balance?.native ?? '0'} ${cfg.nativeSymbol}`}
            </p>
          </div>
          {activeNetwork === 'tron' && tronResources && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-surface-900 p-3">
                <span className="text-gray-500">Energy</span>
                <p className="font-mono">{tronResources.freeEnergy}</p>
              </div>
              <div className="rounded-xl bg-surface-900 p-3">
                <span className="text-gray-500">Bandwidth</span>
                <p className="font-mono">{tronResources.freeBandwidth}</p>
              </div>
            </div>
          )}
        </Card>
        <Card className="space-y-4">
          <h2 className="font-semibold">Address</h2>
          <Badge>{cfg.name}</Badge>
          <p className="break-all font-mono text-xs text-gray-400">{address}</p>
          <Button variant="ghost" onClick={handleCopy}>Copy</Button>
        </Card>
      </div>
    </div>
  );
}
