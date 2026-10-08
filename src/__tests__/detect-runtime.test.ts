import { describe, expect, test } from 'bun:test';
import {
  detectPackageManager,
  detectPnpmLockfileMismatch,
  detectRuntime
} from '../detect-runtime';

describe('detectRuntime', () => {
  test('returns bun for tanstack-start', () => {
    expect(detectRuntime('tanstack-start', [])).toBe('bun');
  });

  test('returns node for react-router', () => {
    expect(detectRuntime('react-router', [])).toBe('node');
  });

  test('returns node for nextjs', () => {
    expect(detectRuntime('nextjs', [])).toBe('node');
  });

  test('returns bun for vite', () => {
    expect(detectRuntime('vite', [])).toBe('bun');
  });

  test('returns bun for hono', () => {
    expect(detectRuntime('hono', [])).toBe('bun');
  });

  test('returns bun for elysia', () => {
    expect(detectRuntime('elysia', [])).toBe('bun');
  });

  test('returns node for express', () => {
    expect(detectRuntime('express', [])).toBe('node');
  });

  test('returns null for null framework', () => {
    expect(detectRuntime(null, [])).toBe(null);
  });

  test('returns null for unknown framework', () => {
    expect(detectRuntime('unknown-framework', [])).toBe(null);
  });
});

describe('detectPackageManager', () => {
  test('detects bun from bun.lockb', () => {
    expect(detectPackageManager(['package.json', 'bun.lockb'])).toBe('bun');
  });

  test('detects bun from bun.lock', () => {
    expect(detectPackageManager(['package.json', 'bun.lock'])).toBe('bun');
  });

  test('detects npm from package-lock.json', () => {
    expect(detectPackageManager(['package.json', 'package-lock.json'])).toBe(
      'npm'
    );
  });

  test('detects yarn from yarn.lock', () => {
    expect(detectPackageManager(['package.json', 'yarn.lock'])).toBe('yarn');
  });

  test('detects pnpm from pnpm-lock.yaml', () => {
    expect(detectPackageManager(['package.json', 'pnpm-lock.yaml'])).toBe(
      'pnpm'
    );
  });

  test('returns null when no lockfile found', () => {
    expect(detectPackageManager(['package.json', 'src/index.ts'])).toBe(null);
  });
});

describe('detectPnpmLockfileMismatch', () => {
  test('flags a pnpm 8 pin with a v9 lockfile (turborepo examples/basic)', () => {
    expect(
      detectPnpmLockfileMismatch(
        'pnpm@8.15.6',
        "lockfileVersion: '9.0'\n\nsettings:\n"
      )
    ).toEqual({ pinned: 'pnpm@8.15.6', lockfileVersion: '9.0', minMajor: 9 });
  });

  test('strips the corepack hash from the pin', () => {
    expect(
      detectPnpmLockfileMismatch(
        'pnpm@7.33.0+sha512.abc',
        "lockfileVersion: '6.0'"
      )?.pinned
    ).toBe('pnpm@7.33.0');
  });

  test('a pin new enough for the lockfile is fine', () => {
    expect(
      detectPnpmLockfileMismatch('pnpm@9.15.9', "lockfileVersion: '9.0'")
    ).toBeNull();
    expect(
      detectPnpmLockfileMismatch('pnpm@10.0.0', "lockfileVersion: '6.0'")
    ).toBeNull();
  });

  test('no pnpm pin, unknown or unquoted lockfile version', () => {
    expect(
      detectPnpmLockfileMismatch(undefined, "lockfileVersion: '9.0'")
    ).toBeNull();
    expect(
      detectPnpmLockfileMismatch('yarn@1.22.22', "lockfileVersion: '9.0'")
    ).toBeNull();
    expect(
      detectPnpmLockfileMismatch('pnpm@8.0.0', 'lockfileVersion: 5.2')
    ).toBeNull();
    expect(
      detectPnpmLockfileMismatch('pnpm@8.0.0', 'lockfileVersion: 9.0')?.minMajor
    ).toBe(9);
  });
});
