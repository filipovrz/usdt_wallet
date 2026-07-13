import { HDKey } from '@scure/bip32';
import * as bip39 from 'bip39';
import { p2wpkh, NETWORK, TEST_NETWORK } from '@scure/btc-signer';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

function bitcoinPath(accountIndex: number, testnet: boolean): string {
  const coinType = testnet ? 1 : 0;
  return `m/84'/${coinType}'/0'/0/${accountIndex}`;
}

function normalizeMnemonic(mnemonic: string): string {
  return mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface BitcoinKeyMaterial {
  privateKey: Uint8Array;
  privateKeyHex: string;
  publicKey: Uint8Array;
  address: string;
}

/** BIP84 native segwit P2WPKH (bc1… / tb1…). */
export function deriveBitcoinKeyMaterial(
  mnemonic: string,
  passphrase = '',
  accountIndex = 0,
  testnet = false
): BitcoinKeyMaterial {
  const seed = bip39.mnemonicToSeedSync(normalizeMnemonic(mnemonic), passphrase);
  const node = HDKey.fromMasterSeed(seed).derive(bitcoinPath(accountIndex, testnet));
  if (!node.privateKey || !node.publicKey) {
    seed.fill(0);
    throw new Error('BTC_KEY_DERIVATION_FAILED');
  }
  const net = testnet ? TEST_NETWORK : NETWORK;
  const payment = p2wpkh(node.publicKey, net);
  if (!payment.address) {
    seed.fill(0);
    throw new Error('BTC_ADDRESS_DERIVATION_FAILED');
  }
  seed.fill(0);
  return {
    privateKey: node.privateKey,
    privateKeyHex: bytesToHex(node.privateKey),
    publicKey: node.publicKey,
    address: payment.address,
  };
}

export function deriveBitcoinAddress(
  mnemonic: string,
  passphrase = '',
  accountIndex = 0,
  testnet = false
): string {
  return deriveBitcoinKeyMaterial(mnemonic, passphrase, accountIndex, testnet).address;
}

export function bitcoinPaymentScript(publicKey: Uint8Array, testnet: boolean): Uint8Array {
  const net = testnet ? TEST_NETWORK : NETWORK;
  return p2wpkh(publicKey, net).script;
}

export { hexToBytes };
