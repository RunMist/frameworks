import { describe, expect, test } from 'bun:test';
import { MONOREPO_CACHE_DIRS, resolveCacheDirs } from './cache-dirs';
import { getPreset } from './presets';

describe('resolveCacheDirs', () => {
  test('given a preset with cacheDirs and no monorepo info, when resolving, then returns only the framework cacheDirs', () => {
    const preset = getPreset('nextjs');
    const result = resolveCacheDirs(preset);
    expect(result.appRelative).toEqual(['.next/cache']);
    expect(result.repoRootRelative).toEqual([]);
  });

  test('given a preset with cacheDirs and monorepo info, when resolving, then returns both lists', () => {
    const preset = getPreset('nextjs');
    const result = resolveCacheDirs(preset, {
      isMonorepo: true,
      appDirs: ['apps/web']
    });
    expect(result.appRelative).toEqual(['.next/cache']);
    expect(result.repoRootRelative).toEqual(MONOREPO_CACHE_DIRS);
  });

  test('given a preset with no cacheDirs, when resolving, then appRelative is empty', () => {
    const preset = getPreset('react-router');
    const result = resolveCacheDirs(preset);
    expect(result.appRelative).toEqual([]);
  });

  test('given no preset, when resolving, then appRelative is empty', () => {
    const result = resolveCacheDirs(undefined);
    expect(result.appRelative).toEqual([]);
    expect(result.repoRootRelative).toEqual([]);
  });

  test('given monorepo info with isMonorepo false, when resolving, then repoRootRelative is empty', () => {
    const preset = getPreset('nextjs');
    const result = resolveCacheDirs(preset, { isMonorepo: false, appDirs: [] });
    expect(result.repoRootRelative).toEqual([]);
  });
});
