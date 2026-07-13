# EvtinkoWallet — Checkpoint (Production)

**Версия:** 3.0.0 · **Дата:** 14.07.2026  
**Repository:** https://github.com/filipovrz/usdt_wallet  
**Статус:** 🟢 TON added · Mainnet test when coins available

---

## v3.0.0 — TON

| Feature | Статус |
|---------|--------|
| TON native + USDT jetton | ✅ |
| Vault v5 (tonAddress) | ✅ |
| Service fee (needs OWNER_WALLET.ton) | ✅ config |
| Toncenter API key | ✅ |
| `npm test` 10/10 | ✅ |

**13 мрежи:** TRON · ETH · BSC · Polygon · Arbitrum · Base · Optimism · Avalanche · zkSync · Linea · Scroll · **TON** · Solana

---

## Build

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
npm run electron:build:win
```

→ `release/EvtinkoWallet Setup 3.0.0.exe`

*Checkpoint v3.0.0 — 14.07.2026*
