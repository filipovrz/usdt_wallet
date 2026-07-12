# CHAT_SAVE — Пълен сейф на разговора

**Последна актуализация:** 13 юни 2026  
**Текуща версия:** 2.1.0  
**Copyright:** © Evtinko Auctions  
**Проект:** USDT Wallet Desktop Application  
**Работна директория:** `d:\Filipov Ne Pipai\Pgojects\usdt_wallet`  
**Статус:** Пауза — готов за ръчно тестване

---

## Хронология на заявките

### Сесия 1–3 — v1.0.0 → v2.0.0
- Пълен USDT desktop wallet (TRC-20 + ERC-20)
- Help, тестове, BSC/Polygon, testnet, multi-account, themes, CI
- NSIS инсталатор, vault crypto, Help BG/EN

### Сесия 4 — v2.1.0 roadmap
- Ledger USB + Trezor detection
- TRON on-chain multisig deploy
- electron-updater
- Playwright E2E
- Windows installer `USDT Wallet Setup 2.1.0.exe`

### Сесия 5 (последна) — UX polish
1. **Copyright Evtinko Auctions** — package.json, version.ts, Layout, Welcome, Unlock, Help
2. **Toast notification system** — всички user actions показват success/error/info/warning
3. **Сейф преди почивка** — CHECKPOINT, CHAT_SAVE, README, CHANGELOG

---

## Какво е изградено (v2.1.0)

### Стек
Electron 33 · React 18 · TypeScript · Vite · Tailwind · TronWeb 6 · ethers 6 · electron-updater · @ledgerhq/*

### Мрежи
TRON, Ethereum, BSC, Polygon (+ testnet режим)

### UI страници
Welcome, Create, Import, Unlock, Dashboard, Send, Receive, History, Address Book, Backup, Hardware, Multi-Sig, Security, Help, Settings

### Toast система
- `ToastContext.tsx` — fixed top-right, auto-dismiss 5.5s
- `useNotify()` — success / error / info / warning + `apiError(code)`
- `api-messages.ts` — превод на API error codes
- Интегрирано във всички pages (Auth, Setup, Dashboard, Send, Receive, History, AddressBook, OtherPages)

### Copyright
```typescript
// src/shared/version.ts
COPYRIGHT_HOLDER = 'Evtinko Auctions'
COPYRIGHT_TEXT = '© 2026 Evtinko Auctions. All rights reserved.'
```

### Security
- scrypt + AES-256-GCM vault
- BIP39/BIP32, auto-lock, brute-force 5×/15min
- IPC whitelist + Zod validation

---

## Тестове (последни)

| Команда | Резултат |
|---------|----------|
| `npm test` | 9 passed, 0 failed, 2 skipped |
| `npm run test:e2e` | 1 passed |
| `npm run build` | OK |
| `electron:build:win` | `release/USDT Wallet Setup 2.1.0.exe` |

---

## Команди за следваща сесия

```powershell
cd "d:\Filipov Ne Pipai\Pgojects\usdt_wallet"
npm install
npm run electron:dev          # UI + toast тест
npm test
npm run test:e2e
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'; npm run electron:build:win
```

---

## Следващи стъпки (когато продължим)

1. Ръчно тестване на инсталатора 2.1.0
2. Тест на toast при create/unlock/send/settings
3. Ledger USB тест (ако има устройство)
4. Code signing certificate (production)
5. Реален update server

---

## История на версиите

| Версия | Резюме |
|--------|--------|
| 1.0.0 | TRC-20 + ERC-20, NSIS |
| 1.1.0 | Help, тестове, CHANGELOG |
| 2.0.0 | BSC/Polygon, testnet, themes, CI |
| 2.1.0 | Hardware, multisig deploy, updater, E2E, toast, Evtinko copyright |

*CHAT_SAVE — пауза 13.06.2026*
