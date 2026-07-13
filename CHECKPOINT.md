# EvtinkoWallet — Checkpoint (Production)

**Версия:** 2.6.0 · **Дата:** 14.07.2026 · **Copyright:** © Evtinko Auctions  
**Repository:** https://github.com/filipovrz/usdt_wallet  
**Статус:** 🟢 Production-ready · Mainnet test when coins available

---

## v2.6.0 — ново

| Feature | Статус |
|---------|--------|
| TRC-20 USDC (TRON mainnet) | ✅ |
| zkSync Era + Linea + Scroll | ✅ |
| DAI на EVM mainnet (8 мрежи + 3 L2) | ✅ |
| Lineascan + Scrollscan API keys | ✅ |
| `npm test` 10/10 | ✅ |

**12 мрежи:** TRON · ETH · BSC · Polygon · Arbitrum · Base · Optimism · Avalanche · zkSync · Linea · Scroll · Solana

**Send assets:** USDT · USDC · DAI (EVM mainnet) · native

---

## Build

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
npm run electron:build:win
```

→ `release/EvtinkoWallet Setup 2.6.0.exe`

*Checkpoint v2.6.0 — 14.07.2026*
