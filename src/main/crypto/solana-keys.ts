import { derivePath } from 'ed25519-hd-key';
import * as bip39 from 'bip39';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

function solanaPath(accountIndex: number): string {
  return `m/44'/501'/${accountIndex}'/0'`;
}

function normalizeMnemonic(mnemonic: string): string {
  return mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** 32-byte Ed25519 seed from BIP39 mnemonic (Solana standard path). */
export function deriveSolanaSeed(mnemonic: string, passphrase = '', accountIndex = 0): Uint8Array {
  const seed = bip39.mnemonicToSeedSync(normalizeMnemonic(mnemonic), passphrase);
  const derived = derivePath(solanaPath(accountIndex), seed.toString('hex'));
  seed.fill(0);
  return derived.key.slice(0, 32);
}

/** Base58 Solana address — CommonJS-safe (no ESM-only deps). */
export function deriveSolanaAddress(mnemonic: string, passphrase = '', accountIndex = 0): string {
  const secret = deriveSolanaSeed(mnemonic, passphrase, accountIndex);
  const keyPair = nacl.sign.keyPair.fromSeed(secret);
  return bs58.encode(keyPair.publicKey);
}
