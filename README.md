# EvtinkoWallet

**Repository:** [github.com/filipovrz/usdt_wallet](https://github.com/filipovrz/usdt_wallet)

Професионален **некастодиален** desktop портфейл — **USDT**, **USDC**, **native coins**, **Bitcoin** (on-chain + Lightning), **TON** и **Solana (HNT/SPL)**.

**Текуща версия: 3.2.4** · Production-ready

Вашите private keys и seed фраза **никога не напускат компютъра**. Нулева телеметрия.

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![Version](https://img.shields.io/badge/version-3.2.4-green)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Функции

| Функция | Описание |
|---------|----------|
| **14 мрежи** | TRON · 10× EVM · Solana · TON · **Bitcoin** |
| **Stablecoins** | USDT + USDC + **DAI** (EVM mainnet) + TRC-20 USDC на TRON + TON USDT jetton |
| **Native send** | TRX, ETH, BNB, MATIC, AVAX, SOL, TON, **BTC** (on-chain) |
| **Lightning** | LND REST: invoice create/pay, history sync, test connection |
| **Service fee** | 0.25% mainnet send (min $0.01, max $1); изключен на testnet и Lightning |
| **Solana** | HNT (SPL) + USDC + SOL |
| **Multi-account** | Уникални адреси per account (vault v6 за BTC) |
| **Testnet mode** | Shasta, Sepolia, BSC/Polygon/Arbitrum/Base/Optimism/Avalanche testnet, Solana Devnet, BTC testnet |
| **Security** | scrypt + AES-256-GCM vault, auto-lock, IPC isolation, CSP (production) |
| **Hardware** | Ledger USB (TRON/EVM) |
| **Updates** | electron-updater |
| **Installer** | NSIS Windows — `EvtinkoWallet Setup X.X.X.exe` |
| **Copyright** | © Evtinko Auctions |

---

## Bitcoin & Lightning

- **On-chain:** native BTC send/receive, fee tiers (sat/vB), mempool.space API
- **Lightning:** receive (create BOLT11 invoice) + send (pay invoice) via **your own LND node**
- **Settings → Lightning (LND):** REST URL + admin macaroon (hex)
- Няма вграден Lightning node — виж **Help §18** в приложението

---

## Сигурност

- **Vault:** `%APPDATA%/usdt-wallet/vault.enc.json` (Windows) — пътят не се променя след rebrand
- **KDF:** scrypt (N=16384) + AES-256-GCM
- **Auto-lock:** 5 мин (default) · **Lockout:** 5 грешни пароли → 15 мин
- **Production:** Content-Security-Policy, no dev diagnostics

---

## Изисквания

- Node.js 20+
- npm 9+
- Windows 10/11 (за NSIS installer)
- Lightning (по избор): LND с REST API на localhost

---

## Development

```powershell
cd "D:\Filipov Ne Pipai\Pgojects\usdt_wallet"
npm install
node scripts/patch-rpc-websockets-uuid.mjs
npm run electron:dev
```

---

## Production build (Windows)

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
npm run electron:build:win
```

→ `release/EvtinkoWallet Setup 3.2.4.exe`  
→ **Архив (всички версии):** `installers/`

- Desktop + Start Menu shortcut **EvtinkoWallet**
- Деинсталация от Control Panel

### macOS / Linux

```bash
npm run electron:build:mac    # macOS (.dmg)
npm run electron:build:linux  # Linux (AppImage/deb)
```

---

## Testnet тест

1. **Settings** → **Testnet mode** ON → Save
2. **Receive** → копирай адрес
3. Faucets:

| Мрежа | Faucet |
|-------|--------|
| TRON Shasta | https://shasta.tronex.io/join/getJoinPage |
| Ethereum Sepolia | https://cloud.google.com/application/web3/faucet/ethereum/sepolia |
| Solana Devnet (SOL) | https://faucet.solana.com |
| Solana Devnet (USDC) | https://faucet.circle.com |
| Arbitrum/Base/Optimism Sepolia | bridge / official faucets |
| Avalanche Fuji | https://faucet.avax.network |
| Bitcoin testnet | https://mempool.space/testnet/faucet |

4. **Dashboard** → Refresh → **Send** (native / USDC / USDT)

⚠️ Solana Devnet: HNT mint е mainnet-only — тествай **SOL** и **USDC**.  
⚠️ Lightning: работи само с mainnet LND (не testnet mode).

---

## Тестване

```powershell
npm test              # build + 11 unit tests
npm run test:e2e      # Playwright smoke
npm run test:live     # + live RPC
```

---

## Версии

| Версия | Промени |
|--------|---------|
| **3.2.1** | Lightning history, USD balance, LND test, i18n, Help update |
| **3.2.0** | Bitcoin Lightning (LND REST), On-chain \| Lightning tabs |
| **3.1.0** | Bitcoin on-chain (BIP84 bc1), vault v6, BTC service fee |
| **3.0.2** | TON address live fix, session sync |
| **3.0.0** | TON + USDT jetton, vault v5 |
| **2.6.0** | TRC-USDC, zkSync/Linea/Scroll, DAI |
| **2.5.0** | Optimism, Avalanche, explorer API keys |
| **2.4.0** | Service fee (mainnet), owner wallet exempt |
| **2.3.1** | EvtinkoWallet rebrand, production hardening, NSIS |
| **2.3.0** | USDC, Arbitrum, Base |
| **2.2.2** | Multi-account, Send/Welcome UX, dev stability |
| **2.2.0** | Solana HNT + SOL |

→ [CHANGELOG.md](./CHANGELOG.md) · [CHECKPOINT.md](./CHECKPOINT.md)

---

## Структура

```
src/main/       Electron — crypto, blockchain, vault, LND client
src/preload/    Secure IPC bridge
src/renderer/   React UI
src/shared/     Types, networks, version
```

---

## Предупреждение

⚠️ **Non-custodial** — вие пазите seed и парола.  
⚠️ **Mainnet** — реални средства. Проверявай мрежата преди изпращане.  
⚠️ **Lightning macaroon** — admin права; дръж REST само на localhost.

---

MIT · **© Evtinko Auctions**
