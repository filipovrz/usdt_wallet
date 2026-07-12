import * as bip39 from 'bip39';
import { HDKey } from '@scure/bip32';
import { bytesToHex } from '@noble/hashes/utils';
import { Wallet } from 'ethers';
import { TronWeb } from 'tronweb';

import { deriveSolanaAddress } from '../crypto/solana-keys';

const TRON_PATH = "m/44'/195'/0'/0/0";
const ETH_PATH = "m/44'/60'/0'/0/0";

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
  tronPrivateKey: string;
  ethPrivateKey: string;
}

export function deriveKeysFromMnemonic(mnemonic: string, passphrase = ''): DerivedKeys {
  const seed = bip39.mnemonicToSeedSync(normalizeMnemonic(mnemonic), passphrase);
  const master = HDKey.fromMasterSeed(seed);

  const tronNode = master.derive(TRON_PATH);
  const ethNode = master.derive(ETH_PATH);

  if (!tronNode.privateKey || !ethNode.privateKey) {
    seed.fill(0);
    throw new Error('KEY_DERIVATION_FAILED');
  }

  const tronPrivateKey = bytesToHex(tronNode.privateKey);
  const ethPrivateKey = bytesToHex(ethNode.privateKey);
  const tronAddress = privateKeyToTronAddress(tronPrivateKey);
  const ethWallet = new Wallet('0x' + ethPrivateKey);
  const solanaAddress = deriveSolanaAddress(mnemonic, passphrase);

  seed.fill(0);

  return {
    tronAddress,
    ethAddress: ethWallet.address,
    solanaAddress,
    tronPrivateKey,
    ethPrivateKey,
  };
}

export function getPrivateKeyForNetwork(
  mnemonic: string,
  network: 'tron' | 'ethereum' | 'bsc' | 'polygon',
  passphrase = ''
): string {
  const keys = deriveKeysFromMnemonic(mnemonic, passphrase);
  return network === 'tron' ? keys.tronPrivateKey : keys.ethPrivateKey;
}

export function createAccountFromMnemonic(name: string, mnemonic: string, passphrase = '') {
  const keys = deriveKeysFromMnemonic(mnemonic, passphrase);
  return {
    name,
    tronAddress: keys.tronAddress,
    ethAddress: keys.ethAddress,
    solanaAddress: keys.solanaAddress,
  };
}
