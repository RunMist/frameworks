import type { MonorepoInfo } from './types';

const LOCKFILES = new Set([
  'bun.lockb',
  'bun.lock',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml'
]);
const SKIPPED_SEGMENT = /^(node_modules|\..+)$/;
// Bounds the package.json fetches for a repo full of examples.
const MAX_STANDALONE_APPS = 20;

/** A tree path's directory, `.` for the repo root. */
export const dirOf = (path: string) => {
  const slash = path.lastIndexOf('/');
  return slash < 0 ? '.' : path.slice(0, slash);
};

/**
 * Apps nested in the repo with their own package.json and lockfile, like
 * vercel/next-learn's `dashboard/final-example`. The deploy installs an
 * app from its nearest lockfile, so these install on their own; a
 * workspace package never has a lockfile of its own.
 */
export function standaloneAppDirs(filePaths: string[]): string[] {
  const files = new Set(filePaths);
  const dirs = new Set<string>();
  for (const path of filePaths) {
    const dir = dirOf(path);
    if (dir === '.' || !LOCKFILES.has(path.slice(dir.length + 1))) continue;
    if (dir.split('/').some(segment => SKIPPED_SEGMENT.test(segment))) continue;
    if (files.has(`${dir}/package.json`)) dirs.add(dir);
  }
  return [...dirs].sort().slice(0, MAX_STANDALONE_APPS);
}

/**
 * The App Path a user typed, as a tree dir, when it has a package.json:
 * detection reads it like a standalone app even when nothing else would
 * list it (no lockfile of its own, not under `apps/`). Null otherwise.
 */
export function typedAppDir(
  filePaths: string[],
  appPath?: string
): string | null {
  const dir = (appPath ?? '')
    .trim()
    .replace(/^\.\/+/, '')
    .replace(/\/+$/, '');
  if (!dir || dir === '.') return null;
  if (dir.split('/').some(s => s === '..' || SKIPPED_SEGMENT.test(s)))
    return null;
  return filePaths.includes(`${dir}/package.json`) ? dir : null;
}

/**
 * Every dir analyzeRepo reads an app from: the root, `apps/<app>`, the
 * standalone app dirs and the typed App Path.
 */
export function appDirs(filePaths: string[], appPath?: string): Set<string> {
  const dirs = new Set(['.']);
  for (const path of filePaths) {
    const match = APP_DIR_PATTERN.exec(path);
    if (match?.[1]) dirs.add(`apps/${match[1]}`);
  }
  for (const dir of standaloneAppDirs(filePaths)) dirs.add(dir);
  const typed = typedAppDir(filePaths, appPath);
  if (typed) dirs.add(typed);
  return dirs;
}

const MONOREPO_INDICATORS = [
  'pnpm-workspace.yaml',
  'turbo.json',
  'lerna.json',
  'nx.json'
];

const APP_DIR_PATTERN = /^apps\/([^/]+)\/package\.json$/;

export function detectMonorepo(filePaths: string[]): MonorepoInfo {
  const hasIndicator = filePaths.some(p => MONOREPO_INDICATORS.includes(p));

  // Also check for workspaces in root package.json (handled by caller via packageJsonContents)
  // Here we just detect via file-based indicators

  const appDirs: string[] = [];
  for (const fp of filePaths) {
    const match = APP_DIR_PATTERN.exec(fp);
    if (match?.[1]) {
      appDirs.push(match[1]);
    }
  }

  return {
    isMonorepo: hasIndicator && appDirs.length > 0,
    appDirs
  };
}
