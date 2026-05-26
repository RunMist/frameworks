import { describe, expect, test } from 'bun:test';
import { analyzeRepo } from '../analyze-repo';

describe('analyzeRepo', () => {
  test('detects sqlite-saas monorepo with 2 deployable apps', () => {
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

    const packageJsonContents = new Map<string, string>();
    packageJsonContents.set(
      'package.json',
      JSON.stringify({
        name: '@sqlite-saas/monorepo',
        workspaces: ['apps/*', 'packages/*']
      })
    );
    packageJsonContents.set(
      'apps/runmist/package.json',
      JSON.stringify({
        name: '@sqlite-saas/runmist',
        dependencies: {
          '@tanstack/react-start': '~1.163.3',
          react: '^19.2.0'
        },
        devDependencies: { vite: '^6.3.5' }
      })
    );
    packageJsonContents.set(
      'apps/weatherdestination/package.json',
      JSON.stringify({
        name: 'weatherdestination',
        dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
        devDependencies: {
          '@react-router/dev': '^7.0.0',
          vite: '^6.0.0'
        }
      })
    );

    const result = analyzeRepo(filePaths, packageJsonContents);

    expect(result.isMonorepo).toBe(true);
    expect(result.packageManager).toBe('bun');
    expect(result.apps).toHaveLength(2);

    const runmist = result.apps.find(a => a.name === 'runmist');
    expect(runmist).toBeDefined();
    expect(runmist!.framework).toBe('tanstack-start');
    expect(runmist!.runtime).toBe('bun');
    expect(runmist!.path).toBe('apps/runmist');
    expect(runmist!.orm).toBe('none');

    const weather = result.apps.find(a => a.name === 'weatherdestination');
    expect(weather).toBeDefined();
    expect(weather!.framework).toBe('react-router');
    expect(weather!.runtime).toBe('node');
    expect(weather!.path).toBe('apps/weatherdestination');
    expect(weather!.orm).toBe('none');
  });

  test('detects single-app repo', () => {
    const filePaths = [
      'package.json',
      'src/index.ts',
      'tsconfig.json',
      'package-lock.json'
    ];

    const packageJsonContents = new Map<string, string>();
    packageJsonContents.set(
      'package.json',
      JSON.stringify({
        name: 'my-app',
        dependencies: { next: '^14.0.0', react: '^18.0.0' }
      })
    );

    const result = analyzeRepo(filePaths, packageJsonContents);

    expect(result.isMonorepo).toBe(false);
    expect(result.packageManager).toBe('npm');
    expect(result.rootFramework).toBe('nextjs');
    expect(result.rootRuntime).toBe('node');
    expect(result.apps).toHaveLength(1);
    expect(result.apps[0]!.framework).toBe('nextjs');
    expect(result.apps[0]!.path).toBe('.');
    expect(result.apps[0]!.orm).toBe('none');
  });

  test('handles repo with no detectable framework', () => {
    const filePaths = ['package.json', 'src/index.ts', 'yarn.lock'];

    const packageJsonContents = new Map<string, string>();
    packageJsonContents.set(
      'package.json',
      JSON.stringify({
        name: 'my-lib',
        dependencies: { lodash: '^4.0.0' }
      })
    );

    const result = analyzeRepo(filePaths, packageJsonContents);

    expect(result.isMonorepo).toBe(false);
    expect(result.packageManager).toBe('yarn');
    expect(result.rootFramework).toBe(null);
    expect(result.apps).toHaveLength(0);
  });

  test('skips apps with invalid package.json', () => {
    const filePaths = [
      'package.json',
      'turbo.json',
      'bun.lockb',
      'apps/valid/package.json',
      'apps/invalid/package.json'
    ];

    const packageJsonContents = new Map<string, string>();
    packageJsonContents.set(
      'package.json',
      JSON.stringify({ name: 'monorepo', workspaces: ['apps/*'] })
    );
    packageJsonContents.set(
      'apps/valid/package.json',
      JSON.stringify({
        name: 'valid-app',
        dependencies: { hono: '^4.0.0' }
      })
    );
    packageJsonContents.set('apps/invalid/package.json', 'not valid json{{{');

    const result = analyzeRepo(filePaths, packageJsonContents);

    expect(result.isMonorepo).toBe(true);
    expect(result.apps).toHaveLength(1);
    expect(result.apps[0]!.name).toBe('valid');
    expect(result.apps[0]!.framework).toBe('hono');
  });

  test('skips app dirs with no package.json content', () => {
    const filePaths = [
      'package.json',
      'turbo.json',
      'apps/has-content/package.json',
      'apps/no-content/package.json'
    ];

    const packageJsonContents = new Map<string, string>();
    packageJsonContents.set(
      'package.json',
      JSON.stringify({ name: 'monorepo' })
    );
    packageJsonContents.set(
      'apps/has-content/package.json',
      JSON.stringify({
        name: 'app',
        dependencies: { express: '^4.0.0' }
      })
    );
    // no-content's package.json is not in the map

    const result = analyzeRepo(filePaths, packageJsonContents);

    expect(result.isMonorepo).toBe(true);
    expect(result.apps).toHaveLength(1);
    expect(result.apps[0]!.name).toBe('has-content');
  });

  test('detects prisma ORM in single-app repo', () => {
    const filePaths = ['package.json', 'prisma/schema.prisma', 'bun.lockb'];
    const packageJsonContents = new Map<string, string>();
    packageJsonContents.set(
      'package.json',
      JSON.stringify({
        name: 'my-app',
        dependencies: {
          '@prisma/client': '^7.0.0',
          prisma: '^7.0.0',
          hono: '^4.0.0'
        }
      })
    );

    const result = analyzeRepo(filePaths, packageJsonContents);

    expect(result.isMonorepo).toBe(false);
    expect(result.apps).toHaveLength(1);
    expect(result.apps[0]!.orm).toBe('prisma');
    expect(result.apps[0]!.framework).toBe('hono');
  });

  test('detects drizzle ORM in monorepo app', () => {
    const filePaths = [
      'package.json',
      'turbo.json',
      'bun.lockb',
      'apps/api/package.json'
    ];
    const packageJsonContents = new Map<string, string>();
    packageJsonContents.set(
      'package.json',
      JSON.stringify({ name: 'monorepo', workspaces: ['apps/*'] })
    );
    packageJsonContents.set(
      'apps/api/package.json',
      JSON.stringify({
        name: 'api',
        dependencies: { hono: '^4.0.0', 'drizzle-orm': '^0.30.0' }
      })
    );

    const result = analyzeRepo(filePaths, packageJsonContents);

    expect(result.isMonorepo).toBe(true);
    expect(result.apps[0]!.orm).toBe('drizzle');
  });

  test('orm is none when no ORM deps present', () => {
    const filePaths = ['package.json', 'bun.lockb'];
    const packageJsonContents = new Map<string, string>();
    packageJsonContents.set(
      'package.json',
      JSON.stringify({
        name: 'my-app',
        dependencies: { hono: '^4.0.0' }
      })
    );

    const result = analyzeRepo(filePaths, packageJsonContents);

    expect(result.apps[0]!.orm).toBe('none');
  });

  // Real-world: weatherdestination standalone repo
  test('detects weatherdestination standalone repo with prisma', () => {
    const filePaths = [
      'package.json',
      'bun.lockb',
      'app/root.tsx',
      'prisma/schema.prisma'
    ];
    const packageJsonContents = new Map<string, string>();
    packageJsonContents.set(
      'package.json',
      JSON.stringify({
        name: '@sqlite-saas/weatherdestination',
        dependencies: {
          '@prisma/adapter-libsql': '^7.4.0',
          '@prisma/client': '^7.4.0',
          '@prisma/instrumentation': '^7.4.0',
          prisma: '^7.4.0',
          'react-router': '^7.13.0'
        },
        devDependencies: { '@react-router/dev': '^7.13.0' }
      })
    );

    const result = analyzeRepo(filePaths, packageJsonContents);

    expect(result.isMonorepo).toBe(false);
    expect(result.apps[0]!.framework).toBe('react-router');
    expect(result.apps[0]!.orm).toBe('prisma');
    expect(result.apps[0]!.path).toBe('.');
  });
});
