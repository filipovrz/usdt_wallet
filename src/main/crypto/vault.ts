import crypto from 'crypto';
import { VAULT_VERSION } from '../../shared/types';
import type { VaultMeta } from '../../shared/types';

const SCRYPT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

export interface EncryptedVault {
  version: number;
  salt: string;
  iv: string;
  authTag: string;
  ciphertext: string;
}

interface VaultPayload {
  meta: VaultMeta;
  mnemonic: string;
  passphrase?: string;
}

export function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.scryptSync(password, salt, 32, SCRYPT_OPTIONS);
}

async function encryptPayload(payload: VaultPayload, password: string): Promise<EncryptedVault> {
  const salt = crypto.randomBytes(32);
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  key.fill(0);
  return {
    version: VAULT_VERSION,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: encrypted.toString('base64'),
  };
}

async function decryptPayload(vault: EncryptedVault, password: string): Promise<VaultPayload> {
  const salt = Buffer.from(vault.salt, 'base64');
  const iv = Buffer.from(vault.iv, 'base64');
  const authTag = Buffer.from(vault.authTag, 'base64');
  const ciphertext = Buffer.from(vault.ciphertext, 'base64');
  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  try {
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    key.fill(0);
    const parsed = JSON.parse(decrypted);
    if (parsed.meta && parsed.mnemonic) return parsed as VaultPayload;
    return { meta: parsed.meta || parsed, mnemonic: parsed.mnemonic || '' };
  } catch {
    key.fill(0);
    throw new Error('INVALID_PASSWORD');
  }
}

export async function encryptVault(meta: VaultMeta, mnemonic: string, password: string): Promise<EncryptedVault> {
  return encryptPayload({ meta, mnemonic }, password);
}

export async function encryptVaultWithPassphrase(
  meta: VaultMeta,
  mnemonic: string,
  passphrase: string,
  password: string
): Promise<EncryptedVault> {
  return encryptPayload({ meta, mnemonic, passphrase: passphrase || undefined }, password);
}

export async function decryptVault(vault: EncryptedVault, password: string): Promise<{ meta: VaultMeta; mnemonic: string }> {
  const { meta, mnemonic } = await decryptPayload(vault, password);
  return { meta, mnemonic };
}

export async function decryptVaultFull(
  vault: EncryptedVault,
  password: string
): Promise<{ meta: VaultMeta; mnemonic: string; passphrase: string }> {
  const payload = await decryptPayload(vault, password);
  return { meta: payload.meta, mnemonic: payload.mnemonic, passphrase: payload.passphrase || '' };
}

export function secureZero(buffer: Buffer): void {
  buffer.fill(0);
}
