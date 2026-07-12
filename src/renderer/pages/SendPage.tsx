import { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import {
  Button,
  Card,
  Input,
  NetworkSelector,
  ErrorAlert,
  SuccessAlert,
  LoadingSpinner,
  FeeTierSelector,
  WarningAlert,
  SendAssetSelector,
  getExplorerTxUrl,
} from '../components/ui';
import type { SendPreview, AddressBookEntry, FeeTier, SendAssetType } from '@shared/types';
import { getNetworkConfig, isSolanaNetwork } from '@shared/networks';
import { useNotify } from '../hooks/useNotify';
import { formatApiError } from '../i18n/api-messages';

export function SendPage() {
  const { activeAccount, activeNetwork, setActiveNetwork, settings, t } = useWallet();
  const notify = useNotify();
  const cfg = getNetworkConfig(activeNetwork, settings.testnetMode);
  const nativeSymbol = cfg.nativeSymbol;
  const tokenSymbol = cfg.symbol;

  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [assetType, setAssetType] = useState<SendAssetType>('usdt');
  const [feeTier, setFeeTier] = useState<FeeTier>(settings.defaultFeeTier);
  const [preview, setPreview] = useState<SendPreview | null>(null);
  const [step, setStep] = useState<'form' | 'confirm' | 'done'>('form');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<AddressBookEntry[]>([]);

  useEffect(() => {
    window.walletApi.getAddressBook().then((res) => {
      if (res.success && res.data) setContacts(res.data.filter((c) => c.network === activeNetwork));
    });
  }, [activeNetwork]);

  if (!activeAccount) return <LoadingSpinner />;

  const amountLabel =
    assetType === 'usdt' ? `${t.amount} (${tokenSymbol})` : `${t.amount} (${nativeSymbol})`;

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settings.offlineMode) {
      notify.warning(notify.t.toast.offlineBlocked);
      return;
    }
    setLoading(true);
    setError('');
    setWarning('');

    const res = await window.walletApi.sendPreview(
      activeAccount.id,
      activeNetwork,
      to,
      amount,
      feeTier,
      assetType
    );

    if (res.success && res.data) {
      setPreview(res.data);

      if (!res.data.hasEnoughAsset) {
        const msg = formatApiError(res.data.warning || 'INSUFFICIENT_ASSET', notify.t);
        setError(msg);
        notify.error(msg);
        setLoading(false);
        return;
      }

      if (res.data.assetType === 'usdt' && !res.data.hasEnoughNative) {
        const msg = formatApiError(
          `INSUFFICIENT_NATIVE:${res.data.feeSymbol}:${res.data.minNativeRequired}`,
          notify.t
        );
        setError(msg);
        notify.error(msg);
        setLoading(false);
        return;
      }

      if (res.data.warning?.startsWith('LOW_NATIVE_RESERVE')) {
        const msg = formatApiError(res.data.warning, notify.t);
        setWarning(msg);
        notify.warning(msg);
      }

      notify.info(notify.t.toast.sendPreviewReady);
      if (settings.confirmBeforeSend) setStep('confirm');
      else await handleSend(res.data);
    } else {
      const msg = notify.apiError(res.error);
      setError(msg);
    }
    setLoading(false);
  };

  const handleSend = async (previewData?: SendPreview) => {
    setLoading(true);
    setError('');
    const res = await window.walletApi.send({
      accountId: activeAccount.id,
      network: activeNetwork,
      to,
      amount,
      password,
      feeTier,
      assetType: previewData?.assetType || assetType,
    });
    if (res.success && res.data) {
      setTxHash(res.data.hash);
      setStep('done');
      notify.success(notify.t.toast.sendSuccess);
    } else {
      const msg = notify.apiError(res.error);
      setError(msg);
    }
    setLoading(false);
  };

  if (step === 'done') {
    return (
      <div className="p-8">
        <Card className="max-w-lg space-y-4">
          <SuccessAlert message={`${notify.t.toast.sendSuccess} TX: ${txHash.slice(0, 20)}...`} />
          <Button
            variant="secondary"
            onClick={() =>
              window.open(getExplorerTxUrl(activeNetwork, txHash, settings.testnetMode), '_blank')
            }
          >
            {t.viewExplorer}
          </Button>
          <Button
            onClick={() => {
              setStep('form');
              setTo('');
              setAmount('');
              setPassword('');
              setPreview(null);
              setWarning('');
            }}
          >
            {t.continue}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">{t.send}</h1>
      <Card className="max-w-lg space-y-6">
        <NetworkSelector value={activeNetwork} onChange={setActiveNetwork} testnet={settings.testnetMode} />

        {settings.offlineMode && <WarningAlert message={notify.t.toast.offlineBlocked} />}

        {step === 'confirm' && preview && (
          <div className="space-y-2 rounded-xl bg-surface-900 p-4 text-sm">
            <p>To: {preview.to}</p>
            <p>
              Amount: {preview.amount} {preview.assetSymbol}
            </p>
            <p>
              Fee: ~{preview.fee} {preview.feeSymbol}
            </p>
            {preview.assetType === 'native' && (
              <p className="text-gray-400">
                Total: ~{(parseFloat(preview.amount) + parseFloat(preview.fee)).toFixed(6)}{' '}
                {preview.assetSymbol}
              </p>
            )}
          </div>
        )}

        <form
          onSubmit={
            step === 'confirm'
              ? (e) => {
                  e.preventDefault();
                  handleSend(preview || undefined);
                }
              : handlePreview
          }
          className="space-y-4"
        >
          {step === 'form' && (
            <>
              <div className="space-y-2">
                <span className="text-sm text-gray-400">{t.sendAsset}</span>
                <SendAssetSelector
                  value={assetType}
                  onChange={setAssetType}
                  usdtLabel={tokenSymbol}
                  nativeLabel={nativeSymbol}
                />
                {assetType === 'native' && (
                  <p className="text-xs text-gray-500">{t.nativeSendNote}</p>
                )}
              </div>

              <Input label={t.recipient} value={to} onChange={(e) => setTo(e.target.value)} />

              {contacts.length > 0 && (
                <select
                  className="w-full rounded-xl border border-surface-600 bg-surface-800 px-4 py-2 text-sm"
                  onChange={(e) => setTo(e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>
                    {t.selectContact}
                  </option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.address}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}

              <Input label={amountLabel} value={amount} onChange={(e) => setAmount(e.target.value)} />

              {!isSolanaNetwork(activeNetwork) && (
                <div className="space-y-2">
                  <span className="text-sm text-gray-400">
                    {activeNetwork === 'tron' && assetType === 'usdt' ? 'Fee priority' : 'Gas speed'}
                  </span>
                  <FeeTierSelector value={feeTier} onChange={setFeeTier} />
                </div>
              )}
            </>
          )}

          <Input label={t.password} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {warning && <WarningAlert message={warning} />}
          {error && <ErrorAlert message={error} />}
          <Button type="submit" className="w-full" disabled={loading || settings.offlineMode}>
            {loading ? t.loading : step === 'confirm' ? t.confirmSend : t.preview}
          </Button>
        </form>
      </Card>
    </div>
  );
}
