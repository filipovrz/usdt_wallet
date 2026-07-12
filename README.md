# USDT Wallet

**Repository:** [github.com/filipovrz/usdt_wallet](https://github.com/filipovrz/usdt_wallet)

Професионален **некастодиален** desktop портфейл — **USDT** (TRC-20 / ERC-20 / BEP-20), **native coins** (TRX, ETH, BNB, MATIC, SOL) и **HNT (Solana SPL)**.

**Текуща версия: 2.2.1**

Вашите private keys и seed фраза **никога не напускат компютъра**. Нулева телеметрия.

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![Version](https://img.shields.io/badge/version-2.2.1-green)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Функции

| Функция | Описание |
|---------|----------|
| **Създаване / Import** | BIP39 seed (24 думи), парола за vault |
| **TRC-20 USDT** | TRON mainnet — баланс, изпращане, история |
| **ERC-20 USDT** | Ethereum mainnet — баланс, изпращане, история |
| **Solana HNT + SOL** | HNT (SPL) и native SOL — баланс, изпращане, история |
| **Native send** | TRX, ETH, BNB, MATIC, SOL |
| **Dashboard** | Token + native баланс, превключване на мрежа |
| **Send / Receive** | Preview, потвърждение, QR код |
| **Address Book** | Контакти по мрежа |
| **Backup** | Seed reveal с парола |
| **Help** | 14-секционен наръчник BG/EN + test guide |
| **Security** | Auto-lock, brute-force защита, IPC isolation |
| **Settings** | BG/EN, auto-lock минути, default мрежа |
| **Installer** | NSIS Windows installer с деинсталация |
| **BSC / Polygon** | BEP-20 и Polygon USDT |
| **Testnet** | Shasta, Sepolia, testnet BSC/Polygon, Solana Devnet |
| **Multi-account** | Множество акаунти в един vault |
| **Themes** | Dark / Light |
| **Hardware** | Ledger USB scan + address; Trezor detection |
| **Multi-Sig** | M-of-N policies + TRON on-chain deploy |
| **Updates** | electron-updater check/download/install |
| **Toast UX** | Известия за всички действия (success/error/info/warning) |
| **Copyright** | © Evtinko Auctions |

---

## Сигурност

```
┌─────────────────────────────────────────┐
│  Renderer (React UI)                    │
│  • Няма достъп до keys/seed/RPC         │
└─────────────────┬───────────────────────┘
                  │ IPC (whitelisted + Zod)
┌─────────────────▼───────────────────────┐
│  Main Process                           │
│  • scrypt + AES-256-GCM vault           │
│  • BIP39/BIP32 key derivation           │
│  • TronWeb + ethers signing             │
└─────────────────────────────────────────┘
```

- **Vault:** `%APPDATA%/usdt-wallet/vault.enc.json` (Windows)
- **KDF:** scrypt (N=16384, r=8, p=1) + AES-256-GCM
- **Auto-lock:** 1–120 мин (default: 5)
- **Lockout:** 5 грешни пароли → 15 мин блокиране

---

## Изисквания

- Node.js 18+ (препоръчително 20+)
- npm 9+
- Windows 10/11 (за NSIS installer)

---

## Бърз старт

```powershell
cd "d:\Filipov Ne Pipai\Pgojects\usdt_wallet"
npm install
npm run electron:dev
# Production (след build):
npm run build
powershell -ExecutionPolicy Bypass -File scripts/restart-wallet.ps1
```

---

## Инсталация (Windows)

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
npm run electron:build:win
```

→ `release/USDT Wallet Setup 2.1.0.exe`

- Desktop + Start Menu shortcut
- Деинсталация от Control Panel (изтрива app data)

---

## Използване

1. **Първо стартиране** → Създай / Импортирай портфейл
2. **Запиши seed фразата** офлайн (24 думи)
3. **Отключи** с парола при следващи стартирания
4. **Help** (sidebar → Помощ) — пълен наръчник
5. **TRC-20:** дръж TRX за такси · **ERC-20:** дръж ETH за gas

### Testnet тест (без реални пари)

1. **Настройки** → включи **Testnet mode** → Запази
2. **Получи** → копирай адреса за избраната мрежа
3. Вземи test tokens от faucet:

| Мрежа | Faucet |
|-------|--------|
| TRON Shasta | https://shasta.tronex.io/join/getJoinPage |
| Ethereum Sepolia | https://faucets.chain.link/sepolia (без mainnet ETH) |
| Solana Devnet | https://faucet.solana.com (GitHub login) |

4. **Табло** → Refresh → test send (Native TRX/ETH/SOL)
5. След тестове: изключи Testnet mode

⚠️ TRON Shasta: `shasta.tronscan.org/#/tools/faucet` **не работи** (404) — ползвай tronex.io.

### Ръчен test mainnet (кратко)

1. Получи → копирай TRC-20 адрес (T…)
2. Изпрати малко USDT + ~15 TRX от exchange
3. Dashboard → Обнови
4. Изпрати 1 USDT обратно → History → Обнови

*(Пълен guide: Help → секция 14)*

---

## Поддържани контракти

| Мрежа | USDT Contract |
|-------|---------------|
| TRON (TRC-20) | `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` |
| Ethereum (ERC-20) | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |

---

## RPC endpoints

| Мрежа | Default RPC |
|-------|-------------|
| TRON | `https://api.trongrid.io` |
| Ethereum | `https://ethereum.publicnode.com` |

**Optional env vars:**
```powershell
$env:TRONGRID_API_KEY='...'   # за TronGrid rate limits
$env:ETHERSCAN_API_KEY='...'  # за history API
```

---

## Тестване

```powershell
npm test              # 9 unit tests
npm run test:e2e      # Electron smoke test
npm run test:live     # + blockchain RPC (интернет)
```

Последен резултат: **9/9 unit ✓** · **E2E create-wallet ✓** (13.07.2026)

---

## Версиониране

| Версия | Промени |
|--------|---------|
| **2.2.1** | TRON address fix, create-wallet flow, session IPC, testnet RPC/checksum |
| **2.2.0** | Solana SOL + HNT SPL, vault v3, CoinGecko SOL/HNT |
| **2.0.0** | BSC/Polygon, testnet, multi-account, themes, CI |
| **1.1.0** | Help меню, автоматични тестове, CHANGELOG |
| **1.0.0** | Пълен портфейл + NSIS инсталатор |

→ [CHANGELOG.md](./CHANGELOG.md)

---

## Структура на проекта

```
src/
├── main/          # Electron main — crypto, blockchain, vault
├── preload/       # Secure API bridge
├── renderer/      # React UI + Help
└── shared/        # Types, IPC, version, validation
scripts/
└── run-tests.mjs  # Automated test suite
```

---

## Документация

| Файл | Описание |
|------|----------|
| [CHECKPOINT.md](./CHECKPOINT.md) | Технически checkpoint — какво е готово |
| [CHAT_SAVE.md](./CHAT_SAVE.md) | Пълен сейф на AI разговора |
| [CHANGELOG.md](./CHANGELOG.md) | История на версиите |

---

## Предупреждение

⚠️ **Non-custodial** — вие пазите seed фразата и паролата.  
⚠️ **Mainnet** — реални средства.  
⚠️ **TRC-20 ≠ ERC-20** — проверявай мрежата преди изпращане.

---

## Лиценз

MIT · **© Evtinko Auctions**
