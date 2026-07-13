import { z } from 'zod';
import { ALL_NETWORK_IDS } from './networks';
import type { NetworkId } from './types';

export const networkIdSchema = z.enum([
  'tron',
  'ethereum',
  'bsc',
  'polygon',
  'arbitrum',
  'base',
  'optimism',
  'avalanche',
  'zksync',
  'linea',
  'scroll',
  'solana',
]);

export const createWalletSchema = z.object({
  name: z.string().min(1).max(64),
  password: z.string().min(8).max(128),
  passphrase: z.string().max(128).optional(),
});

export const importWalletSchema = z.object({
  name: z.string().min(1).max(64),
  mnemonic: z.string().min(1),
  password: z.string().min(8).max(128),
  passphrase: z.string().max(128).optional(),
});

export const unlockSchema = z.object({
  password: z.string().min(1).max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const sendAssetTypeSchema = z.enum(['usdt', 'usdc', 'dai', 'native']);

export const sendSchema = z.object({
  accountId: z.string().uuid(),
  network: networkIdSchema,
  to: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  password: z.string().min(1),
  feeTier: z.enum(['slow', 'normal', 'fast']).optional(),
  assetType: sendAssetTypeSchema.optional(),
});

export const addressBookSchema = z.object({
  name: z.string().min(1).max(64),
  address: z.string().min(1),
  network: networkIdSchema,
  note: z.string().max(256).optional(),
});

export const settingsSchema = z.object({
  language: z.enum(['bg', 'en']),
  defaultNetwork: networkIdSchema,
  autoLockMinutes: z.number().min(1).max(120),
  currency: z.enum(['USD', 'EUR', 'BGN']),
  hideBalances: z.boolean(),
  confirmBeforeSend: z.boolean(),
  testnetMode: z.boolean(),
  offlineMode: z.boolean(),
  theme: z.enum(['dark', 'light']),
  trongridApiKey: z.string().max(256),
  etherscanApiKey: z.string().max(256),
  bscscanApiKey: z.string().max(256),
  polygonscanApiKey: z.string().max(256),
  arbiscanApiKey: z.string().max(256),
  basescanApiKey: z.string().max(256),
  snowtraceApiKey: z.string().max(256),
  lineascanApiKey: z.string().max(256),
  scrollscanApiKey: z.string().max(256),
  defaultFeeTier: z.enum(['slow', 'normal', 'fast']),
  checkUpdatesOnStart: z.boolean(),
});

export const multisigSchema = z.object({
  name: z.string().min(1).max(64),
  threshold: z.number().min(1).max(10),
  totalSigners: z.number().min(1).max(10),
  signers: z.array(z.string()).min(1),
  network: networkIdSchema,
});

export function validateNetwork(id: string): id is NetworkId {
  return (ALL_NETWORK_IDS as string[]).includes(id);
}
