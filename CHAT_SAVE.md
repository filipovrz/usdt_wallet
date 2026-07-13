# CHAT_SAVE — Пълен сейф на разговора

**Последна актуализация:** 14 юли 2026  
**Текуща версия:** 2.5.0 (Production)  
**Copyright:** © Evtinko Auctions  
**Проект:** EvtinkoWallet (бивш USDT Wallet)  
**Repository:** https://github.com/filipovrz/usdt_wallet  
**Работна директория:** `D:\Filipov Ne Pipai\Pgojects\usdt_wallet`  
**Статус:** 🟢 Production-ready · Mainnet smoke skipped (no coins) · Code signing skipped

---

## Сесия 14.07.2026 — v2.5.0

### Направено

| Област | Детайл |
|--------|--------|
| **Optimism** | USDT, USDC, native ETH (mainnet + Sepolia testnet) |
| **Avalanche C-Chain** | USDT, USDC, native AVAX (mainnet + Fuji testnet) |
| **API keys** | Arbiscan, Basescan, Snowtrace (+ Optimism via Etherscan) |
| **Service fee** | 0.25% mainnet (v2.4.0), owner wallets configured |
| **Accounts** | Rename + remove в Settings |
| **AVAX price** | CoinGecko за service fee native sends |
| **Docs** | README, CHANGELOG, CHECKPOINT, CHAT_SAVE → 2.5.0 |
| **Build** | NSIS installer без code signing |
| **GitHub** | commit + push |

### Не е тествано (по избор на потребителя)

- Mainnet smoke test — няма реални коини
- Service fee live на mainnet — същата причина
- Code signing — отложено

---

## Сесия 13.07.2026 — v2.3.x / v2.4.0

- USDC, Arbitrum, Base (v2.3.0)
- Rebrand → **EvtinkoWallet** (v2.3.1)
- Service fee (v2.4.0)
- Multi-account vault v4, Send/Welcome UX
- Testnet: TRON ✅ Sepolia ✅ Solana ⏳

---

## Архитектура (v2.5.0)

```
24-word seed (BIP39)
  ├── TRON   → m/44'/195'/0'/0/{index}
  ├── EVM    → m/44'/60'/0'/0/{index}  (ETH, BSC, Polygon, Arbitrum, Base, Optimism, Avalanche)
  └── Solana → m/44'/501'/{index}'/0'
```

**9 мрежи:** TRON · Ethereum · BSC · Polygon · Arbitrum · Base · Optimism · Avalanche · Solana

### Owner wallets (service fee exempt)

```
tron:   TK1qyEhwZYMSUbLb6biXCtRM2weDcGJ6Gu
evm:    0x7180Bee8058655522C0D8227686e9B719CC16F82
solana: sTJp9XHNh47UHLPvcaPyZ2KhTFyhUGAb9veKdqtJot1
```

### Vault

`C:\Users\filip\AppData\Roaming\usdt-wallet\vault.enc.json`

---

## Команди

```powershell
cd "D:\Filipov Ne Pipai\Pgojects\usdt_wallet"
npm test
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
npm run electron:build:win
```

---

## Свързани файлове

- [CHECKPOINT.md](./CHECKPOINT.md) — production checklist
- [README.md](./README.md) — user guide
- [CHANGELOG.md](./CHANGELOG.md) — версии

---

## Следващи стъпки (по избор)

1. Solana Devnet — SOL + USDC send test
2. Mainnet smoke + service fee live test (когато има коини)
3. Code signing certificate за Windows (SmartScreen)
4. GitHub Release tag `v2.5.0`
