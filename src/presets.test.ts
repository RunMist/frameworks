import { describe, expect, test } from 'bun:test';
import { FRAMEWORK_PRESETS, getPreset } from './presets';
import type { DeployHookId } from './types';

const VALID_HOOK_IDS: DeployHookId[] = [
  'after-install',
  'before-activate',
  'after-activate',
  'on-fail'
];

describe('framework presets', () => {
  test('given all presets, when checking hooks, then none have ORM-specific hooks', () => {
    for (const preset of FRAMEWORK_PRESETS) {
      expect(preset.hooks).toBeUndefined();
    }
  });

  test('given all presets with hooks, when checking hook IDs, then all are valid', () => {
    for (const preset of FRAMEWORK_PRESETS) {
      if (!preset.hooks) continue;
      for (const hookId of Object.keys(preset.hooks)) {
        expect(VALID_HOOK_IDS).toContain(hookId as DeployHookId);
      }
    }
  });

  test('given all presets with hooks, when checking commands, then all are non-empty string arrays', () => {
    for (const preset of FRAMEWORK_PRESETS) {
      if (!preset.hooks) continue;
      for (const [, commands] of Object.entries(preset.hooks)) {
        expect(Array.isArray(commands)).toBe(true);
        expect(commands!.length).toBeGreaterThan(0);
        for (const cmd of commands!) {
          expect(typeof cmd).toBe('string');
          expect(cmd.length).toBeGreaterThan(0);
        }
      }
    }
  });

  test('given react-router preset, when checking, then has no hooks', () => {
    const preset = getPreset('react-router');
    expect(preset).toBeDefined();
    expect(preset!.hooks).toBeUndefined();
  });

  test('given tanstack-start preset, when checking, then has no hooks', () => {
    const tanstack = getPreset('tanstack-start');
    expect(tanstack).toBeDefined();
    expect(tanstack!.hooks).toBeUndefined();
  });

  // Regression: current (1.168.x+) TanStack Start dropped the Nitro
  // requirement, so it no longer builds to .output/* by default - it
  // builds to dist/client via plain Vite SSR, same as this repo and the
  // official tanstack.com site. See docs/runmist/tanstack-start-deploy-targets.md.
  test('given tanstack-start preset, when checking output directory, then matches current (non-Nitro) Vite SSR build, not the old Nitro .output convention', () => {
    const tanstack = getPreset('tanstack-start');
    expect(tanstack!.outputDirectory).toBe('dist/client');
    expect(tanstack!.outputDirectory).not.toContain('.output');
  });

  // No universal startCommand is possible for self-hosted targets on
  // current TanStack Start - every project writes its own thin Fetch-API
  // server wrapper. This asserts the preset documents that rather than
  // silently defaulting to a value that's wrong as often as right.
  test('given tanstack-start preset, when checking start command, then flags it as project-specific rather than asserting a runnable default', () => {
    const tanstack = getPreset('tanstack-start');
    expect(tanstack!.startCommand).toContain('verify');
  });

  test('given nextjs preset, when checking cacheDirs, then includes its real incremental-build cache', () => {
    const nextjs = getPreset('nextjs');
    expect(nextjs!.cacheDirs).toEqual(['.next/cache']);
  });

  test('given vite preset, when checking cacheDirs, then includes its dep-prebundle cache', () => {
    const vite = getPreset('vite');
    expect(vite!.cacheDirs).toEqual(['node_modules/.vite']);
  });

  test('given presets with no verified incremental-build cache, when checking cacheDirs, then left unset rather than guessed', () => {
    for (const id of [
      'tanstack-start',
      'nitro',
      'react-router',
      'nuxt',
      'sveltekit',
      'astro',
      'hono',
      'elysia',
      'express',
      'fastify',
      'other'
    ]) {
      const preset = getPreset(id);
      expect(preset!.cacheDirs).toBeUndefined();
    }
  });
});
