import { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import {
  Card,
  NetworkSelector,
  AccountSelector,
  CopyButton,
  LoadingSpinner,
  ErrorAlert,
  BtcLayerTabs,
  Button,
  Input,
  WarningAlert,
} from '../components/ui';
import { isEvmNetwork, isValidEvmAddress, isBitcoinNetwork } from '@shared/types';
import { useNotify } from '../hooks/useNotify';
import { useNetworkAddress } from '../hooks/useNetworkAddress';

export function ReceivePage() {
  const {
    activeAccount,
    activeNetwork,
    setActiveNetwork,
    settings,
    session,
    setActiveAccount,
    t,
    btcLayer,
    setBtcLayer,
  } = useWallet();
  const notify = useNotify();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [lnAmount, setLnAmount] = useState('');
  const [lnInvoice, setLnInvoice] = useState('');
  const [lnLoading, setLnLoading] = useState(false);
  const address = useNetworkAddress(activeAccount, activeNetwork, session.unlocked);

  const isBtc = isBitcoinNetwork(activeNetwork);
  const isLn = isBtc && btcLayer === 'lightning';
  const lnConfigured = !!(settings.lndRestUrl.trim() && settings.lndMacaroon.trim());
  const displayText = isLn ? lnInvoice : address;

  useEffect(() => {
    if (!displayText) {
      setQrDataUrl('');
      return;
    }
    window.walletApi.generateQR(displayText).then((res) => {
      if (res.success && res.data) {
        setQrDataUrl(res.data.dataUrl);
      } else if (res.error) {
        notify.apiError(res.error);
      }
    });
  }, [displayText]);

  const handleCreateInvoice = async () => {
    if (!lnAmount.trim()) return;
    setLnLoading(true);
    const res = await window.walletApi.createLightningInvoice(lnAmount.trim());
    setLnLoading(false);
    if (res.success && res.data) {
      setLnInvoice(res.data.paymentRequest);
      notify.success(t.lightningInvoiceCreated);
    } else {
      notify.apiError(res.error);
    }
  };

  if (!activeAccount) return <LoadingSpinner />;

  const evmInvalid = isEvmNetwork(activeNetwork) && address.length > 0 && !isValidEvmAddress(address);

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">{t.receive}</h1>
      <Card className="max-w-md space-y-6 text-center">
        <AccountSelector
          accounts={session.accounts}
          value={activeAccount.id}
          onChange={setActiveAccount}
        />
        <NetworkSelector value={activeNetwork} onChange={setActiveNetwork} testnet={settings.testnetMode} />
        {isBtc && (
          <BtcLayerTabs
            value={btcLayer}
            onChange={setBtcLayer}
            onchainLabel={t.btcOnchain}
            lightningLabel={t.btcLightning}
          />
        )}

        {isLn ? (
          <>
            {!lnConfigured && <WarningAlert message={t.lightningNotConfigured} />}
            <Input
              label={t.lightningAmountBtc}
              value={lnAmount}
              onChange={(e) => setLnAmount(e.target.value)}
              placeholder="0.00001"
            />
            <Button onClick={handleCreateInvoice} disabled={lnLoading || !lnConfigured}>
              {lnLoading ? t.loading : t.lightningCreateInvoice}
            </Button>
          </>
        ) : (
          evmInvalid && (
            <ErrorAlert message="Невалиден Ethereum адрес — заключете и отключете портфейла отново." />
          )
        )}

        {qrDataUrl && !evmInvalid && displayText && (
          <div className="mx-auto w-fit rounded-2xl bg-white p-4">
            <img src={qrDataUrl} alt="QR" className="h-[280px] w-[280px]" />
          </div>
        )}
        {displayText && (
          <p className="select-all break-all font-mono text-sm text-brand-300">{displayText}</p>
        )}
        {isEvmNetwork(activeNetwork) && address && (
          <p className="text-xs text-gray-500">{address.length} / 42 символа</p>
        )}
        {displayText && (
          <CopyButton
            text={displayText}
            label={t.copy}
            copiedLabel={t.copied}
            onCopied={() => notify.success(notify.t.toast.copied)}
          />
        )}
      </Card>
    </div>
  );
}
