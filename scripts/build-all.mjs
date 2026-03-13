import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const frontendDir = path.join(root, 'frontend');
const frontendDistDir = path.join(frontendDir, 'dist');
const publicDir = path.join(root, 'public');

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('npx', ['tsc', '-p', 'tsconfig.json']);
run('npm', ['ci'], frontendDir);
run('npm', ['run', 'build'], frontendDir);

rmSync(publicDir, { recursive: true, force: true });
mkdirSync(publicDir, { recursive: true });

if (!existsSync(frontendDistDir)) {
  console.error('frontend/dist was not produced');
  process.exit(1);
}

cpSync(frontendDistDir, publicDir, { recursive: true });
