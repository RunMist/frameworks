import { describe, expect, test } from 'bun:test';
import { detectFramework } from '../detect-framework';

describe('detectFramework', () => {
  test('detects TanStack Start', () => {
    expect(
      detectFramework({
        dependencies: { '@tanstack/react-start': '^1.0.0', vite: '^5.0.0' }
      })
    ).toBe('tanstack-start');
  });

  test('detects Next.js', () => {
    expect(
      detectFramework({ dependencies: { next: '^14.0.0', react: '^18.0.0' } })
    ).toBe('nextjs');
  });

  test('detects Nuxt (nuxt)', () => {
    expect(detectFramework({ dependencies: { nuxt: '^3.0.0' } })).toBe('nuxt');
  });

  test('detects Nuxt (nuxt3)', () => {
    expect(detectFramework({ dependencies: { nuxt3: '^3.0.0' } })).toBe('nuxt');
  });

  test('detects SvelteKit', () => {
    expect(
      detectFramework({ devDependencies: { '@sveltejs/kit': '^2.0.0' } })
    ).toBe('sveltekit');
  });

  test('detects Astro', () => {
    expect(detectFramework({ dependencies: { astro: '^4.0.0' } })).toBe(
      'astro'
    );
  });

  test('detects React Router (@react-router/dev)', () => {
    expect(
      detectFramework({
        dependencies: { react: '^18.0.0' },
        devDependencies: { '@react-router/dev': '^7.0.0' }
      })
    ).toBe('react-router');
  });

  test('detects React Router (@remix-run/dev)', () => {
    expect(
      detectFramework({ devDependencies: { '@remix-run/dev': '^2.0.0' } })
    ).toBe('react-router');
  });

  test('detects Nitro', () => {
    expect(detectFramework({ dependencies: { nitropack: '^2.0.0' } })).toBe(
      'nitro'
    );
  });

  test('detects Hono', () => {
    expect(detectFramework({ dependencies: { hono: '^4.0.0' } })).toBe('hono');
  });

  test('detects Elysia', () => {
    expect(detectFramework({ dependencies: { elysia: '^1.0.0' } })).toBe(
      'elysia'
    );
  });

  test('detects Express', () => {
    expect(detectFramework({ dependencies: { express: '^4.0.0' } })).toBe(
      'express'
    );
  });

  test('detects Fastify', () => {
    expect(detectFramework({ dependencies: { fastify: '^4.0.0' } })).toBe(
      'fastify'
    );
  });

  test('detects Vite (devDeps only)', () => {
    expect(
      detectFramework({
        dependencies: { react: '^18.0.0' },
        devDependencies: { vite: '^5.0.0' }
      })
    ).toBe('vite');
  });

  test('does not detect Vite from dependencies (only devDeps)', () => {
    expect(detectFramework({ dependencies: { vite: '^5.0.0' } })).toBe(null);
  });

  test('returns null for empty package.json', () => {
    expect(detectFramework({})).toBe(null);
  });

  // Priority tests
  test('TanStack Start supersedes Vite', () => {
    expect(
      detectFramework({
        dependencies: { '@tanstack/react-start': '^1.0.0' },
        devDependencies: { vite: '^5.0.0' }
      })
    ).toBe('tanstack-start');
  });

  test('Next.js supersedes Vite', () => {
    expect(
      detectFramework({
        dependencies: { next: '^14.0.0' },
        devDependencies: { vite: '^5.0.0' }
      })
    ).toBe('nextjs');
  });

  test('SvelteKit supersedes Vite', () => {
    expect(
      detectFramework({
        devDependencies: { '@sveltejs/kit': '^2.0.0', vite: '^5.0.0' }
      })
    ).toBe('sveltekit');
  });

  test('TanStack Start supersedes Nitro', () => {
    expect(
      detectFramework({
        dependencies: {
          '@tanstack/react-start': '^1.0.0',
          nitropack: '^2.0.0'
        }
      })
    ).toBe('tanstack-start');
  });

  // Real-world verification
  test('sqlite-saas runmist app detects as tanstack-start', () => {
    expect(
      detectFramework({
        dependencies: {
          '@tanstack/react-start': '~1.163.3',
          '@tanstack/react-router': '~1.163.3',
          react: '^19.2.0',
          'react-dom': '^19.2.0'
        },
        devDependencies: {
          vite: '^6.3.5',
          '@tanstack/router-plugin': '~1.163.3'
        }
      })
    ).toBe('tanstack-start');
  });

  test('sqlite-saas weatherdestination app detects as react-router', () => {
    expect(
      detectFramework({
        dependencies: {
          react: '^19.0.0',
          'react-dom': '^19.0.0',
          'react-router': '^7.0.0'
        },
        devDependencies: {
          '@react-router/dev': '^7.0.0',
          vite: '^6.0.0'
        }
      })
    ).toBe('react-router');
  });
});
