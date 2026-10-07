import { describe, expect, test } from 'bun:test';
import { analyzeRepo } from '../analyze-repo';
import { detectAdapter } from '../detect-framework';

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
