import * as bip39 from 'bip39';
import { HDKey } from '@scure/bip32';
import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex } from '@noble/hashes/utils';
import { Wallet, SigningKey, computeAddress } from 'ethers';

const TRON_PATH = "m/44'/195'/0'/0/0";
const ETH_PATH = "m/44'/60'/0'/0/0";

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(buffer: Buffer): string {
  let num = BigInt('0x' + buffer.toString('hex'));
  let encoded = '';
  while (num > 0n) {
    const remainder = Number(num % 58n);
    num = num / 58n;
    encoded = BASE58_ALPHABET[remainder] + encoded;
  }
  for (const byte of buffer) {
    if (byte === 0) encoded = '1' + encoded;
    else break;
  }
  return encoded;
}

function privateKeyToTronAddress(privateKeyHex: string): string {
  const signingKey = new SigningKey('0x' + privateKeyHex.replace(/^0x/, ''));
  const ethAddress = computeAddress(signingKey.publicKey);
  const addressBytes = Buffer.from(ethAddress.slice(2), 'hex');
  const hash = keccak_256(addressBytes);
  const addressBody = hash.slice(-20);
  const tronBytes = Buffer.concat([Buffer.from([0x41]), Buffer.from(addressBody)]);
  const hash1 = keccak_256(tronBytes);
  const hash2 = keccak_256(hash1);
  const checksum = hash2.slice(0, 4);
  const fullAddress = Buffer.concat([tronBytes, Buffer.from(checksum)]);
  return base58Encode(fullAddress);
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

  seed.fill(0);

  return {
    tronAddress,
    ethAddress: ethWallet.address,
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
  };
}
