/**
 * electron-builder 26 re-collects deps and re-introduces rpc-websockets' nested
 * uuid@14 (ESM-only), which breaks Electron require() via @solana/web3.js.
 * Strip it from app.asar after pack so Node resolves root uuid@9 (CJS).
 */
const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  const asarPath = path.join(context.appOutDir, 'resources', 'app.asar');
  if (!fs.existsSync(asarPath)) {
    console.warn('afterPack: app.asar not found, skip uuid patch');
    return;
  }

  const asar = require('@electron/asar');
  const tmp = path.join(context.appOutDir, 'resources', '_asar_patch');
  fs.rmSync(tmp, { recursive: true, force: true });
  asar.extractAll(asarPath, tmp);

  const nestedUuid = path.join(tmp, 'node_modules', 'rpc-websockets', 'node_modules', 'uuid');
  if (fs.existsSync(nestedUuid)) {
    fs.rmSync(nestedUuid, { recursive: true, force: true });
    console.log('afterPack: removed nested rpc-websockets/uuid (ESM) — using root uuid@9');
  } else {
    console.log('afterPack: nested rpc-websockets/uuid already absent');
  }

  const nestedNm = path.join(tmp, 'node_modules', 'rpc-websockets', 'node_modules');
  if (fs.existsSync(nestedNm) && fs.readdirSync(nestedNm).length === 0) {
    fs.rmSync(nestedNm, { recursive: true, force: true });
  }

  fs.rmSync(asarPath, { force: true });
  await asar.createPackage(tmp, asarPath);
  fs.rmSync(tmp, { recursive: true, force: true });
};
