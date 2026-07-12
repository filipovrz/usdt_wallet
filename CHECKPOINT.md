# USDT Wallet — Checkpoint

**Версия:** 2.1.0 · **Дата:** 13.06.2026 · **Copyright:** © Evtinko Auctions  
**Статус:** Production-ready — пауза преди ръчно тестване

## Последни промени (сесия 13.06.2026)

| Промяна | Детайли |
|---------|---------|
| **Copyright** | © Evtinko Auctions — sidebar, Welcome, Unlock, Help, package.json |
| **Toast известия** | Глобални success/error/info/warning за всички действия |
| **Преводи** | `toast` + `errors` ключове BG/EN в translations.ts |
| **Инсталатор** | `release/USDT Wallet Setup 2.1.0.exe` (~96 MB) |

## v2.1.0 — завършено ✓

| Категория | Функции |
|-----------|---------|
| Hardware | Ledger scan + address read; Trezor USB detection |
| Multisig | TRON on-chain deploy (account permissions) |
| Updates | electron-updater check/download/install |
| UX | Toast notifications за всички user actions |
| Brand | Copyright Evtinko Auctions |
| QA | Playwright E2E + 9 unit tests |
| Docs | Help BG/EN, CHANGELOG, README, CHAT_SAVE |

## v2.0.0 — имплементирано ✓

| Категория | Функции |
|-----------|---------|
| Мрежи | TRON, Ethereum, BSC, Polygon + testnet |
| Settings | API keys, offline, theme, fee tier |
| Security | Passphrase, change password, encrypted backup |
| UX | Multi-account, USD value, TRON energy, tx notes |

## Тестове

```
npm test        → 9/9 passed, 2 skipped ✓
npm run test:e2e → 1/1 passed ✓
npm run build   → OK ✓
```

## Команди

```powershell
cd "d:\Filipov Ne Pipai\Pgojects\usdt_wallet"
npm run electron:dev
npm test
npm run test:e2e
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'; npm run electron:build:win
```

## Ключови файлове (нови/важни)

| Файл | Роля |
|------|------|
| `src/renderer/context/ToastContext.tsx` | Toast UI + provider |
| `src/renderer/hooks/useNotify.ts` | Hook за toast + API errors |
| `src/renderer/i18n/api-messages.ts` | formatApiError() |
| `src/shared/version.ts` | APP_VERSION, COPYRIGHT_* |
| `build/icon.png` | Windows installer icon |

## Опционално (production)

- Code signing: `$env:CSC_LINK='cert.pfx'; $env:CSC_KEY_PASSWORD='…'`
- Update manifest: `$env:UPDATE_MANIFEST_URL='https://…/latest.json'`
- Trezor full signing in-app, EVM Gnosis Safe multisig

*Checkpoint v2.1.0 — пауза*
