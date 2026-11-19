// Copies the Python (Pyodide) and TypeScript compiler runtimes from node_modules
// into public/ so the judge works offline and does not depend on a CDN.
// Runs automatically before `dev` and `build` (see package.json).
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pyodideSrc = join(root, 'node_modules', 'pyodide');
const tsSrc = join(root, 'node_modules', 'typescript-judge', 'lib', 'typescript.js');
const pyodideDest = join(root, 'public', 'pyodide');
const vendorDest = join(root, 'public', 'vendor');

const PYODIDE_FILES = [
  'pyodide.js',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
];

if (!existsSync(pyodideSrc) || !existsSync(tsSrc)) {
  console.error('Judge runtimes missing. Run `npm install` first.');
  process.exit(1);
}

mkdirSync(pyodideDest, { recursive: true });
mkdirSync(vendorDest, { recursive: true });

for (const file of PYODIDE_FILES) {
  cpSync(join(pyodideSrc, file), join(pyodideDest, file));
}
cpSync(tsSrc, join(vendorDest, 'typescript.js'));

// Record the versions so a stale copy is easy to spot.
const pyVersion = JSON.parse(readFileSync(join(pyodideSrc, 'package.json'), 'utf8')).version;
writeFileSync(join(root, 'public', 'judge-runtimes.json'), JSON.stringify({ pyodide: pyVersion, typescript: '5.9.2' }, null, 2) + '\n');
console.log(`Judge runtimes copied (Pyodide ${pyVersion}, TypeScript 5.9.2).`);
