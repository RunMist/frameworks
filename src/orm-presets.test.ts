import { describe, expect, test } from 'bun:test';
import {
  getOrmPreset,
  ORM_PRESETS,
  ormHooksToRecord,
  regenerateOrmHooksForOrmChange,
  regenerateOrmHooksForRuntime
} from './orm-presets';
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

describe('ormHooksToRecord', () => {
  test('given a preset with hooks, when converting, then joins commands with newlines', () => {
    const preset = getOrmPreset('prisma', 'bun');
    const record = ormHooksToRecord(preset);
    expect(record['after-install']).toContain('\n');
  });

  test('given a preset with no hooks, when converting, then returns empty record', () => {
    const preset = getOrmPreset('none');
    expect(ormHooksToRecord(preset)).toEqual({});
  });

  test('given undefined preset, when converting, then returns empty record', () => {
    expect(ormHooksToRecord(undefined)).toEqual({});
  });
});

describe('regenerateOrmHooksForRuntime', () => {
  test('given hooks that still match the old runtime preset, when runtime changes, then regenerates for the new runtime', () => {
    const oldHooks = ormHooksToRecord(getOrmPreset('drizzle', 'node'));
    const result = regenerateOrmHooksForRuntime(
      'drizzle',
      'node',
      'bun',
      oldHooks
    );
    expect(result).toEqual(ormHooksToRecord(getOrmPreset('drizzle', 'bun')));
    // bun runtime uses drizzle-orm/bun-sqlite's own migrator, not the
    // drizzle-kit CLI (which needs a driver like better-sqlite3 that a
    // bun:sqlite app doesn't have installed) - see makePresets's drizzle comment.
    expect(result!['after-install']).toContain('bun scripts/migrate.ts');
  });

  test('given hooks that were hand-edited (no longer match the old preset), when runtime changes, then does not overwrite them', () => {
    const handEdited = { 'after-install': 'echo custom migration step' };
    const result = regenerateOrmHooksForRuntime(
      'drizzle',
      'node',
      'bun',
      handEdited
    );
    expect(result).toBeNull();
  });

  test('given orm is "none", when runtime changes, then returns null', () => {
    const result = regenerateOrmHooksForRuntime('none', 'node', 'bun', {});
    expect(result).toBeNull();
  });
});

describe('regenerateOrmHooksForOrmChange', () => {
  // Regression test for a real production bug: warpkit.dev's deploy kept
  // running the stock `bunx drizzle-kit migrate` hook after the user hand-
  // edited it to `bun scripts/migrate.ts` and saved. Root cause: Radix
  // Select's onValueChange fires even on a no-op reselect of the item
  // that's already selected, and the app's onOrmChange handler regenerated
  // hooks unconditionally, silently reverting the hand edit back to the
  // ORM preset default.
  test('given the ORM selector reselects the same ORM, when nothing actually changed, then returns null and preserves hand-edited hooks', () => {
    const result = regenerateOrmHooksForOrmChange('drizzle', 'drizzle', 'bun');
    expect(result).toBeNull();
  });

  test('given the ORM actually changes, when regenerating, then returns the new ORM preset hooks', () => {
    const result = regenerateOrmHooksForOrmChange('drizzle', 'prisma', 'bun');
    expect(result).toEqual(ormHooksToRecord(getOrmPreset('prisma', 'bun')));
  });

  test('given the ORM changes to "none", when regenerating, then returns an empty record', () => {
    const result = regenerateOrmHooksForOrmChange('drizzle', 'none', 'bun');
    expect(result).toEqual({});
  });

  test('given "none" reselects "none" (no ORM ever chosen), when nothing changed, then returns null', () => {
    const result = regenerateOrmHooksForOrmChange('none', 'none', 'bun');
    expect(result).toBeNull();
  });
});
