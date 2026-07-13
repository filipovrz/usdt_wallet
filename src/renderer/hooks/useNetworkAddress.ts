import { useEffect, useState } from 'react';
import type { NetworkId } from '@shared/types';
import { getAccountAddress } from '@shared/types';
import type { WalletAccount } from '@shared/types';

/** Live network address from main process (derived from seed when unlocked). */
export function useNetworkAddress(
  account: WalletAccount | null,
  network: NetworkId,
  unlocked: boolean
): string {
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (!account || !unlocked) {
      setAddress('');
      return;
    }

    let cancelled = false;
    const fallback = getAccountAddress(account, network);

    void window.walletApi.getAccountNetworkAddress(account.id, network).then((res) => {
      if (cancelled) return;
      if (res.success && res.data?.address) {
        setAddress(res.data.address);
      } else {
        setAddress(fallback);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [account?.id, account?.tronAddress, account?.ethAddress, account?.solanaAddress, account?.tonAddress, account?.bitcoinAddress, network, unlocked]);

  return address;
}
