# EvtinkoWallet — Checkpoint (Production)

**Версия:** 3.2.1 · **Дата:** 14.07.2026  
**Repository:** https://github.com/filipovrz/usdt_wallet  
**Статус:** 🟢 Production-ready · 14 networks · BTC + Lightning

---

## v3.2.1 — Polish

| Feature | Статус |
|---------|--------|
| Lightning history (LND sync) | ✅ |
| Lightning USD on Dashboard | ✅ |
| LND test connection (Settings) | ✅ |
| Lightning i18n (BG/EN) | ✅ |
| Help §1–7 updated | ✅ |
| `npm test` 11/11 | ✅ |

## v3.2.0 — Lightning

| Feature | Статус |
|---------|--------|
| Bitcoin Lightning (LND REST) | ✅ |
| On-chain \| Lightning tabs | ✅ |
| Help §18 LND setup | ✅ |

## v3.1.0 — Bitcoin on-chain

| Feature | Статус |
|---------|--------|
| BTC BIP84 bc1 send/receive | ✅ |
| Vault v6 (bitcoinAddress) | ✅ |
| Service fee on BTC mainnet | ✅ |

**14 мрежи:** TRON · ETH · BSC · Polygon · Arbitrum · Base · Optimism · Avalanche · zkSync · Linea · Scroll · TON · **Bitcoin** · Solana

---

## Build

```powershell
# Windows
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
npm run electron:build:win

# macOS / Linux (on respective OS)
npm run electron:build:mac
npm run electron:build:linux
```

→ `release/EvtinkoWallet Setup 3.2.1.exe` (Windows)

*Checkpoint v3.2.1 — 14.07.2026*
