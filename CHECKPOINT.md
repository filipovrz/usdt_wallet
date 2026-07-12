# USDT Wallet — Checkpoint

**Версия:** 2.2.1 · **Дата:** 13.07.2026 · **Copyright:** © Evtinko Auctions  
**Repository:** https://github.com/filipovrz/usdt_wallet  
**Статус:** v2.2.1 — Solana/HNT + критични hotfix-и · **Ръчно testnet тестване в процес**

---

## Тестов прогрес (13.07.2026 — Filip)

| Стъпка | Резултат | Бележка |
|--------|----------|---------|
| 1 Отключване / Табло | ✅ Да | |
| 2 Смяна на мрежи + Refresh | ✅ Да | След TRON address fix + v2.2.1 |
| 3 Получи / копиране адрес | ✅ Да | |
| 4 Заключи / отключи | ✅ Да | |
| 5 Testnet mode | ✅ Включен | Settings → Testnet mode |
| 6 TRON Shasta faucet | ⏸ | `shasta.tronscan.org/#/tools/faucet` → **404** · използвай **https://shasta.tronex.io/join/getJoinPage** |
| 7 TRON test send | ❌ | Преди fix: грешен TRON адрес · след fix: нужен faucet |
| 8 Sepolia ETH | ❌ | RPC/checksum fix в v2.2.1 · нужен faucet |
| 9 Solana Devnet | ❌ | faucet.solana.com иска **GitHub login** |

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
$env:NODE_ENV='production'; npx electron .
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
| Ethereum Sepolia | https://sepoliafaucet.com |
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

## Следващи стъпки

1. Faucet TRX от **shasta.tronex.io** → нов TRON адрес от **Получи**
2. Test send 10 TRX (Native) на себе си
3. Sepolia ETH faucet → test send
4. Solana Devnet (GitHub login) → test SOL
5. Build installer: `npm run electron:build:win`

---

*Checkpoint v2.2.1 — 13.07.2026 00:59*
