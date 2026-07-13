# EvtinkoWallet — Windows installers (local archive)

Локално копие на **всички Windows NSIS инсталатори** — не се качват в git (`.exe` е gitignored).

## Как се попълва

След всеки Windows build:

```powershell
npm run electron:build:win
```

Build-ът автоматично копира `.exe` файловете от `release/` тук.

Ръчно (ако вече имате файлове в `release/`):

```powershell
node scripts/archive-installers.mjs
```

## Файлове

| Файл | Описание |
|------|----------|
| `EvtinkoWallet Setup X.Y.Z.exe` | Текущ бранд (v2.3.1+) |
| `USDT Wallet Setup X.Y.Z.exe` | Ранни версии (v1.x–v2.2) |
| `manifest.json` | Списък + размери (генерира се от скрипта) |

## GitHub Releases

Официални релийзи и auto-update:  
https://github.com/filipovrz/usdt_wallet/releases
