# CHAT_SAVE — Пълен сейф на разговора

**Последна актуализация:** 13 юли 2026, 00:59  
**Текуща версия:** 2.2.1  
**Copyright:** © Evtinko Auctions  
**Проект:** USDT Wallet Desktop Application  
**Repository:** https://github.com/filipovrz/usdt_wallet  
**Работна директория:** `D:\Filipov Ne Pipai\Pgojects\usdt_wallet`  
**Статус:** Testnet тестване в процес — стъпки 1–5 OK, 6–9 pending faucets

---

## Сесия 13.07.2026 — Testnet тест + hotfix-и

### Цел
Добавяне на Solana/HNT (v2.2.0), тестване без реални ETH/SOL, fix на create wallet и testnet bugs.

### Хронология (кратко)

1. **„Не отваря 24 думи“** — orphan vault от тестове + `electron-store` wrong cwd + vault saved преди mnemonic screen
2. **„Видях 24 думи, после нищо“** — `getSession` не връщаше ApiResponse; React routing race; Dashboard `t` undefined
3. **Create flow fix** — `finalizeWalletSetup` IPC; vault save след „Записах seed“
4. **„2 не“ — Invalid address** — TRON адрес derivation bug (custom base58 invalid); fix с TronWeb + vault backfill
5. **Testnet** — EIP-55 checksum, Sepolia RPC, resilient getBalance
6. **Стъпка 2 ✅** след restart + unlock (backfill TRON address)
7. **Faucet 404** — shasta.tronscan.org/tools/faucet не работи → shasta.tronex.io
8. **Solana faucet** — изисква GitHub auth на faucet.solana.com
9. **Голям сейф** — CHECKPOINT, CHAT_SAVE, README, CHANGELOG, GitHub push

### Тестови отговори от потребителя

```
1 Да, 2 не → 2 Да (след fix), 3 да, 4 да, 7 не, 8 не, 9 не
```

---

## Сесия 12.07.2026 — v2.2.0 Solana + HNT

### Добавено
- `@solana/web3.js`, `@solana/spl-token`, `ed25519-hd-key`, `tweetnacl`, `bs58`
- `solana-service.ts` — SOL + HNT (mint: `hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux`)
- `solana-keys.ts` — CommonJS-safe derivation (без ESM @noble/ed25519)
- Vault v3, price service SOL/HNT, UI network selector
- uuid@9 patch за rpc-websockets
- preload esbuild bundle

---

## Сесии 06–13.06.2026 — v1.0 → v2.1.0

- v1.0: TRC-20 + ERC-20 wallet, NSIS installer
- v2.0: BSC, Polygon, testnet, multi-account, themes, CI
- v2.1: Ledger, multisig deploy, updater, toast UX, E2E smoke test

---

## Архитектура (v2.2.1)

```
24-word seed (BIP39)
  ├── TRON  → TronWeb.address.fromPrivateKey (path m/44'/195'/0'/0/0)
  ├── EVM   → ethers (path m/44'/60'/0'/0/0) — ETH, BSC, Polygon
  └── Solana → ed25519 HD (path m/44'/501'/0'/0') — SOL + HNT SPL
```

### Create wallet flow (correct)

1. `createWallet` → генерира mnemonic, **не** записва vault
2. UI показва 24 думи
3. User маркира „Записах seed“ → `finalizeWalletSetup(password)`
4. Vault encrypt + unlock → dashboard

### Vault location

`C:\Users\filip\AppData\Roaming\usdt-wallet\vault.enc.json`

---

## Известни проблеми / бележки

| Проблем | Статус |
|---------|--------|
| Стар TRON адрес в vault | Fixed — backfill при unlock |
| shasta.tronscan faucet 404 | Workaround — shasta.tronex.io |
| Solana faucet GitHub | External — потребителят трябва GitHub |
| HNT на devnet | Може да е 0 (mainnet token) |
| Installer exe | Не rebuild-нат след 2.2.1 — `npm run electron:build:win` |

---

## Команди за възстановяване

```powershell
git clone https://github.com/filipovrz/usdt_wallet.git
cd usdt_wallet
npm install
npm run build
$env:NODE_ENV='production'; npx electron .
```

---

## Свързани файлове в repo

- [CHECKPOINT.md](./CHECKPOINT.md) — технически checkpoint
- [README.md](./README.md) — потребителска документация
- [CHANGELOG.md](./CHANGELOG.md) — версии
- [agent transcript](file:///C:/Users/filip/.cursor/projects/d-Filipov-Ne-Pipai-Pgojects-usdt-wallet/agent-transcripts/b03f2412-2747-4ed7-9112-037cf3c14ddb/b03f2412-2747-4ed7-9112-037cf3c14ddb.jsonl) — пълен Cursor chat log

---

*CHAT_SAVE v2.2.1 — 13.07.2026*
