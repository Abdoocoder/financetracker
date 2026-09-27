#!/usr/bin/env node
// E2E Dev Server Wrapper
// Copies .env.e2e to .env.local before starting Next.js, restores on exit

import { copyFileSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const ENV_LOCAL = resolve(ROOT, '.env.local');
const ENV_E2E = resolve(ROOT, '.env.e2e');
const ENV_BACKUP = resolve(ROOT, '.env.local.e2e-backup');

function main() {
  // Backup existing .env.local
  if (existsSync(ENV_LOCAL)) {
    copyFileSync(ENV_LOCAL, ENV_BACKUP);
    console.log('[e2e-dev-server] Backed up .env.local');
  }

  // Copy .env.e2e to .env.local
  if (existsSync(ENV_E2E)) {
    copyFileSync(ENV_E2E, ENV_LOCAL);
    console.log('[e2e-dev-server] Applied .env.e2e as .env.local');
  } else {
    console.error('[e2e-dev-server] .env.e2e not found!');
    process.exit(1);
  }

  // Start Next.js dev server
  const child = spawn('npx', ['next', 'dev', '--webpack'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });

  // Handle shutdown
  const cleanup = () => {
    console.log('\n[e2e-dev-server] Shutting down...');
    child.kill('SIGTERM');
    
    // Restore original .env.local
    if (existsSync(ENV_BACKUP)) {
      copyFileSync(ENV_BACKUP, ENV_LOCAL);
      console.log('[e2e-dev-server] Restored .env.local');
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  child.on('exit', (code) => {
    cleanup();
    process.exit(code ?? 0);
  });
}

main();
