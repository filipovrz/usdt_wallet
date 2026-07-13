/**
 * Service fee — configure BEFORE production release.
 *
 * OWNER addresses:
 * - Receive service fees from other users
 * - Exempt from paying service fee when sending (your wallet)
 *
 * EVM address is used for Ethereum, BSC, Polygon, Arbitrum, Base.
 */
export const OWNER_WALLET = {
  tron: 'TK1qyEhwZYMSUbLb6biXCtRM2weDcGJ6Gu',
  evm: '0x7180Bee8058655522C0D8227686e9B719CC16F82',
  solana: 'sTJp9XHNh47UHLPvcaPyZ2KhTFyhUGAb9veKdqtJot1',
};

/** 0.25% with min $0.01 and max $1.00 (USD equivalent) */
export const SERVICE_FEE_PERCENT = 0.0025;
export const SERVICE_FEE_MIN_USD = 0.01;
export const SERVICE_FEE_MAX_USD = 1.0;

/** Service fee applies on mainnet only (not testnet). */
export const SERVICE_FEE_TESTNET_DISABLED = true;
