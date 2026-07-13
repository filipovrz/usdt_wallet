import { derivePath } from 'ed25519-hd-key';
import * as bip39 from 'bip39';
import { keyPairFromSeed } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';

function tonPath(accountIndex: number): string {
  return `m/44'/607'/${accountIndex}'`;
}

function normalizeMnemonic(mnemonic: string): string {
  return mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface TonKeyMaterial {
  publicKey: Buffer;
  secretKey: Buffer;
  address: string;
}

/** BIP39 multichain derivation (Trust Wallet / SLIP-0044 coin type 607). */
export function deriveTonKeyMaterial(
  mnemonic: string,
  passphrase = '',
  accountIndex = 0,
  testnet = false
): TonKeyMaterial {
  const seed = bip39.mnemonicToSeedSync(normalizeMnemonic(mnemonic), passphrase);
  const derived = derivePath(tonPath(accountIndex), seed.toString('hex'));
  const keyPair = keyPairFromSeed(derived.key.slice(0, 32));
  seed.fill(0);

  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  const address = wallet.address.toString({ bounceable: false, testOnly: testnet });

  return {
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
    address,
  };
}

export function deriveTonAddress(
  mnemonic: string,
  passphrase = '',
  accountIndex = 0,
  testnet = false
): string {
  return deriveTonKeyMaterial(mnemonic, passphrase, accountIndex, testnet).address;
}
