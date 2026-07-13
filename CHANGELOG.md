# Changelog

## [2.5.0] — 2026-07-14

### Добавено
- **Optimism** и **Avalanche C-Chain** — USDT, USDC, native (ETH / AVAX)
- **API keys:** Arbiscan, Basescan, Snowtrace (Optimism ползва Etherscan key)
- **Account management:** преименуване и премахване на акаунти (Settings → Accounts)
- **AVAX** цена от CoinGecko за service fee

### Поддържани мрежи (9)
TRON · Ethereum · BSC · Polygon · Arbitrum · Base · Optimism · Avalanche · Solana

## [2.4.0] — 2026-07-14

### Добавено
- **Service fee** — 0.25% при mainnet send (USDT/USDC/native), min $0.01, max $1
- Owner wallet exempt; testnet без такса
- Прозрачен preview + Help §15 Service fee

## [2.3.1] — 2026-07-13 — Production release

### Променено
- **Rebrand** — USDT Wallet → **EvtinkoWallet** (UI, прозорец, Help, NSIS installer)
- **Production** — Content-Security-Policy в release build; dev diagnostics само в dev mode

### Поддържани мрежи (7)
TRON · Ethereum · BSC · Polygon · Arbitrum · Base · Solana

## [2.3.0] — 2026-07-13

### Добавено
- **USDC** — Ethereum, BSC, Polygon, Solana (mainnet + testnet)
- **Arbitrum One** и **Base** — USDT, USDC, native ETH
- Dashboard показва USDC баланс; Send с 3 asset опции (token / USDC / native)

## [2.2.2] — 2026-07-13

### Поправено
- **Multi-account derivation** — уникални TRON/ETH/SOL адреси чрез `derivationIndex` (vault v4)
- **Welcome page** — Отключи + Създай + Импортирай на един екран; ETH в описанието
- **Send UX** — toast по asset (ETH/SOL/USDT), account selector, self-send блок за всички мрежи
- **Settings → Accounts** — TRON + ETH + SOL адреси; предупреждение при празно име
- **EVM address** — адресът се взима live от seed при unlock; backfill за `ethAddress`
- **Receive** — показва 42/42 символа; предупреждение при невалиден Ethereum адрес
- **Dev stability** — black screen fix (`process is not defined`), sandbox/GPU, real vault in dev

### Добавено
- Unit test: multi-account derivation (различни адреси за index 0 vs 1)
- `scripts/restart-wallet.ps1` — рестарт на приложението с една команда
- Help/README: Sepolia faucets без mainnet ETH (Chainlink, Google Cloud)

## [2.2.1] — 2026-07-13

### Поправено
- **TRON address derivation** — валидни адреси чрез `TronWeb.address.fromPrivateKey`; backfill при unlock
- **Create wallet** — vault се записва след seed backup (`finalizeWalletSetup`)
- **Session UI** — `getSession` ApiResponse; routing race; Dashboard crash (`t` undefined)
- **Testnet EVM** — EIP-55 checksum, Sepolia RPC fallback, resilient balance fetch
- **electron-store** — config в `%APPDATA%/usdt-wallet/`
- **Preload** — esbuild bundle за production (`window.walletApi`)

### Добавено
- E2E test: пълен create wallet flow (`e2e/create-wallet.spec.ts`)
- `scripts/bundle-preload.mjs`, `scripts/patch-rpc-websockets-uuid.mjs`

## [2.2.0] — 2026-07-12

### Добавено
- **Solana (HNT SPL)** — баланс, изпращане, история на mainnet
- **Native SOL send** — изпращане на SOL (fee в SOL)
- **Vault v3** — автоматично добавяне на `solanaAddress` при unlock на стари портфейли
- **Цени** — SOL и HNT от CoinGecko
- **Explorer** — Solscan линкове (devnet cluster при testnet)

### Подобрено
- Dashboard и Send показват правилния token символ (USDT / HNT) по мрежа
- Native send за TRX, ETH, BNB, MATIC (от v2.1.x)

## [2.1.0] — 2026-06-13

### Добавено
- **Ledger USB** — scan устройства + read address (TRON/EVM)
- **Trezor detection** — USB откриване (signing via Trezor Suite)
- **TRON on-chain multisig deploy** — account permissions от Multi-Sig страница
- **electron-updater** — check, download, install updates
- **Playwright E2E** smoke test (`npm run test:e2e`)
- Разширени unit тестове (BSC/Polygon validation, multisig schema, semver)
- Help обновен за BSC, Polygon, hardware, multisig, updates
- **Copyright © Evtinko Auctions** (package.json, UI footer, Help)
- **Toast notifications** — success/error/info/warning за всички user actions
- `ToastContext`, `useNotify`, `formatApiError()` BG/EN

### Бележки
- Code signing certificate — optional (env `CSC_LINK` / `CSC_KEY_PASSWORD`)
- EVM on-chain multisig — използвайте Gnosis Safe; локални политики се пазят в vault

## [2.0.0] — 2026-06-13
