# Changelog

## [2.1.0] — 2026-06-13

### Добавено
- **Ledger USB** — scan устройства + read address (TRON/EVM)
- **Trezor detection** — USB откриване (signing via Trezor Suite)
- **TRON on-chain multisig deploy** — account permissions от Multi-Sig страница
- **electron-updater** — check, download, install updates
- **Playwright E2E** smoke test (`npm run test:e2e`)
- Разширени unit тестове (BSC/Polygon validation, multisig schema, semver)
- Help обновен за BSC, Polygon, hardware, multisig, updates
- **Copyright © Evtinko Auctions** (package.json, UI footer, Help)
- **Toast notifications** — success/error/info/warning за всички user actions
- `ToastContext`, `useNotify`, `formatApiError()` BG/EN

### Бележки
- Code signing certificate — optional (env `CSC_LINK` / `CSC_KEY_PASSWORD`)
- EVM on-chain multisig — използвайте Gnosis Safe; локални политики се пазят в vault

## [2.0.0] — 2026-06-13
