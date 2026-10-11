import { describe, expect, test } from 'bun:test';
import { analyzeRepo, detectionFilePaths } from '../analyze-repo';
import { standaloneAppDirs } from '../detect-monorepo';

/**
 * Apps nested with their own package.json and lockfile (tutorial and
 * example repos). vercel/next-learn: the root is a lint/prettier package
 * with a `next` dep and no build script, the deployable apps sit in
 * dashboard/final-example and friends, each with its own pnpm-lock.yaml.
 */

const nextApp = JSON.stringify({
  scripts: { build: 'next build', start: 'next start' },
  dependencies: { next: '16.0.10', react: '19.2.1' }
});

const nextLearnTree = [
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'basics/demo/package.json',
  'dashboard/final-example/package.json',
  'dashboard/final-example/pnpm-lock.yaml',
  'dashboard/final-example/next.config.ts',
  'dashboard/starter-example/package.json',
  'dashboard/starter-example/pnpm-lock.yaml'
];

const nextLearnContents = () =>
  new Map([
    [
      'package.json',
      JSON.stringify({
        scripts: { lint: 'eslint .', start: 'next start' },
        dependencies: { next: '^14.0.0' },
        engines: { node: '>=18.17.0' }
      })
    ],
    ['dashboard/final-example/package.json', nextApp],
    ['dashboard/starter-example/package.json', nextApp]
  ]);

describe('standaloneAppDirs', () => {
  test('dirs with their own package.json and lockfile', () => {
    expect(standaloneAppDirs(nextLearnTree)).toEqual([
      'dashboard/final-example',
      'dashboard/starter-example'
    ]);
  });

  test('skips node_modules, hidden dirs and a lockfile without package.json', () => {
    expect(
      standaloneAppDirs([
        'node_modules/x/package.json',
        'node_modules/x/package-lock.json',
        '.github/tool/package.json',
        '.github/tool/package-lock.json',
        'scripts/yarn.lock'
      ])
    ).toEqual([]);
  });
});

describe('analyzeRepo with standalone apps', () => {
  test('lists nested apps and drops a tooling root without a build', () => {
    const result = analyzeRepo(nextLearnTree, nextLearnContents());
    expect(result.isMonorepo).toBe(false);
    expect(result.rootFramework).toBe('nextjs');
    expect(result.apps.map(app => [app.name, app.path])).toEqual([
      ['final-example', 'dashboard/final-example'],
      ['starter-example', 'dashboard/starter-example']
    ]);
    expect(result.apps[0]?.framework).toBe('nextjs');
    // Pins are searched nearest first, up to the root's engines.
    expect(result.apps[0]?.nodePin?.raw).toBe('>=18.17.0');
  });

  test('keeps a root that builds', () => {
    const contents = nextLearnContents();
    contents.set('package.json', nextApp);
    const result = analyzeRepo(nextLearnTree, contents);
    expect(result.apps.map(app => app.path)).toEqual([
      '.',
      'dashboard/final-example',
      'dashboard/starter-example'
    ]);
  });

  test('keeps an API root, which runs without a build', () => {
    const result = analyzeRepo(
      [
        'package.json',
        'package-lock.json',
        'client/package.json',
        'client/package-lock.json'
      ],
      new Map([
        [
          'package.json',
          JSON.stringify({
            scripts: { start: 'node app.js' },
            dependencies: { express: '^5.0.0' }
          })
        ],
        ['client/package.json', nextApp]
      ])
    );
    expect(result.apps.map(app => app.path)).toEqual(['.', 'client']);
  });

  test('skips a nested dir with no framework', () => {
    const result = analyzeRepo(
      [
        'package.json',
        'tools/lint/package.json',
        'tools/lint/package-lock.json'
      ],
      new Map([
        ['package.json', nextApp],
        ['tools/lint/package.json', JSON.stringify({ name: 'lint' })]
      ])
    );
    expect(result.apps.map(app => app.path)).toEqual(['.']);
  });

  test('adds nested apps to a monorepo without duplicates', () => {
    const result = analyzeRepo(
      [
        'package.json',
        'turbo.json',
        'pnpm-lock.yaml',
        'apps/web/package.json',
        'apps/web/pnpm-lock.yaml',
        'examples/blog/package.json',
        'examples/blog/package-lock.json'
      ],
      new Map([
        ['package.json', JSON.stringify({ name: 'mono' })],
        ['apps/web/package.json', nextApp],
        ['examples/blog/package.json', nextApp]
      ])
    );
    expect(result.isMonorepo).toBe(true);
    expect(result.apps.map(app => app.path)).toEqual([
      'apps/web',
      'examples/blog'
    ]);
  });
});

describe('detectionFilePaths', () => {
  test('package.json and pins in each app dir and its parents', () => {
    const paths = detectionFilePaths([
      ...nextLearnTree,
      '.nvmrc',
      'dashboard/.nvmrc',
      'basics/demo/.nvmrc',
      'apps/web/package.json',
      'apps/web/.node-version',
      'packages/ui/package.json'
    ]);
    expect(paths.packageJsons).toEqual([
      'package.json',
      'dashboard/final-example/package.json',
      'dashboard/starter-example/package.json',
      'apps/web/package.json'
    ]);
    expect(paths.pinFiles).toEqual([
      '.nvmrc',
      'dashboard/.nvmrc',
      'apps/web/.node-version'
    ]);
    expect(paths.configFiles).toEqual([
      'dashboard/final-example/next.config.ts'
    ]);
  });
});
