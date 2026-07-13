import * as bip39 from 'bip39';
import { HDKey } from '@scure/bip32';
import { bytesToHex } from '@noble/hashes/utils';
import { Wallet, getAddress } from 'ethers';
import { TronWeb } from 'tronweb';

import { deriveSolanaAddress } from '../crypto/solana-keys';
import { deriveTonAddress } from '../crypto/ton-keys';

function tronPath(accountIndex: number): string {
  return `m/44'/195'/0'/0/${accountIndex}`;
}

function ethPath(accountIndex: number): string {
  return `m/44'/60'/0'/0/${accountIndex}`;
}

function privateKeyToTronAddress(privateKeyHex: string): string {
  const address = TronWeb.address.fromPrivateKey(privateKeyHex.replace(/^0x/, ''));
  if (!address) throw new Error('TRON_ADDRESS_DERIVATION_FAILED');
  return address;
}

export function generateMnemonic(): string {
  return bip39.generateMnemonic(256);
}

export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic.trim().toLowerCase());
}

export function normalizeMnemonic(mnemonic: string): string {
  return mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getPasswordStrength(password: string): {
  score: number;
  label: 'weak' | 'fair' | 'good' | 'strong';
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels: Array<'weak' | 'fair' | 'good' | 'strong'> = ['weak', 'fair', 'good', 'strong', 'strong'];
  return { score: Math.min(score, 4), label: labels[score] };
}

export interface DerivedKeys {
  tronAddress: string;
  ethAddress: string;
  solanaAddress: string;
  tonAddress: string;
  tronPrivateKey: string;
  ethPrivateKey: string;
}

export function deriveKeysFromMnemonic(
  mnemonic: string,
  passphrase = '',
  accountIndex = 0,
  testnet = false
): DerivedKeys {
  const seed = bip39.mnemonicToSeedSync(normalizeMnemonic(mnemonic), passphrase);
  const master = HDKey.fromMasterSeed(seed);

  const tronNode = master.derive(tronPath(accountIndex));
  const ethNode = master.derive(ethPath(accountIndex));

  if (!tronNode.privateKey || !ethNode.privateKey) {
    seed.fill(0);
    throw new Error('KEY_DERIVATION_FAILED');
  }

  const tronPrivateKey = bytesToHex(tronNode.privateKey);
  const ethPrivateKey = bytesToHex(ethNode.privateKey);
  const tronAddress = privateKeyToTronAddress(tronPrivateKey);
  const ethWallet = new Wallet('0x' + ethPrivateKey);
  const solanaAddress = deriveSolanaAddress(mnemonic, passphrase, accountIndex);
  const tonAddress = deriveTonAddress(mnemonic, passphrase, accountIndex, testnet);

  seed.fill(0);

  return {
    tronAddress,
    ethAddress: getAddress(ethWallet.address),
    solanaAddress,
    tonAddress,
    tronPrivateKey,
    ethPrivateKey,
  };
}

export function getPrivateKeyForNetwork(
  mnemonic: string,
  network: 'tron' | 'ethereum' | 'bsc' | 'polygon',
  passphrase = '',
  accountIndex = 0
): string {
  const keys = deriveKeysFromMnemonic(mnemonic, passphrase, accountIndex);
  return network === 'tron' ? keys.tronPrivateKey : keys.ethPrivateKey;
}

export function createAccountFromMnemonic(
  name: string,
  mnemonic: string,
  passphrase = '',
  accountIndex = 0
) {
  const keys = deriveKeysFromMnemonic(mnemonic, passphrase, accountIndex);
  return {
    name,
    derivationIndex: accountIndex,
    tronAddress: keys.tronAddress,
    ethAddress: keys.ethAddress,
    solanaAddress: keys.solanaAddress,
    tonAddress: keys.tonAddress,
  };
}
