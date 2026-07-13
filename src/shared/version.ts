/** Синхронизирайте с package.json при всяка нова версия */
export const APP_VERSION = '2.5.0';

export const COPYRIGHT_HOLDER = 'Evtinko Auctions';
export const COPYRIGHT_TEXT = `© ${new Date().getFullYear()} ${COPYRIGHT_HOLDER}. All rights reserved.`;

/** Optional JSON manifest: { "version": "2.1.0", "notes": "..." } */
const ENV = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env;
export const UPDATE_MANIFEST_URL =
  ENV?.UPDATE_MANIFEST_URL ||
  'https://github.com/filipovrz/usdt_wallet/releases/latest/download/latest.json';

export const VERSION_HISTORY = [
  {
    version: '2.5.0',
    date: '2026-07-14',
    changes: [
      'Optimism + Avalanche C-Chain (USDT/USDC + native)',
      'API keys: Arbiscan, Basescan, Snowtrace (+ Optimism via Etherscan)',
      'Account rename/remove, service fee owner config',
    ],
  },
  {
    version: '2.4.0',
    date: '2026-07-14',
    changes: [
      'Service fee 0.25% (min $0.01, max $1) на mainnet send',
      'Owner wallet exempt; testnet без такса',
      'Preview + Help секция Service fee',
    ],
  },
  {
    version: '2.3.1',
    date: '2026-07-13',
    changes: [
      'Rebrand: USDT Wallet → EvtinkoWallet (UI, installer, Help)',
      'Production: CSP в release, dev-only diagnostics, NSIS installer',
      '7 мрежи: TRON, ETH, BSC, Polygon, Arbitrum, Base, Solana',
    ],
  },
  {
    version: '2.3.0',
    date: '2026-07-13',
    changes: [
      'USDC на Ethereum, BSC, Polygon и Solana',
      'Нови мрежи: Arbitrum One и Base (USDT + USDC + ETH)',
      'Dashboard и Send: USDC баланс и изпращане',
    ],
  },
  {
    version: '2.2.2',
    date: '2026-07-13',
    changes: [
      'Multi-account derivation — уникални TRON/ETH/SOL адреси (vault v4)',
      'Welcome: Отключи + Създай + Импортирай; ETH в описанието',
      'Send: toast по asset, account selector, self-send блок за всички мрежи',
      'Settings: TRON/ETH/SOL адреси; hint при празно име на акаунт',
      'EVM address live от seed, Receive 42/42, dev black-screen fix',
    ],
  },
  {
    version: '2.2.1',
    date: '2026-07-13',
    changes: [
      'TRON address derivation fix + vault backfill при unlock',
      'Create wallet: vault след seed backup (finalizeWalletSetup)',
      'Session IPC + UI routing fixes, testnet RPC/checksum',
      'Preload esbuild bundle, E2E create-wallet test',
    ],
  },
  {
    version: '2.2.0',
    date: '2026-07-12',
    changes: [
      'Solana mainnet — SOL + HNT (SPL) баланс, изпращане, история',
      'Native send — TRX, ETH, BNB, MATIC, SOL',
      'Автоматична Solana адреса при unlock (vault v3 migration)',
      'CoinGecko цени за SOL и HNT',
      'Solscan explorer линкове (вкл. devnet)',
    ],
  },
  {
    version: '2.1.0',
    date: '2026-06-13',
    changes: [
      'Ledger USB scan + address read (TRON/EVM)',
      'TRON on-chain multisig deploy (account permissions)',
      'electron-updater — check, download, install',
      'Playwright E2E smoke tests',
      'Help/docs sync за BSC, Polygon, hardware, multisig',
      'Copyright © Evtinko Auctions',
      'Toast notifications за всички user actions (BG/EN)',
    ],
  },
  {
    version: '2.0.0',
    date: '2026-06-13',
    changes: [
      'BSC + Polygon USDT, testnet режим, offline mode',
      'API keys в Settings, fallback RPC, low-balance warnings',
      'Multi-account, passphrase, change password, encrypted backup',
      'Fee tiers, TRON energy, USD prices, tx notes, theme toggle',
      'Multisig policies, hardware wallet page, auto-update check',
      'CI pipeline, разширени тестове',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-06-13',
    changes: ['Help меню', 'Автоматични тестове', 'CHANGELOG'],
  },
  {
    version: '1.0.0',
    date: '2026-06-13',
    changes: ['Първа версия — TRC-20 и ERC-20 USDT', 'NSIS инсталатор'],
  },
] as const;
