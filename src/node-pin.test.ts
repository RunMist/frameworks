import { describe, expect, test } from 'bun:test';
import {
  explicitNodeMajor,
  findNodePin,
  type NodePinSource,
  nodePinFilePaths,
  pinSearchDirs,
  rangeAllowsMajor,
  resolveNodePin,
  resolveNodeRuntime
} from './node-pin';
import { NODE_RELEASE_SNAPSHOT } from './node-releases';

const lines = NODE_RELEASE_SNAPSHOT;
const TODAY = '2026-10-04';
const reader = (files: Record<string, string>) => (path: string) => files[path];

// Pin files -> expected major and source. @runmist/deploy runs the same
// resolver on the server, so this table is the contract for both.
const FIXTURES: Array<{
  name: string;
  files: Record<string, string>;
  appPath?: string;
  major: number;
  source: NodePinSource | 'default';
}> = [
  {
    name: 'pinkfeelings: .nvmrc 12.2.0 beats engines 12.x',
    files: {
      '.nvmrc': '12.2.0\n',
      'package.json': JSON.stringify({ engines: { node: '12.x' } })
    },
    major: 12,
    source: '.nvmrc'
  },
  {
    name: '.nvmrc with v prefix',
    files: { '.nvmrc': 'v18' },
    major: 18,
    source: '.nvmrc'
  },
  {
    name: '.nvmrc lts/*',
    files: { '.nvmrc': 'lts/*' },
    major: 24,
    source: '.nvmrc'
  },
  {
    name: '.nvmrc lts/erbium',
    files: { '.nvmrc': 'lts/erbium' },
    major: 12,
    source: '.nvmrc'
  },
  {
    name: '.nvmrc comment line',
    files: { '.nvmrc': '# pinned\n20.11.1' },
    major: 20,
    source: '.nvmrc'
  },
  {
    name: '.node-version',
    files: { '.node-version': '22.4.0' },
    major: 22,
    source: '.node-version'
  },
  {
    name: '.tool-versions nodejs',
    files: { '.tool-versions': 'ruby 3.3.0\nnodejs 16.20.2 18.0.0\n' },
    major: 16,
    source: '.tool-versions'
  },
  {
    name: 'mise.toml string',
    files: { 'mise.toml': '[env]\nnode = "x"\n[tools]\nnode = "20"\n' },
    major: 20,
    source: 'mise.toml'
  },
  {
    name: 'mise.toml table',
    files: { 'mise.toml': '[tools]\nnode = { version = "14" }\n' },
    major: 14,
    source: 'mise.toml'
  },
  {
    name: 'volta beats engines',
    files: {
      'package.json': JSON.stringify({
        volta: { node: '16.20.2' },
        engines: { node: '>=18' }
      })
    },
    major: 16,
    source: 'volta.node'
  },
  {
    name: 'engines >=18 picks newest supported LTS, not 18',
    files: { 'package.json': JSON.stringify({ engines: { node: '>=18' } }) },
    major: 24,
    source: 'engines.node'
  },
  {
    name: 'engines ^14.17',
    files: {
      'package.json': JSON.stringify({ engines: { node: '^14.17.0' } })
    },
    major: 14,
    source: 'engines.node'
  },
  {
    name: 'engines >=12 <15 picks the LTS line 14 over 13',
    files: {
      'package.json': JSON.stringify({ engines: { node: '>=12 <15' } })
    },
    major: 14,
    source: 'engines.node'
  },
  {
    name: 'engines 18 || 20 || 22 prefers the supported line',
    files: {
      'package.json': JSON.stringify({ engines: { node: '18 || 20 || 22' } })
    },
    major: 22,
    source: 'engines.node'
  },
  {
    name: 'monorepo app dir .nvmrc beats root',
    files: { '.nvmrc': '20', 'apps/web/.nvmrc': '22' },
    appPath: 'apps/web',
    major: 22,
    source: '.nvmrc'
  },
  {
    name: 'monorepo falls back to root .nvmrc',
    files: { '.nvmrc': '20', 'apps/web/package.json': '{}' },
    appPath: 'apps/web',
    major: 20,
    source: '.nvmrc'
  },
  {
    name: 'no pin uses the recommended line',
    files: { 'package.json': '{}' },
    major: 24,
    source: 'default'
  },
  {
    name: 'unreadable pin falls back',
    files: { '.nvmrc': 'system' },
    major: 24,
    source: 'default'
  }
];

describe('pin fixtures (shared contract with @runmist/deploy)', () => {
  for (const fixture of FIXTURES) {
    test(fixture.name, () => {
      const pin = findNodePin(reader(fixture.files), fixture.appPath);
      const resolved = resolveNodeRuntime({
        setting: 'auto',
        pin,
        lines,
        today: TODAY
      });
      expect(resolved.major).toBe(fixture.major);
      expect(resolved.source).toBe(fixture.source);
    });
  }
});

