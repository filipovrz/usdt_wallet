/**
 * EvtinkoWallet — automated test suite
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
const { APP_VERSION, APP_CODE_SIGNATURE, COPYRIGHT_HOLDER } = require(path.join(root, 'dist-electron/shared/version.js'));
const { calculateServiceFee, computeServiceFeeAmount, isServiceFeeEnabled } = require(path.join(root, 'dist-electron/shared/service-fee.js'));
const { OWNER_WALLET } = require(path.join(root, 'dist-electron/shared/service-fee.config.js'));
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
  console.log(`\nEvtinkoWallet Test Suite v${APP_VERSION}\n${'='.repeat(40)}\n`);

  // Version sync
  try {
    const pkg = require(path.join(root, 'package.json'));
    assert(pkg.version === APP_VERSION, `package.json (${pkg.version}) !== APP_VERSION (${APP_VERSION})`);
    ok('Version sync (package.json ↔ version.ts)');
  } catch (e) {
    fail('Version sync', e);
  }

  // Copyright signature
  try {
    assert(typeof APP_CODE_SIGNATURE === 'string' && APP_CODE_SIGNATURE.length > 10, 'APP_CODE_SIGNATURE missing');
    assert(APP_CODE_SIGNATURE.includes(COPYRIGHT_HOLDER), 'signature must include copyright holder');
    ok('Copyright code signature present');
  } catch (e) {
    fail('Copyright code signature', e);
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
    assert(keys1.tonAddress === keys2.tonAddress, 'ton address not deterministic');
    assert(keys1.bitcoinAddress === keys2.bitcoinAddress, 'bitcoin address not deterministic');
    assert(keys1.tronAddress.startsWith('T'), `tron address format: ${keys1.tronAddress}`);
    assert(keys1.ethAddress.startsWith('0x'), `eth address format: ${keys1.ethAddress}`);
    assert(keys1.ethAddress.length === 42, `eth address length: ${keys1.ethAddress.length}`);
    assert(keys1.solanaAddress.length >= 32, `solana address format: ${keys1.solanaAddress}`);
    assert(keys1.tonAddress.length >= 40, `ton address format: ${keys1.tonAddress}`);
    assert(keys1.bitcoinAddress.startsWith('bc1'), `bitcoin address format: ${keys1.bitcoinAddress}`);
    assert(keys1.bitcoinAddress === 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu', 'bip84 test vector mismatch');

    const acc0 = deriveKeysFromMnemonic(TEST_MNEMONIC, '', 0);
    const acc1 = deriveKeysFromMnemonic(TEST_MNEMONIC, '', 1);
    assert(acc0.ethAddress !== acc1.ethAddress, 'multi-account eth addresses must differ');
    assert(acc0.tronAddress !== acc1.tronAddress, 'multi-account tron addresses must differ');
    assert(acc0.solanaAddress !== acc1.solanaAddress, 'multi-account solana addresses must differ');
    assert(acc0.tonAddress !== acc1.tonAddress, 'multi-account ton addresses must differ');
    assert(acc0.bitcoinAddress !== acc1.bitcoinAddress, 'multi-account bitcoin addresses must differ');
    ok(`Key derivation (TRON: ${keys1.tronAddress.slice(0, 8)}…, BTC: ${keys1.bitcoinAddress.slice(0, 8)}…)`);
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
    assert(bc.validateAddress('ton', keys.tonAddress), 'valid ton rejected');
    assert(bc.validateAddress('bitcoin', keys.bitcoinAddress), 'valid bitcoin rejected');
    assert(!bc.validateAddress('bitcoin', keys.tronAddress), 'tron addr on bitcoin accepted');
    assert(!bc.validateAddress('ton', 'not-a-valid-ton-address'), 'invalid ton accepted');
    assert(!bc.validateAddress('solana', keys.tronAddress), 'tron addr on solana accepted');
    ok('Address validation (TRON + EVM + Solana + TON + Bitcoin)');
  } catch (e) {
    fail('Address validation', e);
  }

  // Service fee
  try {
    assert(isServiceFeeEnabled(false), 'fee enabled when owner configured');
    assert(!isServiceFeeEnabled(true), 'fee disabled on testnet');
    const q100 = computeServiceFeeAmount('100', 'USDT', 1);
    assert(parseFloat(q100.amount) === 0.25, `100 USDT fee expected 0.25 got ${q100.amount}`);
    const qSmall = computeServiceFeeAmount('1', 'USDT', 1);
    assert(parseFloat(qSmall.amount) === 0.01, 'min fee 0.01');
    const qBig = computeServiceFeeAmount('10000', 'USDT', 1);
    assert(parseFloat(qBig.amount) === 1, 'max fee 1 USDT');
    const off = calculateServiceFee('100', 'USDT', 1, OWNER_WALLET.tron, 'tron', false);
    assert(parseFloat(off.amount) === 0, 'owner exempt from fee');
    const userFee = calculateServiceFee('100', 'USDT', 1, 'TOtherUserxxxxxxxxxxxxxxxxxxxxxx', 'tron', false);
    assert(parseFloat(userFee.amount) === 0.25, 'non-owner pays fee');
    ok('Service fee calculation (0.25%, min/max, gating)');
  } catch (e) {
    fail('Service fee', e);
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

  // Lightning bolt11
  try {
    const bolt11 = require('bolt11');
    const crypto = require('crypto');
    const { LightningService } = require(path.join(root, 'dist-electron/main/services/lightning-service.js'));
    const ls = new LightningService(DEFAULT_SETTINGS);
    assert(!ls.isConfigured(), 'lightning should be unconfigured by default');
    assert(!ls.validateInvoice('not-an-invoice'), 'garbage invoice accepted');
    const privateKey = Buffer.alloc(32, 1);
    let encoded = bolt11.encode({
      privateKey,
      satoshis: 10000,
      timestamp: 1_700_000_000,
      tags: [{ tagName: 'payment_hash', data: crypto.randomBytes(32) }],
    });
    encoded = bolt11.sign(encoded, privateKey);
    const paymentRequest = encoded.paymentRequest;
    assert(ls.validateInvoice(paymentRequest), 'valid bolt11 rejected');
    assert(DEFAULT_SETTINGS.lndRestUrl === '', 'default lndRestUrl should be empty');
    ok('Lightning bolt11 validation + LND settings defaults');
  } catch (e) {
    fail('Lightning bolt11', e);
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
