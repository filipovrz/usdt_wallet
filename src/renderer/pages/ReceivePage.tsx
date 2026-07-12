import { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { Card, NetworkSelector, CopyButton, LoadingSpinner } from '../components/ui';
import { getAccountAddress } from '@shared/types';
import { useNotify } from '../hooks/useNotify';

export function ReceivePage() {
  const { activeAccount, activeNetwork, setActiveNetwork, settings, t } = useWallet();
  const notify = useNotify();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const address = activeAccount ? getAccountAddress(activeAccount, activeNetwork) : '';

  useEffect(() => {
    if (!address) return;
    window.walletApi.generateQR(address).then((res) => {
      if (res.success && res.data) {
        setQrDataUrl(res.data.dataUrl);
      } else if (res.error) {
        notify.apiError(res.error);
      }
    });
  }, [address]);

  if (!activeAccount) return <LoadingSpinner />;

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">{t.receive}</h1>
      <Card className="max-w-md space-y-6 text-center">
        <NetworkSelector value={activeNetwork} onChange={setActiveNetwork} testnet={settings.testnetMode} />
        {qrDataUrl && (
          <div className="mx-auto w-fit rounded-2xl bg-white p-4">
            <img src={qrDataUrl} alt="QR" className="h-[280px] w-[280px]" />
          </div>
        )}
        <p className="break-all font-mono text-xs text-brand-300">{address}</p>
        <CopyButton
          text={address}
          label={t.copy}
          copiedLabel={t.copied}
          onCopied={() => notify.success(notify.t.toast.copied)}
        />
      </Card>
    </div>
  );
}
