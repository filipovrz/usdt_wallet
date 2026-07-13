import { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import {
  Button,
  Card,
  Input,
  NetworkSelector,
  AccountSelector,
  ErrorAlert,
  SuccessAlert,
  LoadingSpinner,
  FeeTierSelector,
  WarningAlert,
  SendAssetSelector,
  getExplorerTxUrl,
  BtcLayerTabs,
} from '../components/ui';
import type { SendPreview, AddressBookEntry, FeeTier, SendAssetType, NetworkId } from '@shared/types';
import { getNetworkConfig, isSolanaNetwork, isBitcoinNetwork, networkHasUsdc, networkHasDai } from '@shared/networks';
import { isEvmNetwork } from '@shared/types';
import { useNetworkAddress } from '../hooks/useNetworkAddress';
import { useNotify } from '../hooks/useNotify';
import { formatApiError } from '../i18n/api-messages';

function isSameRecipient(ownAddress: string, to: string, network: NetworkId): boolean {
  const a = ownAddress.trim();
  const b = to.trim();
  if (isEvmNetwork(network)) {
    return a.toLowerCase() === b.toLowerCase();
  }
  return a === b;
}

export function SendPage() {
  const { activeAccount, activeNetwork, setActiveNetwork, settings, session, setActiveAccount, t, btcLayer, setBtcLayer } = useWallet();
  const notify = useNotify();
  const ownAddress = useNetworkAddress(activeAccount, activeNetwork, session.unlocked);
  const cfg = getNetworkConfig(activeNetwork, settings.testnetMode);
  const nativeSymbol = cfg.nativeSymbol;
  const tokenSymbol = cfg.symbol;
  const hasUsdc = networkHasUsdc(activeNetwork, settings.testnetMode);
  const hasDai = networkHasDai(activeNetwork, settings.testnetMode);

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
  const [sentSymbol, setSentSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<AddressBookEntry[]>([]);

  useEffect(() => {
    window.walletApi.getAddressBook().then((res) => {
      if (res.success && res.data) setContacts(res.data.filter((c) => c.network === activeNetwork));
    });
  }, [activeNetwork]);

  useEffect(() => {
    if (assetType === 'usdc' && !hasUsdc) setAssetType('usdt');
    if (assetType === 'dai' && !hasDai) setAssetType('usdt');
    if (isBitcoinNetwork(activeNetwork)) setAssetType('native');
  }, [activeNetwork, hasUsdc, hasDai, assetType]);

  if (!activeAccount) return <LoadingSpinner />;

  const isLn = isBitcoinNetwork(activeNetwork) && btcLayer === 'lightning';
  const lnConfigured = !!(settings.lndRestUrl.trim() && settings.lndMacaroon.trim());

  const amountLabel =
    assetType === 'native'
      ? `${t.amount} (${nativeSymbol})`
      : assetType === 'usdc'
        ? `${t.amount} (USDC)`
        : assetType === 'dai'
          ? `${t.amount} (DAI)`
          : `${t.amount} (${tokenSymbol})`;

  const resolveSentSymbol = (previewData?: SendPreview) =>
    previewData?.assetSymbol ||
    (assetType === 'native'
      ? nativeSymbol
      : assetType === 'usdc'
        ? 'USDC'
        : assetType === 'dai'
          ? 'DAI'
          : tokenSymbol);

  const formatSendSuccess = (symbol: string) =>
    notify.t.toast.sendSuccessAsset.replace('{symbol}', symbol);

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settings.offlineMode) {
      notify.warning(notify.t.toast.offlineBlocked);
      return;
    }
    setLoading(true);
    setError('');
    setWarning('');

    if (isLn) {
      const decoded = await window.walletApi.decodeLightningInvoice(to.trim());
      if (!decoded.success || !decoded.data) {
        const msg = notify.apiError(decoded.error);
        setError(msg);
        notify.error(msg);
        setLoading(false);
        return;
      }
      if (decoded.data.expired) {
        const msg = t.invoiceExpired;
        setError(msg);
        setLoading(false);
        return;
      }
      const lnPreview: SendPreview = {
        to: decoded.data.paymentRequest,
        amount: decoded.data.amount,
        fee: '0',
        feeSymbol: 'BTC',
        totalUsdt: decoded.data.amount,
        network: 'bitcoin',
        assetType: 'native',
        assetSymbol: 'BTC',
        assetBalance: '0',
        hasEnoughAsset: true,
        nativeBalance: '0',
        minNativeRequired: decoded.data.amount,
        hasEnoughNative: true,
      };
      setPreview(lnPreview);
      setAmount(decoded.data.amount);
      notify.info(notify.t.toast.sendPreviewReady);
      if (settings.confirmBeforeSend) setStep('confirm');
      else await handleSend(lnPreview);
      setLoading(false);
      return;
    }

    if (isSameRecipient(ownAddress, to, activeNetwork)) {
      const msg = notify.t.errors.SAME_ACCOUNT;
      setError(msg);
      notify.error(msg);
      setLoading(false);
      return;
    }

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

      if (res.data.assetType !== 'native' && !res.data.hasEnoughNative) {
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
    const symbol = resolveSentSymbol(previewData);

    if (isLn) {
      const res = await window.walletApi.payLightningInvoice(to.trim(), activeAccount.id);
      if (res.success && res.data) {
        setTxHash(res.data.hash);
        setSentSymbol('BTC');
        setStep('done');
        notify.success(formatSendSuccess('BTC'));
      } else {
        const msg = notify.apiError(res.error);
        setError(msg);
      }
      setLoading(false);
      return;
    }

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
      setSentSymbol(symbol);
      setStep('done');
      notify.success(formatSendSuccess(symbol));
    } else {
      const msg = notify.apiError(res.error);
      setError(msg);
    }
    setLoading(false);
  };

  if (step === 'done') {
    const successMsg = formatSendSuccess(sentSymbol || tokenSymbol);
    return (
      <div className="p-8">
        <Card className="max-w-lg space-y-4">
          <SuccessAlert message={`${successMsg} TX: ${txHash.slice(0, 20)}...`} />
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
              setSentSymbol('');
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
        <AccountSelector
          accounts={session.accounts}
          value={activeAccount.id}
          onChange={setActiveAccount}
        />
        <NetworkSelector value={activeNetwork} onChange={setActiveNetwork} testnet={settings.testnetMode} />
        {isBitcoinNetwork(activeNetwork) && (
          <BtcLayerTabs
            value={btcLayer}
            onChange={setBtcLayer}
            onchainLabel={t.btcOnchain}
            lightningLabel={t.btcLightning}
          />
        )}
        {isLn && !lnConfigured && <WarningAlert message={t.lightningNotConfiguredSend} />}

        {settings.offlineMode && <WarningAlert message={notify.t.toast.offlineBlocked} />}

        {step === 'confirm' && preview && (
          <div className="space-y-2 rounded-xl bg-surface-900 p-4 text-sm">
            <p>To: {preview.to}</p>
            <p>
              Amount: {preview.amount} {preview.assetSymbol}
            </p>
            {preview.serviceFeeExempt ? (
              <p className="text-brand-300">{t.serviceFeeExempt}</p>
            ) : preview.serviceFee && parseFloat(preview.serviceFee) > 0 ? (
              <p>
                {t.serviceFee}: {preview.serviceFee} {preview.serviceFeeSymbol}
                {preview.serviceFeeUsd != null && (
                  <span className="text-gray-500"> (~${preview.serviceFeeUsd.toFixed(2)})</span>
                )}
              </p>
            ) : null}
            <p>
              Network fee:{' '}
              {isLn && step === 'confirm'
                ? t.lightningRoutingFee
                : `~${preview.fee} ${preview.feeSymbol}`}
            </p>
            {preview.assetType === 'native' && (
              <p className="text-gray-400">
                Total: ~
                {(
                  parseFloat(preview.amount) +
                  parseFloat(preview.fee) +
                  parseFloat(preview.serviceFee || '0')
                ).toFixed(6)}{' '}
                {preview.assetSymbol}
              </p>
            )}
            {preview.assetType !== 'native' &&
              preview.serviceFee &&
              parseFloat(preview.serviceFee) > 0 && (
                <p className="text-gray-400">
                  Total debit: {preview.totalAssetDebit || preview.amount} {preview.assetSymbol}
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
              {!isBitcoinNetwork(activeNetwork) && (
                <div className="space-y-2">
                  <span className="text-sm text-gray-400">{t.sendAsset}</span>
                  <SendAssetSelector
                    value={assetType}
                    onChange={setAssetType}
                    usdtLabel={tokenSymbol}
                    usdcLabel={hasUsdc ? 'USDC' : undefined}
                    daiLabel={hasDai ? 'DAI' : undefined}
                    nativeLabel={nativeSymbol}
                  />
                  {assetType === 'native' && (
                    <p className="text-xs text-gray-500">{t.nativeSendNote}</p>
                  )}
                </div>
              )}

              <Input
                label={isLn ? t.lightningBolt11Label : t.recipient}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />

              {!isLn && (
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

              {!isLn && (
                <Input label={amountLabel} value={amount} onChange={(e) => setAmount(e.target.value)} />
              )}

              {!isSolanaNetwork(activeNetwork) && !isLn && (
                <div className="space-y-2">
                  <span className="text-sm text-gray-400">
                    {activeNetwork === 'tron' && assetType !== 'native'
                      ? 'Fee priority'
                      : isBitcoinNetwork(activeNetwork)
                        ? 'Fee rate (sat/vB)'
                        : 'Gas speed'}
                  </span>
                  <FeeTierSelector value={feeTier} onChange={setFeeTier} />
                </div>
              )}
            </>
          )}

          {!isLn && (
            <Input label={t.password} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
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
