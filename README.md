# EvtinkoWallet

**Repository:** [github.com/filipovrz/usdt_wallet](https://github.com/filipovrz/usdt_wallet)

Професионален **некастодиален** desktop портфейл — **USDT**, **USDC**, **native coins** (TRX, ETH, BNB, MATIC, AVAX, SOL) и **HNT (Solana SPL)**.

**Текуща версия: 3.0.0** · Production-ready

Вашите private keys и seed фраза **никога не напускат компютъра**. Нулева телеметрия.

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![Version](https://img.shields.io/badge/version-3.0.0-green)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Функции

| Функция | Описание |
|---------|----------|
| **13 мрежи** | … + **TON** (USDT jetton) + Solana |
| **Stablecoins** | USDT + USDC + **DAI** (EVM mainnet) + TRC-20 USDC на TRON |
| **Native send** | TRX, ETH, BNB, MATIC, AVAX, SOL |
| **Service fee** | 0.25% mainnet send (min $0.01, max $1); изключен на testnet |
| **Solana** | HNT (SPL) + USDC + SOL |
| **Multi-account** | Уникални адреси per account (vault v4) |
| **Testnet mode** | Shasta, Sepolia, BSC/Polygon/Arbitrum/Base/Optimism/Avalanche testnet, Solana Devnet |
| **Security** | scrypt + AES-256-GCM vault, auto-lock, IPC isolation, CSP (production) |
| **Hardware** | Ledger USB (TRON/EVM) |
| **Updates** | electron-updater |
| **Installer** | NSIS Windows — `EvtinkoWallet Setup X.X.X.exe` |
| **Copyright** | © Evtinko Auctions |

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

---

## Development

```powershell
cd "D:\Filipov Ne Pipai\Pgojects\usdt_wallet"
npm install
npm run electron:dev
```

---

## Production build (Windows)

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
npm run electron:build:win
```

→ `release/EvtinkoWallet Setup 3.0.0.exe`

- Desktop + Start Menu shortcut **EvtinkoWallet**
- Деинсталация от Control Panel

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

4. **Dashboard** → Refresh → **Send** (native / USDC / USDT)

⚠️ Solana Devnet: HNT mint е mainnet-only — тествай **SOL** и **USDC**.

---

## Тестване

```powershell
npm test              # build + 9 unit tests
npm run test:e2e      # Playwright smoke
npm run test:live     # + live RPC
```

---

## Версии

| Версия | Промени |
|--------|---------|
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
src/main/       Electron — crypto, blockchain, vault
src/preload/    Secure IPC bridge
src/renderer/   React UI
src/shared/     Types, networks, version
```

---

## Предупреждение

⚠️ **Non-custodial** — вие пазите seed и парола.  
⚠️ **Mainnet** — реални средства. Проверявай мрежата преди изпращане.

---

MIT · **© Evtinko Auctions**
