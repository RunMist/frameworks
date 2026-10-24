import { getPreset } from './presets';

const LOCKFILE_MAP: Record<string, 'bun' | 'npm' | 'yarn' | 'pnpm'> = {
  'bun.lockb': 'bun',
  'bun.lock': 'bun',
  'package-lock.json': 'npm',
  'yarn.lock': 'yarn',
  'pnpm-lock.yaml': 'pnpm'
};

const BUN_ONLY_FRAMEWORKS = new Set(['elysia']);

/**
 * Detect the runtime for an app: the framework preset's runtime, except a
 * Bun preset whose app installs with npm, yarn or pnpm and doesn't declare
 * `engines.bun` runs on Node. Regression 2026-10-24: runtime was the preset
 * alone, so a TanStack Start app with only a package-lock.json was deployed
 * on Bun. A bun lockfile never moves a Node preset to Bun: Next.js and
 * friends commonly install with Bun and still run on Node.
 *
 * @param appPath - The app's dir; its lockfile wins over the repo root's.
 * @param packageJson - The app's parsed package.json, for `engines.bun`.
 */
export function detectRuntime(
  detectedFramework: string | null,
  filePaths: string[],
  appPath = '.',
  packageJson?: Record<string, unknown> | null
): 'bun' | 'node' | null {
  if (!detectedFramework) return null;
  const presetRuntime = getPreset(detectedFramework)?.runtime ?? null;
  if (presetRuntime !== 'bun') return presetRuntime;
  // Built on Bun's own APIs: no lockfile makes it a Node app.
  if (BUN_ONLY_FRAMEWORKS.has(detectedFramework)) return 'bun';
  const engines = packageJson?.engines as Record<string, unknown> | undefined;
  if (engines?.bun) return 'bun';
  const lockfile = appLockfileManager(filePaths, appPath);
  return lockfile && lockfile !== 'bun' ? 'node' : 'bun';
}

// The app dir's own lockfile, else the repo root's (a workspace lockfile).
const appLockfileManager = (
  filePaths: string[],
  appPath: string
): 'bun' | 'npm' | 'yarn' | 'pnpm' | null => {
  const prefix = appPath === '.' || appPath === '' ? '' : `${appPath}/`;
  const inDir = (dir: string) => {
    for (const [name, pm] of Object.entries(LOCKFILE_MAP))
      if (filePaths.includes(`${dir}${name}`)) return pm;
    return null;
  };
  return (prefix ? inDir(prefix) : null) ?? inDir('');
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
