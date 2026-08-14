import {spawn} from 'node:child_process';
import {watch} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const designSystemRoot = join(root, '..', 'Joker-DS');

function run(command, args, {cwd = root} = {}) {
  return spawn(command, args, {
    cwd,
    env: {...process.env, FORCE_COLOR: '1'},
    shell: false,
    stdio: 'inherit',
  });
}

function runDesignSystemCssCopy() {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['scripts/copy-css-modules.mjs'], {
      cwd: designSystemRoot,
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`copy-css-modules exited with code ${code ?? 'unknown'}`));
    });
  });
}

let cssCopyQueued = false;

function queueDesignSystemCssCopy() {
  if (cssCopyQueued) {
    return;
  }

  cssCopyQueued = true;

  setTimeout(async () => {
    cssCopyQueued = false;

    try {
      await runDesignSystemCssCopy();
    } catch (error) {
      console.error('[design-system] Failed to copy CSS assets:', error.message);
    }
  }, 80);
}

await runDesignSystemCssCopy();

const designSystemBuild = run('npx', [
  'tsc',
  '-p',
  'tsconfig.json',
  '--watch',
  '--preserveWatchOutput',
], {cwd: designSystemRoot});

for (const directory of [
  join(designSystemRoot, 'src', 'components'),
  join(designSystemRoot, 'src', 'styles'),
]) {
  watch(directory, {recursive: true}, (_eventType, filename) => {
    if (filename?.endsWith('.css')) {
      queueDesignSystemCssCopy();
    }
  });
}

const appDev = run(process.execPath, [
  join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
  '--host',
  '0.0.0.0',
  '--port',
  '5173',
], {cwd: root, env: {...process.env, NODE_OPTIONS: '--preserve-symlinks'}});

function shutdown() {
  designSystemBuild.kill('SIGTERM');
  appDev.kill('SIGTERM');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
