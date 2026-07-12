export interface HelpSection {
  id: string;
  title: string;
  content: string[];
}

export const helpContent = {
  bg: {
    pageTitle: 'Помощ и инструкции',
    pageSubtitle: 'Пълен наръчник за ползване на USDT Wallet',
    toc: 'Съдържание',
    versionLabel: 'Версия',
    changelog: 'История на версиите',
    sections: [
      {
        id: 'intro',
        title: '1. Какво е USDT Wallet?',
        content: [
          'USDT Wallet е некастодиален (non-custodial) desktop портфейл — вие държите ключовете, не ние.',
          'Поддържа USDT на четири mainnet мрежи: TRON (TRC-20), Ethereum (ERC-20), BSC (BEP-20) и Polygon.',
          'Приложението работи изцяло локално. Няма cloud акаунт, няма телеметрия.',
          'Private keys и seed фразата никога не напускат компютъра ви.',
        ],
      },
      {
        id: 'install',
        title: '2. Инсталация и стартиране',
        content: [
          'Windows: стартирайте „USDT Wallet Setup X.X.X.exe“ от папка release/.',
          'След инсталация: Desktop shortcut или Start Menu → USDT Wallet.',
          'Development: npm install → npm run electron:dev в папката на проекта.',
          'Деинсталация: Control Panel → Programs → USDT Wallet → Uninstall (изтрива и app data).',
        ],
      },
      {
        id: 'first-setup',
        title: '3. Първо настройване',
        content: [
          'При първо стартиране изберете „Създай нов портфейл“ или „Импортирай портфейл“.',
          'Създаване: задайте име и парола (мин. 8 символа). Ще получите 24-думен seed — ЗАПИШЕТЕ Я офлайн!',
          'Импорт: въведете съществуваща BIP39 seed фраза (12 или 24 думи) + нова парола за vault.',
          'След setup портфейлът се отключва автоматично. При следващи стартирания — въведете паролата.',
        ],
      },
      {
        id: 'dashboard',
        title: '4. Табло (Dashboard)',
        content: [
          'Показва USDT баланс, native баланс (TRX/ETH/BNB/MATIC) и USD стойност за избраната мрежа.',
          'Превключвайте между TRON, Ethereum, BSC и Polygon с бутоните за мрежа.',
          'TRON: energy/bandwidth индикатор. Testnet режим в Settings.',
          'Бутон „Обнови“ зарежда актуални баланси от блокчейна.',
        ],
      },
      {
        id: 'receive',
        title: '5. Получаване на USDT',
        content: [
          'Отворете „Получи“, изберете мрежа (TRC-20 или ERC-20).',
          'Покажете QR кода или копирайте адреса на получателя.',
          'ВАЖНО: подателят трябва да изпрати USDT на същата мрежа! TRC-20 ≠ ERC-20.',
          'TRC-20 депозити пристигат на TRON адреса (T…). ERC-20 — на Ethereum адреса (0x…).',
        ],
      },
      {
        id: 'send',
        title: '6. Изпращане на USDT',
        content: [
          'Отворете „Изпрати“, изберете мрежа, въведете адрес на получателя и сума.',
          'Можете да изберете контакт от Адресника.',
          'Натиснете „Преглед“ — виждате такса (TRX или ETH) и сумата.',
          'Потвърдете с паролата си. Транзакцията се подписва локално и се broadcast-ва.',
          'TRC-20 изисква TRX в портфейла за energy/bandwidth (~1–15 TRX).',
          'ERC-20 изисква ETH за gas (променлива, обикновено $1–5).',
          'Винаги тествайте с малка сума при нов получател!',
        ],
      },
      {
        id: 'networks',
        title: '7. Мрежи и такси',
        content: [
          'TRC-20 (TRON): най-евтини трансфери. Contract: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
          'ERC-20 (Ethereum): по-високи gas такси. Contract: 0xdAC17F958D2ee523a2206206994597C13D831ec7',
          'BEP-20 (BSC): 0x55d398326f99059fF775485246999027B3197955',
          'Polygon: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
          'USDT на различни мрежи НЕ са взаимозаменяеми — грешна мрежа = загубени средства.',
          'Testnet: Shasta (TRON), Sepolia (ETH), BSC/Polygon testnet — включете в Settings.',
        ],
      },
      {
        id: 'history',
        title: '8. История на транзакциите',
        content: [
          'Показва входящи и изходящи USDT трансфери от TronGrid и Etherscan.',
          'Натиснете „Обнови“ за синхронизация с блокчейна.',
          'Иконата за explorer отваря транзакцията в Tronscan или Etherscan.',
        ],
      },
      {
        id: 'address-book',
        title: '9. Адресник',
        content: [
          'Запазвайте често ползвани адреси с име и мрежа (TRON или Ethereum).',
          'При изпращане можете да изберете контакт от падащото меню.',
          'Проверявайте мрежата на контакта преди изпращане!',
        ],
      },
      {
        id: 'backup',
        title: '10. Резервно копие (Backup)',
        content: [
          'Seed фразата (24 думи) е ЕДИНСТВЕНИЯТ начин за възстановяване при загуба на компютър/парола.',
          'Меню Backup → въведете парола → виждате seed фразата.',
          'Запишете на хартия, съхранявайте на 2+ физически места. НЕ я снимайте, НЕ я качвайте онлайн.',
          'Vault паролата защитава локалния файл — без seed не можете да възстановите на нов device.',
        ],
      },
      {
        id: 'security',
        title: '11. Сигурност',
        content: [
          'Auto-lock: след неактивност портфейлът се заключва (настройва се в Settings).',
          'Brute-force: 5 грешни пароли → 15 мин блокиране.',
          '„Заключи“ в sidebar — ръчно заключване при напускане на компютъра.',
          'Vault файл: %APPDATA%/usdt-wallet/ (Windows). Криптиран с AES-256-GCM + scrypt.',
          'Никога не споделяйте seed/парола. Няма официална „поддръжка“, която да ви ги поиска.',
        ],
      },
      {
        id: 'settings',
        title: '12. Настройки',
        content: [
          'Език: Български / English.',
          'Default мрежа: коя мрежа да е избрана при отваряне на Dashboard.',
          'Auto-lock минути: 1–120 (препоръка: 5).',
          'Скрий баланси: за privacy на публични места.',
          'Потвърждение преди изпращане: преглед преди final confirm.',
          'API keys: TronGrid, Etherscan, BscScan, PolygonScan — за по-надеждна история.',
          'Theme: Dark/Light. Offline mode: само преглед без RPC.',
          'Check for updates: проверка, изтегляне и инсталация на нова версия.',
          'Изтрий портфейл: необратимо — само ако имате seed backup!',
        ],
      },
      {
        id: 'hardware',
        title: '13. Hardware wallet (Ledger/Trezor)',
        content: [
          'Hardware → Scan for devices — открива USB устройства.',
          'Ledger: отворете TRON или Ethereum app на устройството → Read address.',
          'Trezor: откриване на устройство; за подписване използвайте Trezor Suite.',
          'Ключовете остават на hardware device — приложението чете само публичен адрес.',
        ],
      },
      {
        id: 'multisig',
        title: '14. Multi-Sig политики',
        content: [
          'Multi-Sig → дефинирайте M-of-N политика с адреси на подписващи.',
          'TRON: Deploy on-chain — задава account permissions в блокчейна (изисква TRX).',
          'EVM мрежи: политиката се пази локално; за on-chain multisig използвайте Gnosis Safe.',
          'Внимание: on-chain deploy променя permissions на TRON акаунта необратимо без multisig approve.',
        ],
      },
      {
        id: 'troubleshooting',
        title: '15. Отстраняване на проблеми',
        content: [
          '„INVALID_PASSWORD“ — грешна парола или vault повреден.',
          '„INVALID_ADDRESS“ — адресът не отговаря на избраната мрежа.',
          'Send fail TRON — недостатъчно TRX за energy. Добавете TRX на същия адрес.',
          'Send fail ETH — недостатъчен ETH за gas. Добавете ETH на същия адрес.',
          'Balance 0 — проверете дали гледате правилната мрежа и адрес.',
          'History празна — натиснете Обнови; нужна е интернет връзка.',
        ],
      },
      {
        id: 'testing',
        title: '16. Как да тествате сами',
        content: [
          'Стъпка 1: Създайте нов портфейл, запишете seed фразата.',
          'Стъпка 2: От „Получи“ копирайте TRC-20 адреса (T…).',
          'Стъпка 3: Изпратете малко USDT + ~15 TRX от exchange/друг портфейл (TRC-20!).',
          'Стъпка 4: Dashboard → Обнови — проверете USDT и TRX баланс.',
          'Стъпка 5: Изпратете 1 USDT обратно на тестов адрес — потвърдете в History.',
          'Стъпка 6: Settings → Заключи → Unlock с парола.',
          'Стъпка 7 (optional): npm test в project folder — автоматични unit тестове.',
          'За ERC-20: повторете с Ethereum адрес (0x…) + ETH за gas.',
        ],
      },
    ] as HelpSection[],
  },
  en: {
    pageTitle: 'Help & User Guide',
    pageSubtitle: 'Complete guide for using USDT Wallet',
    toc: 'Contents',
    versionLabel: 'Version',
    changelog: 'Version history',
    sections: [
      {
        id: 'intro',
        title: '1. What is USDT Wallet?',
        content: [
          'USDT Wallet is a non-custodial desktop wallet — you hold the keys, not us.',
          'Supports USDT on four mainnets: TRON (TRC-20), Ethereum (ERC-20), BSC (BEP-20), and Polygon.',
          'The app runs entirely locally. No cloud account, zero telemetry.',
          'Private keys and seed phrase never leave your computer.',
        ],
      },
      {
        id: 'install',
        title: '2. Installation & launch',
        content: [
          'Windows: run "USDT Wallet Setup X.X.X.exe" from the release/ folder.',
          'After install: Desktop shortcut or Start Menu → USDT Wallet.',
          'Development: npm install → npm run electron:dev in the project folder.',
          'Uninstall: Control Panel → Programs → USDT Wallet → Uninstall (deletes app data).',
        ],
      },
      {
        id: 'first-setup',
        title: '3. First-time setup',
        content: [
          'On first launch choose "Create new wallet" or "Import wallet".',
          'Create: set name and password (min 8 chars). You get a 24-word seed — WRITE IT DOWN offline!',
          'Import: enter existing BIP39 seed (12 or 24 words) + new vault password.',
          'After setup the wallet unlocks automatically. On next launches — enter your password.',
        ],
      },
      {
        id: 'dashboard',
        title: '4. Dashboard',
        content: [
          'Shows USDT balance, native balance (TRX/ETH/BNB/MATIC), and USD value for the selected network.',
          'Switch between TRON, Ethereum, BSC, and Polygon with network buttons.',
          'TRON: energy/bandwidth indicator. Testnet mode in Settings.',
          '"Refresh" loads current balances from the blockchain.',
        ],
      },
      {
        id: 'receive',
        title: '5. Receiving USDT',
        content: [
          'Open "Receive", select network (TRC-20 or ERC-20).',
          'Show QR code or copy your address.',
          'IMPORTANT: sender must use the SAME network! TRC-20 ≠ ERC-20.',
          'TRC-20 deposits arrive at TRON address (T…). ERC-20 at Ethereum address (0x…).',
        ],
      },
      {
        id: 'send',
        title: '6. Sending USDT',
        content: [
          'Open "Send", select network, enter recipient address and amount.',
          'You can pick a contact from Address Book.',
          'Click "Preview" — see fee (TRX or ETH) and amount.',
          'Confirm with your password. Transaction is signed locally and broadcast.',
          'TRC-20 requires TRX for energy/bandwidth (~1–15 TRX).',
          'ERC-20 requires ETH for gas (variable, usually $1–5).',
          'Always test with a small amount for new recipients!',
        ],
      },
      {
        id: 'networks',
        title: '7. Networks & fees',
        content: [
          'TRC-20 (TRON): cheapest transfers. Contract: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
          'ERC-20 (Ethereum): higher gas fees. Contract: 0xdAC17F958D2ee523a2206206994597C13D831ec7',
          'BEP-20 (BSC): 0x55d398326f99059fF775485246999027B3197955',
          'Polygon: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
          'USDT on different networks is NOT interchangeable — wrong network = lost funds.',
          'Testnet: Shasta, Sepolia, BSC/Polygon testnet — enable in Settings.',
        ],
      },
      {
        id: 'history',
        title: '8. Transaction history',
        content: [
          'Shows incoming and outgoing USDT transfers from TronGrid and Etherscan.',
          'Click "Refresh" to sync with the blockchain.',
          'Explorer icon opens the transaction in Tronscan or Etherscan.',
        ],
      },
      {
        id: 'address-book',
        title: '9. Address book',
        content: [
          'Save frequently used addresses with name and network (TRON or Ethereum).',
          'When sending you can select a contact from the dropdown.',
          'Verify the contact network before sending!',
        ],
      },
      {
        id: 'backup',
        title: '10. Backup',
        content: [
          'The seed phrase (24 words) is the ONLY way to recover if you lose computer/password.',
          'Menu Backup → enter password → view seed phrase.',
          'Write on paper, store in 2+ physical locations. Do NOT photograph or upload online.',
          'Vault password protects the local file — without seed you cannot restore on a new device.',
        ],
      },
      {
        id: 'security',
        title: '11. Security',
        content: [
          'Auto-lock: wallet locks after inactivity (configurable in Settings).',
          'Brute-force: 5 wrong passwords → 15 min lockout.',
          '"Lock" in sidebar — manual lock when leaving your computer.',
          'Vault file: %APPDATA%/usdt-wallet/ (Windows). Encrypted AES-256-GCM + scrypt.',
          'Never share seed/password. No legitimate "support" will ask for them.',
        ],
      },
      {
        id: 'settings',
        title: '12. Settings',
        content: [
          'Language: Bulgarian / English.',
          'Default network: which network is selected when opening Dashboard.',
          'Auto-lock minutes: 1–120 (recommended: 5).',
          'Hide balances: for privacy in public places.',
          'Confirm before send: preview step before final confirm.',
          'API keys: TronGrid, Etherscan, BscScan, PolygonScan — for reliable history.',
          'Theme: Dark/Light. Offline mode: view-only without RPC.',
          'Check for updates: check, download, and install new versions.',
          'Delete wallet: irreversible — only if you have seed backup!',
        ],
      },
      {
        id: 'hardware',
        title: '13. Hardware wallet (Ledger/Trezor)',
        content: [
          'Hardware → Scan for devices — detects USB hardware wallets.',
          'Ledger: open TRON or Ethereum app on device → Read address.',
          'Trezor: device detection; use Trezor Suite for signing.',
          'Private keys stay on the hardware device — the app only reads public addresses.',
        ],
      },
      {
        id: 'multisig',
        title: '14. Multi-Sig policies',
        content: [
          'Multi-Sig → define M-of-N policy with signer addresses.',
          'TRON: Deploy on-chain — sets account permissions on-chain (requires TRX).',
          'EVM networks: policy stored locally; use Gnosis Safe for on-chain multisig.',
          'Warning: on-chain deploy changes TRON account permissions — requires multisig approval to revert.',
        ],
      },
      {
        id: 'troubleshooting',
        title: '15. Troubleshooting',
        content: [
          '"INVALID_PASSWORD" — wrong password or corrupted vault.',
          '"INVALID_ADDRESS" — address does not match selected network.',
          'Send fail TRON — insufficient TRX for energy. Add TRX to the same address.',
          'Send fail ETH — insufficient ETH for gas. Add ETH to the same address.',
          'Balance 0 — check you are viewing the correct network and address.',
          'Empty history — click Refresh; internet connection required.',
        ],
      },
      {
        id: 'testing',
        title: '16. How to test yourself',
        content: [
          'Step 1: Create a new wallet, write down the seed phrase.',
          'Step 2: From "Receive" copy TRC-20 address (T…).',
          'Step 3: Send small USDT + ~15 TRX from exchange/other wallet (TRC-20!).',
          'Step 4: Dashboard → Refresh — verify USDT and TRX balance.',
          'Step 5: Send 1 USDT back to a test address — confirm in History.',
          'Step 6: Settings → Lock → Unlock with password.',
          'Step 7 (optional): npm test in project folder — automated unit tests.',
          'For ERC-20: repeat with Ethereum address (0x…) + ETH for gas.',
        ],
      },
    ] as HelpSection[],
  },
};
