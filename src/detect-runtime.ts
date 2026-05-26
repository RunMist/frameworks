import { getPreset } from './presets';

/**
 * Detect the runtime for a given framework.
 * Uses the framework preset's default runtime.
 */
export function detectRuntime(
  detectedFramework: string | null,
  _filePaths: string[]
): 'bun' | 'node' | null {
  if (!detectedFramework) return null;
  const preset = getPreset(detectedFramework);
  return preset?.runtime ?? null;
}

const LOCKFILE_MAP: Record<string, 'bun' | 'npm' | 'yarn' | 'pnpm'> = {
  'bun.lockb': 'bun',
  'bun.lock': 'bun',
  'package-lock.json': 'npm',
  'yarn.lock': 'yarn',
  'pnpm-lock.yaml': 'pnpm'
};

/**
 * Detect the package manager from lockfiles in the file tree.
 * Checks root-level lockfiles only.
 */
export function detectPackageManager(
  filePaths: string[]
): 'bun' | 'npm' | 'yarn' | 'pnpm' | null {
  for (const fp of filePaths) {
    const pm = LOCKFILE_MAP[fp];
    if (pm) return pm;
  }
  return null;
}
