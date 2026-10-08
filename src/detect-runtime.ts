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

// Oldest pnpm major that reads each lockfile format. Older majors fail a
// frozen install with ERR_PNPM_LOCKFILE_BREAKING_CHANGE.
const PNPM_MIN_MAJOR_FOR_LOCKFILE: Record<string, number> = {
  '9.0': 9,
  '6.1': 8,
  '6.0': 8,
  '5.4': 7,
  '5.3': 6
};

export type PnpmLockfileMismatch = {
  /** The `packageManager` pin, e.g. `pnpm@8.15.6`. */
  pinned: string;
  lockfileVersion: string;
  /** Oldest pnpm major that reads this lockfile. */
  minMajor: number;
};

/**
 * A `packageManager` pnpm pin too old to read the repo's lockfile. Corepack
 * runs the pinned pnpm, so the install fails; Vercel picks pnpm from the
 * lockfile instead, which is why such repos deploy there.
 *
 * @param packageManager - Root package.json's `packageManager` field
 * @param pnpmLockfile - Contents of `pnpm-lock.yaml` (the first line is enough)
 */
export function detectPnpmLockfileMismatch(
  packageManager: unknown,
  pnpmLockfile: string
): PnpmLockfileMismatch | null {
  if (typeof packageManager !== 'string') return null;
  const pin = /^pnpm@(\d+)\./.exec(packageManager);
  const lockfileVersion = /^lockfileVersion:\s*['"]?([\d.]+)/m.exec(
    pnpmLockfile
  )?.[1];
  if (!pin || !lockfileVersion) return null;
  const minMajor = PNPM_MIN_MAJOR_FOR_LOCKFILE[lockfileVersion];
  if (!minMajor || Number(pin[1]) >= minMajor) return null;
  return { pinned: packageManager.split('+')[0]!, lockfileVersion, minMajor };
}
