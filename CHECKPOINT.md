# EvtinkoWallet — Checkpoint (Production)

**Версия:** 3.2.2 · **Дата:** 14.07.2026  
**Repository:** https://github.com/filipovrz/usdt_wallet  
**Статус:** 🟢 Production-ready · 14 networks · BTC + Lightning · **FINAL CHECKPOINT**

---

## v3.2.2 — Final polish

| Feature | Статус |
|---------|--------|
| Welcome screen (14 networks) | ✅ |
| Offline History by account | ✅ |
| Copyright code signature | ✅ |
| Installers local archive (`installers/`) | ✅ |
| `npm test` 12/12 | ✅ |
| E2E 2/2 | ✅ |

## v3.2.1 — Polish

| Feature | Статус |
|---------|--------|
| Lightning history (LND sync) | ✅ |
| Lightning USD on Dashboard | ✅ |
| LND test connection (Settings) | ✅ |
| Lightning i18n (BG/EN) | ✅ |
| Help §1–7 updated | ✅ |

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

## Build & installers

```powershell
# Windows
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
npm run electron:build:win
```

→ `release/EvtinkoWallet Setup 3.2.2.exe`  
→ **Архив (всички версии):** `installers/EvtinkoWallet Setup *.exe`

```bash
npm run electron:build:mac    # macOS (.dmg) — build on Mac
npm run electron:build:linux  # Linux (AppImage/deb) — build on Linux
```

---

## Backup locations

| Какво | Къде |
|-------|------|
| Source code | GitHub `main` + tag `v3.2.2` |
| Windows installers (all versions) | `installers/` (local) |
| Latest release assets | GitHub Releases |
| User vault | `%APPDATA%/usdt-wallet/vault.enc.json` |

*Final checkpoint v3.2.2 — 14.07.2026 — project paused*
