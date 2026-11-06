import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

export default function setup() {
  const url =
    process.env.TEST_DATABASE_URL ?? 'postgresql://folio:folio@localhost:5433/folio_test';
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
