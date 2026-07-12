# CHAT_SAVE — Пълен сейф на разговора

**Последна актуализация:** 13 юли 2026, 01:55  
**Текуща версия:** 2.2.2  
**Copyright:** © Evtinko Auctions  
**Проект:** USDT Wallet Desktop Application  
**Repository:** https://github.com/filipovrz/usdt_wallet  
**Работна директория:** `D:\Filipov Ne Pipai\Pgojects\usdt_wallet`  
**Статус:** **ПАУЗА** — TRON testnet ✅ · Sepolia ETH faucet ❌ (ETH не пристигна)

---

## Сесия 13.07.2026 (нощ) — TRON OK, Sepolia блокиран

### Тестов прогрес

| Стъпка | Резултат |
|--------|----------|
| 1–5 Основен UI | ✅ |
| 6–7 TRON Shasta | ✅ faucet + 10 TRX send + история |
| 8 Sepolia | ❌ 0 ETH — Alchemy иска mainnet ETH; Chainlink без резултат |
| 9 Solana | ⏸ GitHub login на faucet |

### Код (v2.2.2)

- EVM адрес **live от seed** при unlock (`getSession` + backfill `ethAddress`)
- Receive: **42/42 символа**, EIP-55 checksum
- SendPage: TRON self-send блок
- `scripts/restart-wallet.ps1` — рестарт от AI/терминал
- Help: Chainlink / Google Cloud faucets

### Бележки

- Потребителят **не може** сам да рестартира — AI пуска `restart-wallet.ps1`
- Sepolia: проблемът **не е** в портфейла — faucet-ите не дават ETH
- След пауза: Chainlink или Google Cloud → Refresh → 0.0005 ETH send

---

## Сесия 13.07.2026 — Testnet + v2.2.1 hotfix

- Create wallet → `finalizeWalletSetup`
- TRON address fix (TronWeb)
- Session IPC, routing, Dashboard crash
- Testnet EVM checksum + RPC

---

## Архитектура (v2.2.2)

```
24-word seed (BIP39)
  ├── TRON  → TronWeb (m/44'/195'/0'/0/0)
  ├── EVM   → ethers getAddress (m/44'/60'/0'/0/0)
  └── Solana → ed25519 HD (m/44'/501'/0'/0')
```

### Vault

`C:\Users\filip\AppData\Roaming\usdt-wallet\vault.enc.json`

---

## Команди

```powershell
cd "D:\Filipov Ne Pipai\Pgojects\usdt_wallet"
npm run build
powershell -ExecutionPolicy Bypass -File scripts/restart-wallet.ps1
npm test
```

---

## Свързани файлове

- [CHECKPOINT.md](./CHECKPOINT.md)
- [README.md](./README.md)
- [CHANGELOG.md](./CHANGELOG.md)
