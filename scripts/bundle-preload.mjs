/**
 * Bundle preload into a single CJS file so sandboxed Electron can load it
 * (relative imports like ../shared/ipc fail in sandbox preload context).
 */
import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await esbuild.build({
  entryPoints: [path.join(root, 'src/preload/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: path.join(root, 'dist-electron/preload/index.js'),
  external: ['electron'],
  sourcemap: true,
  logLevel: 'info',
});

console.log('Preload bundled → dist-electron/preload/index.js');
