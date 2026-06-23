import { describe, expect, test } from 'bun:test';
import { getOrmPreset, ORM_PRESETS } from './orm-presets';
import type { DeployHookId, OrmPresetId } from './types';

const VALID_HOOK_IDS: DeployHookId[] = [
  'after-install',
  'before-activate',
  'after-activate',
  'on-fail'
];

describe('ORM presets', () => {
  test('given "none" preset, when checking hooks, then has no hooks', () => {
    const preset = getOrmPreset('none');
    expect(preset).toBeDefined();
    expect(preset!.hooks).toBeUndefined();
  });

  test('given prisma preset, when checking commands, then includes PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1', () => {
    const preset = getOrmPreset('prisma');
    expect(preset).toBeDefined();
    expect(preset!.hooks).toBeDefined();
    const afterInstall = preset!.hooks!['after-install']!;
    expect(afterInstall.length).toBe(2);
    for (const cmd of afterInstall) {
      expect(cmd).toContain('PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1');
    }
  });

  test('given prisma preset, when checking commands, then runs generate before migrate', () => {
    const preset = getOrmPreset('prisma');
    const afterInstall = preset!.hooks!['after-install']!;
    expect(afterInstall[0]).toContain('prisma generate');
    expect(afterInstall[1]).toContain('prisma migrate deploy');
  });

  test('given all presets with hooks, when checking hook IDs, then all are valid', () => {
    for (const preset of ORM_PRESETS) {
      if (!preset.hooks) continue;
      for (const hookId of Object.keys(preset.hooks)) {
        expect(VALID_HOOK_IDS).toContain(hookId as DeployHookId);
      }
    }
  });

  test('given all presets with hooks, when checking commands, then all are non-empty string arrays', () => {
    for (const preset of ORM_PRESETS) {
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

  test('given prisma + bun runtime, when getting preset, then commands use bunx', () => {
    const preset = getOrmPreset('prisma', 'bun');
    const cmds = preset!.hooks!['after-install']!;
    for (const cmd of cmds) expect(cmd).toContain('bunx');
    for (const cmd of cmds) expect(cmd).not.toContain('npm exec');
  });

  test('given prisma + node runtime, when getting preset, then commands use npm exec', () => {
    const preset = getOrmPreset('prisma', 'node');
    const cmds = preset!.hooks!['after-install']!;
    for (const cmd of cmds) expect(cmd).toContain('npm exec');
    for (const cmd of cmds) expect(cmd).not.toContain('bunx');
  });

  test('given drizzle + node runtime, when getting preset, then command uses npm exec', () => {
    const preset = getOrmPreset('drizzle', 'node');
    expect(preset!.hooks!['after-install']![0]).toContain('npm exec');
  });

  test('given unknown ORM id, when calling getOrmPreset, then returns undefined', () => {
    expect(getOrmPreset('unknown-orm')).toBeUndefined();
  });

  test('given each known ORM id, when calling getOrmPreset, then returns matching preset', () => {
    const ids: OrmPresetId[] = [
      'none',
      'prisma',
      'drizzle',
      'knex',
      'typeorm',
      'mikro-orm',
      'sequelize'
    ];
    for (const id of ids) {
      const preset = getOrmPreset(id);
      expect(preset).toBeDefined();
      expect(preset!.id).toBe(id);
    }
  });
});
