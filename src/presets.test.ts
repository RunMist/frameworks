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
});
