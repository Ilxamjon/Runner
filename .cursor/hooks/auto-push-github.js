#!/usr/bin/env node
/**
 * Cursor stop hook: commit local changes (if any) and push to origin/main.
 * Skips secrets via .gitignore. Never force-pushes.
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function sh(cmd) {
  return execSync(cmd, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  }).trim();
}

function trySh(cmd) {
  try {
    return { ok: true, out: sh(cmd) };
  } catch (err) {
    return {
      ok: false,
      out: `${err.stdout || ''}${err.stderr || err.message || ''}`.trim(),
    };
  }
}

// Drain stdin (Cursor sends hook payload JSON)
try {
  fs.readFileSync(0, 'utf8');
} catch {
  // ignore
}

const root = process.cwd();
if (!fs.existsSync(path.join(root, '.git'))) {
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

const status = trySh('git status --porcelain');
if (!status.ok) {
  process.stdout.write(
    JSON.stringify({
      followup_message: `GitHub sync skipped: ${status.out}`,
    }),
  );
  process.exit(0);
}

if (status.out) {
  const add = trySh('git add -A');
  if (!add.ok) {
    process.stdout.write(
      JSON.stringify({
        followup_message: `GitHub sync: git add failed — ${add.out}`,
      }),
    );
    process.exit(0);
  }

  // Re-check after add (everything may be ignored)
  const staged = trySh('git status --porcelain');
  if (staged.ok && staged.out) {
    const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const msg = `chore: auto-sync ${stamp}`;
    const commit = spawnSync('git', ['commit', '-m', msg], {
      encoding: 'utf8',
      windowsHide: true,
    });
    if (commit.status !== 0) {
      process.stdout.write(
        JSON.stringify({
          followup_message: `GitHub sync: commit failed — ${commit.stderr || commit.stdout}`,
        }),
      );
      process.exit(0);
    }
  }
}

const branch = trySh('git rev-parse --abbrev-ref HEAD');
const current = branch.ok ? branch.out : 'main';

const ahead = trySh('git rev-list --count @{u}..HEAD');
const needsPush =
  !ahead.ok || // no upstream yet
  (ahead.ok && Number(ahead.out) > 0);

if (!needsPush && !status.out) {
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

const push = spawnSync(
  'git',
  ['-c', 'http.version=HTTP/1.1', 'push', '-u', 'origin', current],
  { encoding: 'utf8', windowsHide: true },
);

if (push.status !== 0) {
  process.stdout.write(
    JSON.stringify({
      followup_message: `GitHub sync: push failed — ${(push.stderr || push.stdout || '').trim()}`,
    }),
  );
  process.exit(0);
}

process.stdout.write(
  JSON.stringify({
    followup_message: `GitHub yangilandi: https://github.com/Ilxamjon/Runner (branch ${current})`,
  }),
);
process.exit(0);
