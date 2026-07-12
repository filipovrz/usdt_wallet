/**
 * rpc-websockets bundles uuid@14 (ESM-only) which breaks Electron's require().
 * Remove nested copy so Node resolves the root uuid@9 (CommonJS-compatible).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nested = path.join(root, 'node_modules', 'rpc-websockets', 'node_modules', 'uuid');

if (fs.existsSync(nested)) {
  fs.rmSync(nested, { recursive: true, force: true });
  console.log('patch-rpc-websockets-uuid: removed nested uuid@14 (using root uuid@9)');
}
