# USDT Wallet — Checkpoint

**Версия:** 2.2.2 · **Дата:** 13.07.2026 · **Copyright:** © Evtinko Auctions  
**Repository:** https://github.com/filipovrz/usdt_wallet  
**Статус:** v2.2.2 — testnet тестване **пауза** (Sepolia faucet не дава ETH)

---

## Тестов прогрес (13.07.2026 — Filip)

| Стъпка | Резултат | Бележка |
|--------|----------|---------|
| 1 Отключване / Табло | ✅ Да | |
| 2 Смяна на мрежи + Refresh | ✅ Да | |
| 3 Получи / копиране адрес | ✅ Да | |
| 4 Заключи / отключи | ✅ Да | |
| 5 Testnet mode | ✅ Включен | Settings → Testnet mode |
| 6 TRON Shasta faucet | ✅ Да | **shasta.tronex.io** (~2000 TRX) |
| 7a TRX баланс | ✅ Да | |
| 7b TRON send | ✅ Да | 10 TRX → `TMnECT3Bqpimkg6vXHeWmw68MTQksHQrQy` |
| 7c TRON история | ✅ Да | Изходяща -10 TRX Shasta |
| 8a–8b Sepolia faucet | ❌ | Alchemy иска mainnet ETH · Chainlink — ETH не пристигна |
| 8c Sepolia send | ❌ | Недостатъчен native баланс (0 ETH) |
| 8d Sepolia история | ❌ | Няма tx (8c не мина) |
| 9 Solana Devnet | ⏸ | faucet.solana.com иска **GitHub login** |

---

## v2.2.2 — Hotfix (13.07.2026, нощ)

| Fix | Файл(ове) | Описание |
|-----|-----------|----------|
| **EVM address live** | `wallet-manager.ts` | Ethereum адрес **винаги от seed** при unlock (не stale vault) |
| **EVM backfill** | `wallet-manager.ts`, `keys.ts` | `ethAddress` backfill + EIP-55 `getAddress()` |
| **Receive UX** | `ReceivePage.tsx` | Показва **42/42 символа**, предупреждение при невалиден адрес |
| **TRON self-send** | `SendPage.tsx` | Блокира изпращане TRX към същия адрес |
| **Faucet help** | `help-content.ts` | Chainlink/Google Cloud (без mainnet ETH) |
| **Restart script** | `scripts/restart-wallet.ps1` | `powershell -File scripts/restart-wallet.ps1` |

---

## v2.2.1 — Hotfix (13.07.2026)

| Fix | Файл(ове) | Описание |
|-----|-----------|----------|
| **TRON address derivation** | `keys.ts` | Custom base58 → `TronWeb.address.fromPrivateKey()` — старите адреси бяха **невалидни** |
| **Vault backfill** | `wallet-manager.ts` | При unlock: коригира `tronAddress` + `solanaAddress` от seed |
| **Create wallet flow** | `wallet-manager.ts`, `SetupPages.tsx` | Vault се записва **след** seed backup (`finalizeWalletSetup`) |
| **Session IPC** | `ipc-handlers.ts` | `getSession` връща `{ success, data }` — UI вече се обновява |
| **Routing race** | `WalletContext.tsx`, `AuthPages.tsx` | `flushSync` + fix Unlock redirect loop |
| **Dashboard crash** | `DashboardPage.tsx` | Липсващ `t` в render |
| **Testnet EVM** | `networks.ts`, `blockchain.ts` | EIP-55 checksum, static RPC, resilient balance |
| **Preload bundle** | `scripts/bundle-preload.mjs` | `window.walletApi` работи в production |
| **electron-store cwd** | `wallet-manager.ts` | Vault/config в `%APPDATA%/usdt-wallet/` |
| **E2E create wallet** | `e2e/create-wallet.spec.ts` | Пълен flow: create → 24 думи → dashboard |

---

## v2.2.0 — Solana + HNT (12.07.2026)

| Категория | Детайли |
|-----------|---------|
| Solana | `@solana/web3.js`, SPL HNT, SOL native send |
| Keys | `solana-keys.ts`, `solanaAddress` от същия 24-word seed |
| Vault | v3 migration за `solanaAddress` |
| UI | Dashboard/Send/Receive/Help за Solana + HNT |
| Prices | CoinGecko SOL + HNT |

---

## v2.1.0 — завършено ✓

Hardware · Multisig deploy · electron-updater · Toast UX · Playwright E2E · © Evtinko Auctions

---

## Тестове (13.07.2026)

```
npm test        → 9/9 passed, 2 skipped ✓
npm run test:e2e → create-wallet.spec.ts 1/1 passed ✓
npm run build   → OK ✓
```

---

## Команди

```powershell
cd "D:\Filipov Ne Pipai\Pgojects\usdt_wallet"
npm install
npm run build
powershell -ExecutionPolicy Bypass -File scripts/restart-wallet.ps1
npm test
npm run test:e2e
npm run electron:dev
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'; npm run electron:build:win
```

---

## Testnet faucets (актуални URL)

| Мрежа | Faucet |
|-------|--------|
| TRON Shasta | https://shasta.tronex.io/join/getJoinPage |
| TRON Shasta (alt) | Telegram/Discord: `!shasta <T-адрес>` |
| Ethereum Sepolia | https://faucets.chain.link/sepolia (без mainnet ETH) |
| Ethereum Sepolia (alt) | https://cloud.google.com/application/web3/faucet/ethereum/sepolia |
| Solana Devnet | https://faucet.solana.com (изисква GitHub) |

⚠️ **Не ползвай** `shasta.tronscan.org/#/tools/faucet` — връща 404.

---

## User data (Windows)

```
%APPDATA%\usdt-wallet\
  vault.enc.json
  usdt-wallet-config.json
```

---

## Ключови файлове

| Файл | Роля |
|------|------|
| `src/main/crypto/keys.ts` | BIP39 → TRON/ETH/SOL derivation |
| `src/main/crypto/solana-keys.ts` | Solana ed25519 (tweetnacl) |
| `src/main/services/solana-service.ts` | SOL + HNT balance/send/history |
| `src/main/wallet-manager.ts` | Vault, session, finalizeWalletSetup |
| `scripts/bundle-preload.mjs` | esbuild preload bundle |
| `e2e/create-wallet.spec.ts` | E2E create → dashboard |
| `CHAT_SAVE.md` | Пълен сейф на AI разговорите |

---

## Следващи стъпки (след пауза)

1. Sepolia ETH — **https://faucets.chain.link/sepolia** или Google Cloud Web3 faucet
2. Табло → Sepolia → Refresh → **Изпрати 0.0005 ETH**
3. Solana Devnet (GitHub login) → test SOL
4. Build installer: `npm run electron:build:win`

---

*Checkpoint v2.2.2 — 13.07.2026 01:55*
