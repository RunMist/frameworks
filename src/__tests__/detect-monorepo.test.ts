import { describe, expect, test } from 'bun:test';
import { detectMonorepo } from '../detect-monorepo';

describe('detectMonorepo', () => {
  test('detects sqlite-saas monorepo with turbo.json', () => {
    const filePaths = [
      'package.json',
      'turbo.json',
      'bun.lockb',
      'apps/runmist/package.json',
      'apps/runmist/src/index.ts',
      'apps/weatherdestination/package.json',
      'apps/weatherdestination/src/index.ts',
      'apps/placeholder1/README.md',
      'apps/placeholder2/README.md',
      'packages/deploy/package.json',
      'packages/result/package.json'
    ];

    const result = detectMonorepo(filePaths);
    expect(result.isMonorepo).toBe(true);
    expect(result.appDirs).toEqual(['runmist', 'weatherdestination']);
  });

  test('detects monorepo with pnpm-workspace.yaml', () => {
    const filePaths = [
      'package.json',
      'pnpm-workspace.yaml',
      'apps/web/package.json',
      'apps/api/package.json'
    ];

    const result = detectMonorepo(filePaths);
    expect(result.isMonorepo).toBe(true);
    expect(result.appDirs).toEqual(['web', 'api']);
  });

  test('detects monorepo with lerna.json', () => {
    const filePaths = [
      'package.json',
      'lerna.json',
      'apps/frontend/package.json'
    ];

    const result = detectMonorepo(filePaths);
    expect(result.isMonorepo).toBe(true);
    expect(result.appDirs).toEqual(['frontend']);
  });

  test('detects monorepo with nx.json', () => {
    const filePaths = [
      'package.json',
      'nx.json',
      'apps/dashboard/package.json'
    ];

    const result = detectMonorepo(filePaths);
    expect(result.isMonorepo).toBe(true);
    expect(result.appDirs).toEqual(['dashboard']);
  });

  test('returns false for single-app repo (no indicators)', () => {
    const filePaths = [
      'package.json',
      'src/index.ts',
      'tsconfig.json',
      'bun.lockb'
    ];

    const result = detectMonorepo(filePaths);
    expect(result.isMonorepo).toBe(false);
    expect(result.appDirs).toEqual([]);
  });

  test('returns false when indicator exists but no app dirs', () => {
    const filePaths = [
      'package.json',
      'turbo.json',
      'packages/utils/package.json'
    ];

    const result = detectMonorepo(filePaths);
    expect(result.isMonorepo).toBe(false);
    expect(result.appDirs).toEqual([]);
  });

  test('skips dirs without package.json', () => {
    const filePaths = [
      'package.json',
      'turbo.json',
      'apps/real-app/package.json',
      'apps/placeholder/README.md',
      'apps/another-placeholder/src/index.ts'
    ];

    const result = detectMonorepo(filePaths);
    expect(result.isMonorepo).toBe(true);
    expect(result.appDirs).toEqual(['real-app']);
  });
});