describe('findNodePin', () => {
  test('reports the file path of the pin', () => {
    const pin = findNodePin(reader({ 'apps/web/.nvmrc': '22' }), 'apps/web');
    expect(pin).toEqual({
      source: '.nvmrc',
      path: 'apps/web/.nvmrc',
      raw: '22'
    });
  });

  test('empty .nvmrc is skipped, next source wins', () => {
    const pin = findNodePin(
      reader({
        '.nvmrc': '\n',
        'package.json': JSON.stringify({ engines: { node: '20.x' } })
      })
    );
    expect(pin?.source).toBe('engines.node');
  });

  test('invalid package.json is ignored', () => {
    expect(findNodePin(reader({ 'package.json': '{nope' }))).toBeNull();
  });

  test('search dirs go from the app up to the root', () => {
    expect(pinSearchDirs('.')).toEqual(['.']);
    expect(pinSearchDirs('apps/web')).toEqual(['apps/web', 'apps', '.']);
    expect(pinSearchDirs('./apps/web/')).toEqual(['apps/web', 'apps', '.']);
  });
});

describe('rangeAllowsMajor', () => {
  const cases: Array<[string, number, boolean]> = [
    ['>=18', 17, false],
    ['>=18', 18, true],
    ['>18', 18, false],
    ['>18.0.0', 18, true],
    ['<18', 17, true],
    ['<18', 18, false],
    ['<=18', 18, true],
    ['^14.17.0', 14, true],
    ['^14.17.0', 15, false],
    ['~16.4', 16, true],
    ['12.x', 12, true],
    ['12.x', 13, false],
    ['*', 4, true],
    ['14 - 16', 16, true],
    ['14 - 16', 17, false],
    ['>= 14 < 16', 15, true],
    ['>= 14 < 16', 16, false],
    ['10 || 12', 12, true],
    ['10 || 12', 11, false]
  ];
  for (const [range, major, allowed] of cases) {
    test(`${range} ${allowed ? 'allows' : 'rejects'} ${major}`, () => {
      expect(rangeAllowsMajor(range, major)).toBe(allowed);
    });
  }
});

describe('resolveNodePin', () => {
  test('lts/* follows the recommendation across the 26 LTS flip', () => {
    expect(resolveNodePin('lts/*', lines, '2026-10-27')).toBe(24);
    expect(resolveNodePin('lts/*', lines, '2026-10-28')).toBe(26);
  });

  test('unknown codename and garbage are null', () => {
    expect(resolveNodePin('lts/nope', lines, TODAY)).toBeNull();
    expect(resolveNodePin('banana', lines, TODAY)).toBeNull();
  });
});

describe('resolveNodeRuntime', () => {
  const pin = { source: '.nvmrc' as const, path: '.nvmrc', raw: '12.2.0' };

  test('auto uses the pin, resolved to the newest patch of its line', () => {
    const r = resolveNodeRuntime({ setting: 'auto', pin, lines, today: TODAY });
    expect(r).toMatchObject({
      major: 12,
      version: '12.22.12',
      source: '.nvmrc',
      status: 'eol',
      pinUnresolved: false
    });
  });

  test('an explicit setting overrides the pin and keeps it for display', () => {
    const r = resolveNodeRuntime({ setting: '24.x', pin, lines, today: TODAY });
    expect(r).toMatchObject({
      major: 24,
      version: '24.21.0',
      source: 'setting',
      status: 'active_lts'
    });
    expect(r.pin).toEqual(pin);
  });

  test('empty or legacy-missing setting means auto', () => {
    expect(
      resolveNodeRuntime({ setting: '', pin, lines, today: TODAY }).source
    ).toBe('.nvmrc');
    expect(
      resolveNodeRuntime({ setting: null, pin: null, lines, today: TODAY })
        .major
    ).toBe(24);
  });

  test('unresolvable pin falls back to the recommendation and says so', () => {
    const r = resolveNodeRuntime({
      setting: 'auto',
      pin: { ...pin, raw: 'banana' },
      lines,
      today: TODAY
    });
    expect(r).toMatchObject({
      major: 24,
      source: 'default',
      pinUnresolved: true
    });
  });

  test('a major older than any known line is eol, a future one has no version', () => {
    expect(
      resolveNodeRuntime({ setting: '3.x', pin: null, lines, today: TODAY })
        .status
    ).toBe('eol');
    const future = resolveNodeRuntime({
      setting: '40.x',
      pin: null,
      lines,
      today: TODAY
    });
    expect(future.version).toBeNull();
  });

  test('explicitNodeMajor parses settings', () => {
    expect(explicitNodeMajor('24.x')).toBe(24);
    expect(explicitNodeMajor('12')).toBe(12);
    expect(explicitNodeMajor('auto')).toBeNull();
    expect(explicitNodeMajor(undefined)).toBeNull();
  });
});

describe('nodePinFilePaths', () => {
  test('keeps pin files at any depth, drops everything else', () => {
    expect(
      nodePinFilePaths([
        '.nvmrc',
        'apps/web/.node-version',
        'mise.toml',
        'package.json',
        'src/index.ts',
        'notes.nvmrc.md'
      ])
    ).toEqual(['.nvmrc', 'apps/web/.node-version', 'mise.toml']);
  });
});
