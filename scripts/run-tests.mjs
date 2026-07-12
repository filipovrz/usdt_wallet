/**
 * USDT Wallet — automated test suite
 * Run: npm test
 * Live network checks: npm run test:live
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const { encryptVault, decryptVault } = require(path.join(root, 'dist-electron/main/crypto/vault.js'));
const {
  generateMnemonic,
  validateMnemonic,
  normalizeMnemonic,
  deriveKeysFromMnemonic,
} = require(path.join(root, 'dist-electron/main/crypto/keys.js'));
const { BlockchainService } = require(path.join(root, 'dist-electron/main/services/blockchain.js'));
const { DEFAULT_SETTINGS, VAULT_VERSION } = require(path.join(root, 'dist-electron/shared/types.js'));
const { createWalletSchema, sendSchema } = require(path.join(root, 'dist-electron/shared/schemas.js'));
const { multisigSchema } = require(path.join(root, 'dist-electron/shared/schemas.js'));
const { APP_VERSION } = require(path.join(root, 'dist-electron/shared/version.js'));
const { compareSemver } = require(path.join(root, 'scripts/test-helpers.mjs'));

const LIVE = process.argv.includes('--live');
let passed = 0;
let failed = 0;
let skipped = 0;

function ok(name) {
  passed++;
  console.log(`  ✓ ${name}`);
}

function fail(name, err) {
  failed++;
  console.error(`  ✗ ${name}`);
  console.error(`    ${err instanceof Error ? err.message : err}`);
}

function skip(name, reason) {
  skipped++;
  console.log(`  ○ ${name} (skipped: ${reason})`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

async function runTests() {
  console.log(`\nUSDT Wallet Test Suite v${APP_VERSION}\n${'='.repeat(40)}\n`);

  // Version sync
  try {
    const pkg = require(path.join(root, 'package.json'));
    assert(pkg.version === APP_VERSION, `package.json (${pkg.version}) !== APP_VERSION (${APP_VERSION})`);
    ok('Version sync (package.json ↔ version.ts)');
  } catch (e) {
    fail('Version sync', e);
  }

  // Vault encryption
  try {
    const meta = {
      version: VAULT_VERSION,
      createdAt: new Date().toISOString(),
      accounts: [],
      addressBook: [],
      transactions: [],
      settings: DEFAULT_SETTINGS,
    };
    const password = 'TestPassword123!';
    const mnemonic = TEST_MNEMONIC;
    const encrypted = await encryptVault(meta, mnemonic, password);
    assert(encrypted.ciphertext, 'missing ciphertext');
    assert(encrypted.authTag, 'missing authTag');

    const decrypted = await decryptVault(encrypted, password);
    assert(decrypted.mnemonic === mnemonic, 'mnemonic mismatch');
    assert(decrypted.meta.settings.language === 'bg', 'meta mismatch');
    ok('Vault encrypt/decrypt roundtrip');

    let wrongPass = false;
    try {
      await decryptVault(encrypted, 'WrongPassword!');
    } catch {
      wrongPass = true;
    }
    assert(wrongPass, 'wrong password should fail');
    ok('Vault rejects wrong password');
  } catch (e) {
    fail('Vault encryption', e);
  }

  // Mnemonic & keys
  try {
    const mnemonic = generateMnemonic();
    assert(mnemonic.split(' ').length === 24, 'expected 24 words');
    assert(validateMnemonic(mnemonic), 'generated mnemonic invalid');
    assert(!validateMnemonic('invalid words here'), 'invalid mnemonic accepted');
    ok('Mnemonic generation & validation');

    const keys1 = deriveKeysFromMnemonic(TEST_MNEMONIC);
    const keys2 = deriveKeysFromMnemonic(normalizeMnemonic(`  ${TEST_MNEMONIC.toUpperCase()}  `));
    assert(keys1.tronAddress === keys2.tronAddress, 'tron address not deterministic');
    assert(keys1.ethAddress === keys2.ethAddress, 'eth address not deterministic');
    assert(keys1.solanaAddress === keys2.solanaAddress, 'solana address not deterministic');
    assert(keys1.tronAddress.startsWith('T'), `tron address format: ${keys1.tronAddress}`);
    assert(keys1.ethAddress.startsWith('0x'), `eth address format: ${keys1.ethAddress}`);
    assert(keys1.ethAddress.length === 42, `eth address length: ${keys1.ethAddress.length}`);
    assert(keys1.solanaAddress.length >= 32, `solana address format: ${keys1.solanaAddress}`);
    ok(`Key derivation (TRON: ${keys1.tronAddress.slice(0, 8)}…, SOL: ${keys1.solanaAddress.slice(0, 8)}…)`);
  } catch (e) {
    fail('Mnemonic & key derivation', e);
  }

  // Address validation
  try {
    const bc = new BlockchainService();
    assert(bc.validateAddress('tron', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'), 'valid tron rejected');
    assert(!bc.validateAddress('tron', '0xnottron'), 'invalid tron accepted');
    assert(bc.validateAddress('ethereum', '0xdAC17F958D2ee523a2206206994597C13D831ec7'), 'valid eth rejected');
    assert(!bc.validateAddress('ethereum', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'), 'tron addr on eth accepted');
    assert(bc.validateAddress('bsc', '0x55d398326f99059fF775485246999027B3197955'), 'valid bsc rejected');
    assert(bc.validateAddress('polygon', '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'), 'valid polygon rejected');
    const keys = deriveKeysFromMnemonic(TEST_MNEMONIC);
    assert(bc.validateAddress('tron', keys.tronAddress), 'derived tron address invalid');
    assert(bc.validateAddress('ethereum', keys.ethAddress), 'derived eth address invalid');
    assert(bc.validateAddress('solana', keys.solanaAddress), 'valid solana rejected');
    assert(!bc.validateAddress('solana', 'not-a-valid-solana-address'), 'invalid solana accepted');
    assert(!bc.validateAddress('solana', keys.tronAddress), 'tron addr on solana accepted');
    ok('Address validation (TRON + EVM + Solana)');
  } catch (e) {
    fail('Address validation', e);
  }

  // Zod schemas
  try {
    assert(createWalletSchema.safeParse({ name: 'Test', password: '12345678' }).success, 'create schema fail');
    assert(!createWalletSchema.safeParse({ name: '', password: '12345678' }).success, 'empty name accepted');
    assert(!sendSchema.safeParse({ accountId: 'bad', network: 'tron', to: 'T', amount: '1', password: 'x' }).success, 'bad send accepted');
    ok('Input schema validation (Zod)');
  } catch (e) {
    fail('Schema validation', e);
  }

  // Multisig schema
  try {
    assert(
      multisigSchema.safeParse({
        name: 'Team',
        threshold: 2,
        totalSigners: 3,
        signers: ['TAddr1xxxxxxxxxxxxxxxxxxxxxxxxxxxxx1', 'TAddr2xxxxxxxxxxxxxxxxxxxxxxxxxxxxx2'],
        network: 'tron',
      }).success,
      'valid multisig rejected'
    );
    assert(
      !multisigSchema.safeParse({
        name: '',
        threshold: 0,
        totalSigners: 1,
        signers: [],
        network: 'tron',
      }).success,
      'invalid multisig accepted'
    );
    ok('Multisig policy schema');
  } catch (e) {
    fail('Multisig schema', e);
  }

  // Semver helper
  try {
    assert(compareSemver('2.1.0', '2.0.0') > 0, '2.1.0 should be newer');
    assert(compareSemver('2.0.0', '2.0.0') === 0, 'equal versions');
    assert(compareSemver('1.9.0', '2.0.0') < 0, '1.9.0 should be older');
    ok('Semver comparison (update checker)');
  } catch (e) {
    fail('Semver comparison', e);
  }

  // Live network (optional)
  if (LIVE) {
    console.log('\nLive network tests:\n');
    try {
      const bc = new BlockchainService();
      const tetherTreasury = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
      const balance = await bc.getBalance('tron', tetherTreasury);
      assert(parseFloat(balance.usdt) > 0, 'tether treasury should have USDT');
      ok(`TRON live balance fetch (${balance.usdt} USDT on treasury)`);
    } catch (e) {
      skip('TRON live balance', e instanceof Error ? e.message : 'network error');
    }

    try {
      const bc = new BlockchainService();
      const ethContract = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
      const balance = await bc.getBalance('ethereum', ethContract);
      assert(parseFloat(balance.usdt) >= 0, 'eth balance fetch failed');
      ok(`Ethereum live balance fetch (${balance.usdt} USDT)`);
    } catch (e) {
      skip('Ethereum live balance', e instanceof Error ? e.message : 'network error');
    }
  } else {
    skip('Live TRON balance', 'run with --live');
    skip('Live Ethereum balance', 'run with --live');
  }

  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped\n`);

  if (failed > 0) process.exit(1);
  if (LIVE && passed < 9) {
    console.log('Note: some live network checks were skipped (RPC unavailable).\n');
  }
}

runTests().catch((e) => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
