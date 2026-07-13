import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { Button, Card, Badge, LoadingSpinner } from '../components/ui';
import type { TransactionRecord } from '@shared/types';
import { getNetworkConfig } from '@shared/networks';
import { getExplorerTxUrl } from '../components/ui';
import { useNotify } from '../hooks/useNotify';

export function HistoryPage() {
  const { activeAccount, settings, t } = useWallet();
  const notify = useNotify();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!activeAccount) return;
    setLoading(true);
    const res = await window.walletApi.refreshTransactions(activeAccount.id);
    if (res.success && res.data) {
      setTransactions(res.data);
      if (res.data.length === 0) notify.info(notify.t.toast.historyEmpty);
      else notify.success(notify.t.toast.historyRefreshed);
    } else {
      notify.apiError(res.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [activeAccount?.id]);

  const saveNote = async (txId: string, note: string) => {
    const res = await window.walletApi.updateTransactionNote(txId, note);
    if (res.success) {
      notify.success(notify.t.toast.noteSaved);
      load();
    } else {
      notify.apiError(res.error);
    }
  };

  if (!activeAccount) return <LoadingSpinner />;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.history}</h1>
        <Button variant="secondary" onClick={load}>
          <RefreshCw size={16} />
          {t.refresh}
        </Button>
      </div>
      <Card>
        {loading ? (
          <LoadingSpinner />
        ) : transactions.length === 0 ? (
          <p className="py-8 text-center text-gray-500">{t.noTransactions}</p>
        ) : (
          <div className="divide-y divide-surface-700">
            {transactions.map((tx) => (
              <div key={tx.id} className="py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant={tx.direction === 'in' ? 'success' : 'default'}>
                      {tx.direction === 'in' ? t.incoming : t.outgoing}
                    </Badge>
                    <Badge>
                      {tx.lightning
                        ? t.lightningHistoryBadge
                        : getNetworkConfig(tx.network, settings.testnetMode).name}
                    </Badge>
                    <p className="mt-1 font-semibold">
                      {tx.direction === 'in' ? '+' : '-'}
                      {tx.amount} {tx.assetSymbol || getNetworkConfig(tx.network, settings.testnetMode).symbol}
                    </p>
                    {tx.fee && parseFloat(tx.fee) > 0 && (
                      <p className="text-xs text-gray-500">
                        {t.fee}: {tx.fee} BTC
                      </p>
                    )}
                    <p className="text-xs text-gray-500">{format(new Date(tx.timestamp), 'dd.MM.yyyy HH:mm')}</p>
                  </div>
                  {!tx.lightning && (
                    <Button
                      variant="ghost"
                      onClick={() =>
                        window.open(getExplorerTxUrl(tx.network, tx.hash, settings.testnetMode), '_blank')
                      }
                    >
                      <ExternalLink size={16} />
                    </Button>
                  )}
                </div>
                <input
                  className="w-full rounded-lg border border-surface-600 bg-surface-900 px-3 py-1 text-xs"
                  placeholder={t.note}
                  defaultValue={tx.note || ''}
                  onBlur={(e) => saveNote(tx.id, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
