import { describe, expect, test } from 'bun:test';
import { analyzeRepo } from '../analyze-repo';
import { detectAdapter, frameworkConfigFilePaths } from '../detect-framework';

const deps = (...names: string[]) => ({
  dependencies: Object.fromEntries(names.map(n => [n, '*']))
});

describe('detectAdapter', () => {
  test('Astro without an adapter is a static site in dist/', () => {
    expect(detectAdapter('astro', deps('astro'))).toEqual({
      kind: 'static',
      outputDirectory: 'dist',
      hostAdapter: null
    });
  });

  test('Astro with the Node adapter is a web app', () => {
    expect(detectAdapter('astro', deps('astro', '@astrojs/node'))?.kind).toBe(
      'web_app'
    );
  });

  test('Astro with the Vercel adapter names it as host-only', () => {
    expect(detectAdapter('astro', deps('astro', '@astrojs/vercel'))).toEqual({
      kind: 'web_app',
      outputDirectory: null,
      hostAdapter: '@astrojs/vercel'
    });
  });

  test('SvelteKit adapter-static is a static site in build/', () => {
    expect(
      detectAdapter('sveltekit', {
        devDependencies: {
          '@sveltejs/kit': '*',
          '@sveltejs/adapter-static': '*'
        }
      })
    ).toEqual({ kind: 'static', outputDirectory: 'build', hostAdapter: null });
  });

  test('SvelteKit adapter-auto and adapter-vercel are host-only', () => {
    for (const adapter of [
      '@sveltejs/adapter-auto',
      '@sveltejs/adapter-vercel'
    ])
      expect(
        detectAdapter('sveltekit', deps('@sveltejs/kit', adapter))?.hostAdapter
      ).toBe(adapter);
  });

  test('SvelteKit adapter-node is a web app', () => {
    expect(
      detectAdapter(
        'sveltekit',
        deps('@sveltejs/kit', '@sveltejs/adapter-node')
      )
    ).toEqual({ kind: 'web_app', outputDirectory: null, hostAdapter: null });
  });

  test('frameworks without adapters have no opinion', () => {
    expect(detectAdapter('nextjs', deps('next'))).toBeNull();
    expect(detectAdapter('sveltekit', deps('@sveltejs/kit'))).toBeNull();
  });
});

describe('Next.js static export', () => {
  const next = deps('next', 'react');

  test("output: 'export' is a static site in out/", () => {
    const config = `const nextConfig = {\n  output: 'export',\n  images: { unoptimized: true }\n};\nexport default nextConfig;\n`;
    expect(detectAdapter('nextjs', next, config)).toEqual({
      kind: 'static',
      outputDirectory: 'out',
      hostAdapter: null
    });
  });

  test('distDir moves the export', () => {
    const config = `module.exports = { output: "export", distDir: "./dist" };`;
    expect(detectAdapter('nextjs', next, config)?.outputDirectory).toBe('dist');
  });

  test('a commented-out export or another output mode stays a web app', () => {
    expect(
      detectAdapter(
        'nextjs',
        next,
        `export default {\n  // output: 'export',\n};`
      )
    ).toBeNull();
    expect(
      detectAdapter('nextjs', next, `/* output: 'export' */ export default {};`)
    ).toBeNull();
    expect(
      detectAdapter('nextjs', next, `export default { output: 'standalone' };`)
    ).toBeNull();
  });

  test('config paths are the root and apps/<app>/ next.config files', () => {
    expect(
      frameworkConfigFilePaths([
        'next.config.mjs',
        'apps/web/next.config.ts',
        'apps/web/src/next.config.js',
        'packages/ui/next.config.js',
        'package.json'
      ])
    ).toEqual(['next.config.mjs', 'apps/web/next.config.ts']);
  });

  test('analyzeRepo reads each app its own config', () => {
    const result = analyzeRepo(
      [
        'package.json',
        'pnpm-workspace.yaml',
        'apps/web/package.json',
        'apps/web/next.config.ts',
        'apps/docs/package.json',
        'apps/docs/next.config.mjs'
      ],
      new Map([
        ['package.json', JSON.stringify({ private: true })],
        ['apps/web/package.json', JSON.stringify(next)],
        ['apps/docs/package.json', JSON.stringify(next)]
      ]),
      new Map(),
      undefined,
      new Map([
        ['apps/web/next.config.ts', 'export default {};'],
        ['apps/docs/next.config.mjs', "export default { output: 'export' };"]
      ])
    );
    const app = (name: string) => result.apps.find(a => a.name === name);
    expect(app('web')?.kind).toBeNull();
    expect(app('docs')).toMatchObject({
      kind: 'static',
      outputDirectory: 'out'
    });
  });
});

describe('analyzeRepo adapter fields', () => {
  test('carries the adapter result on the detected app', () => {
    const result = analyzeRepo(
      ['package.json', 'package-lock.json', 'astro.config.ts'],
      new Map([
        [
          'package.json',
          JSON.stringify(deps('astro', '@astrojs/vercel', 'react'))
        ]
      ])
    );
    expect(result.apps[0]).toMatchObject({
      framework: 'astro',
      kind: 'web_app',
      hostAdapter: '@astrojs/vercel'
    });
  });
});

describe('missingStartScript', () => {
  test('Express without a start script is flagged', () => {
    const result = analyzeRepo(
      ['package.json', 'src/index.ts'],
      new Map([['package.json', JSON.stringify(deps('express'))]])
    );
    expect(result.apps[0]?.missingStartScript).toBe(true);
  });

  test('Express with a start script, as in the Express docs, is not', () => {
    const result = analyzeRepo(
      ['package.json', 'app.js'],
      new Map([
        [
          'package.json',
          JSON.stringify({
            ...deps('express'),
            scripts: { start: 'node app.js' }
          })
        ]
      ])
    );
    expect(result.apps[0]?.missingStartScript).toBe(false);
  });

  test('frameworks whose preset runs its own server entry are never flagged', () => {
    const result = analyzeRepo(
      ['package.json'],
      new Map([['package.json', JSON.stringify(deps('next'))]])
    );
    expect(result.apps[0]?.missingStartScript).toBe(false);
  });
});
