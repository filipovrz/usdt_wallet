# EvtinkoWallet — Checkpoint (Production)

**Версия:** 2.5.0 · **Дата:** 14.07.2026 · **Copyright:** © Evtinko Auctions  
**Repository:** https://github.com/filipovrz/usdt_wallet  
**Статус:** 🟢 Production-ready · Testnet TRON ✅ · Sepolia ✅ · Solana Devnet ⏳ · Mainnet smoke ⏭ skipped (no coins)

---

## Production checklist

| Стъпка | Статус |
|--------|--------|
| `npm test` (unit) | ✅ |
| Production build (`electron:build:win`) | ✅ / виж release/ |
| CSP enabled (release only) | ✅ |
| Dev diagnostics off in production | ✅ |
| Vault path непроменен (`%APPDATA%/usdt-wallet`) | ✅ |
| Rebrand EvtinkoWallet | ✅ |
| 9 мрежи + USDC | ✅ |
| Explorer API keys (7 scanners) | ✅ |
| Service fee (mainnet, owner exempt) | ✅ |
| Multi-account (vault v4) + rename/remove | ✅ |
| Auto-update (electron-updater) | ✅ |
| Code signing | ⏭ skipped (CSC_IDENTITY_AUTO_DISCOVERY=false) |

---

## Поддържани мрежи (v2.5.0)

| Мрежа | USDT | USDC | Native |
|-------|------|------|--------|
| TRON | ✅ | — | TRX |
| Ethereum | ✅ | ✅ | ETH |
| BNB Chain | ✅ | ✅ | BNB |
| Polygon | ✅ | ✅ | MATIC |
| Arbitrum One | ✅ | ✅ | ETH |
| Base | ✅ | ✅ | ETH |
| Optimism | ✅ | ✅ | ETH |
| Avalanche C-Chain | ✅ | ✅ | AVAX |
| Solana | HNT | ✅ | SOL |

**Testnet:** Shasta · Sepolia · BSC/Polygon/Arbitrum/Base/Optimism testnet · Avalanche Fuji · Solana Devnet

---

## API keys (Settings → optional)

| Key | Мрежи |
|-----|-------|
| TronGrid | TRON |
| Etherscan | Ethereum, **Optimism** |
| BscScan | BSC |
| PolygonScan | Polygon |
| Arbiscan | Arbitrum |
| Basescan | Base |
| Snowtrace | Avalanche |

---

## Тестов прогрес (Filip — 14.07.2026)

| Стъпка | Резултат | Бележка |
|--------|----------|---------|
| TRON Shasta | ✅ | faucet + send + history |
| Sepolia ETH | ✅ | Google Cloud faucet |
| Sepolia send/receive | ✅ | Account 1 ↔ Account 2 |
| Multi-account | ✅ | derivationIndex, vault v4 |
| USDC + Arbitrum + Base | ✅ | код + UI |
| Optimism + Avalanche | ✅ | код + UI |
| Service fee config | ✅ | owner wallets set; live test skipped |
| Solana Devnet SOL/USDC | ⏳ | pending |
| Mainnet smoke / fee | ⏭ | няма реални коини |

---

## Инсталация (Windows production)

```powershell
cd "D:\Filipov Ne Pipai\Pgojects\usdt_wallet"
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
npm run electron:build:win
```

→ `release/EvtinkoWallet Setup 2.5.0.exe`

---

## Команди

```powershell
npm test                    # build + unit tests
npm run electron:dev        # development
npm run electron:build:win  # NSIS installer (no code signing)
powershell -ExecutionPolicy Bypass -File scripts/restart-wallet.ps1
```

---

## Vault & данни

- **Vault:** `%APPDATA%\usdt-wallet\vault.enc.json`
- **Config:** electron-store в `%APPDATA%\usdt-wallet\`
- Rebrand **не променя** пътя — съществуващият портфейл работи

---

*Checkpoint v2.5.0 — Production — 14.07.2026*
