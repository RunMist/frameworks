import {
  detectAdapter,
  detectFramework,
  frameworkConfigFilePaths,
  missingStartScript
} from './detect-framework';
import {
  appDirs,
  detectMonorepo,
  dirOf,
  standaloneAppDirs
} from './detect-monorepo';
import { detectOrm } from './detect-orm';
import {
  detectPackageManager,
  detectPnpmLockfileMismatch,
  detectRuntime
} from './detect-runtime';
import {
  findNodePin,
  type NodePin,
  nodePinFilePaths,
  pinSearchDirs
} from './node-pin';
import { getPreset } from './presets';
import type { DetectedApp, RepoDetectionResult } from './types';

const adapterFields = (
  framework: string | null,
  packageJson: Record<string, unknown>,
  nextConfig: string | null
): Pick<
  DetectedApp,
  'kind' | 'outputDirectory' | 'hostAdapter' | 'missingStartScript'
> => {
  const adapter = detectAdapter(framework, packageJson, nextConfig);
  return {
    kind: adapter?.kind ?? null,
    outputDirectory: adapter?.outputDirectory ?? null,
    hostAdapter: adapter?.hostAdapter ?? null,
    missingStartScript: missingStartScript(
      framework ? getPreset(framework)?.startCommand : null,
      packageJson as { scripts?: Record<string, string> }
    )
  };
};

/**
 * Analyze a repository's file tree and package.json contents to detect
 * monorepo structure, frameworks, and runtimes.
 *
 * @param filePaths - All file paths in the repo (from git tree API)
 * @param packageJsonContents - Map of file path to parsed package.json content string
 * @param pinFileContents - Map of file path to content for Node pin files
 *   (`.nvmrc`, `.node-version`, `.tool-versions`, `mise.toml`, `.mise.toml`;
 *   see `nodePinFilePaths`). Omit to skip pin detection.
 * @param pnpmLockfile - Root `pnpm-lock.yaml` contents (the first line is
 *   enough). Only needed when the root pins `packageManager` to pnpm; omit
 *   to skip the pin/lockfile check.
 * @param configFileContents - Map of file path to content for framework
 *   config files (see `frameworkConfigFilePaths`). Omit to skip config
 *   detection (a Next.js static export is then detected as a web app).
 */
export function analyzeRepo(
  filePaths: string[],
  packageJsonContents: Map<string, string>,
  pinFileContents: Map<string, string> = new Map(),
  pnpmLockfile?: string,
  configFileContents: Map<string, string> = new Map()
): RepoDetectionResult {
  const readFile = (path: string) =>
    pinFileContents.get(path) ?? packageJsonContents.get(path);
  const nodePinFor = (appPath: string): NodePin | null =>
    findNodePin(readFile, appPath);
  const configPaths = frameworkConfigFilePaths(filePaths);
  const nextConfigFor = (appPath: string): string | null => {
    const prefix = appPath === '.' ? '' : `${appPath}/`;
    const path = configPaths.find(
      p => p.startsWith(prefix) && !p.slice(prefix.length).includes('/')
    );
    return (path && configFileContents.get(path)) ?? null;
  };
  const packageManager = detectPackageManager(filePaths);
  const monorepo = detectMonorepo(filePaths);
  const parse = (path: string): Record<string, unknown> | null => {
    try {
      return JSON.parse(packageJsonContents.get(path) ?? '');
    } catch {
      return null;
    }
  };
  const appAt = (
    path: string,
    name: string,
    parsed: Record<string, unknown>
  ): DetectedApp => {
    const framework = detectFramework(parsed);
    return {
      name,
      path,
      framework,
      runtime: detectRuntime(framework, filePaths),
      orm: detectOrm(parsed),
      nodePin: nodePinFor(path),
      ...adapterFields(framework, parsed, nextConfigFor(path))
    };
  };

  const rootParsed = parse('package.json');
  const rootFramework = rootParsed ? detectFramework(rootParsed) : null;
  const rootRuntime = rootParsed
    ? detectRuntime(rootFramework, filePaths)
    : null;

  const pnpmLockfileMismatch =
    pnpmLockfile === undefined
      ? null
      : detectPnpmLockfileMismatch(rootParsed?.packageManager, pnpmLockfile);

  // Apps nested with their own lockfile (tutorial and example repos).
  // Only ones with a framework: a lockfile-carrying tool dir isn't an app.
  const nestedApps = standaloneAppDirs(filePaths).flatMap(dir => {
    const parsed = parse(`${dir}/package.json`);
    if (!parsed) return [];
    const app = appAt(dir, dir.split('/').pop() ?? dir, parsed);
    return app.framework ? [app] : [];
  });

  if (!monorepo.isMonorepo) {
    // A root next to nested apps that has no build script is the repo's
    // tooling (next-learn's root: lint and prettier, a `next` dep, no
    // app), not an app. An API framework runs without a build.
    const rootScripts = rootParsed?.scripts as
      | Record<string, string>
      | undefined;
    const rootIsTooling =
      nestedApps.length > 0 &&
      !rootScripts?.build &&
      getPreset(rootFramework ?? '')?.kind !== 'api';
    const apps: DetectedApp[] = [];
    if (rootParsed && rootFramework && !rootIsTooling)
      apps.push(appAt('.', '.', rootParsed));
    apps.push(...nestedApps);
    return {
      isMonorepo: false,
      apps,
      rootFramework,
      rootRuntime,
      rootNodePin: nodePinFor('.'),
      packageManager,
      pnpmLockfileMismatch
    };
  }

  // Monorepo: analyze each app directory
  const apps: DetectedApp[] = [];
  for (const appDir of monorepo.appDirs) {
    const parsed = parse(`apps/${appDir}/package.json`);
    if (parsed) apps.push(appAt(`apps/${appDir}`, appDir, parsed));
  }
  for (const app of nestedApps)
    if (!apps.some(listed => listed.path === app.path)) apps.push(app);

  return {
    isMonorepo: true,
    apps,
    rootFramework,
    rootRuntime,
    rootNodePin: nodePinFor('.'),
    packageManager,
    pnpmLockfileMismatch
  };
}

/**
 * The tree paths a caller fetches for analyzeRepo: package.json and Node
 * pin files in each app dir and its parents (pins are searched nearest
 * first, see `pinSearchDirs`), and the apps' framework configs.
 */
export function detectionFilePaths(filePaths: string[]) {
  const searchDirs = new Set([...appDirs(filePaths)].flatMap(pinSearchDirs));
  const inSearchDirs = (path: string) => searchDirs.has(dirOf(path));
  return {
    packageJsons: filePaths.filter(
      path =>
        (path === 'package.json' || path.endsWith('/package.json')) &&
        inSearchDirs(path)
    ),
    pinFiles: nodePinFilePaths(filePaths).filter(inSearchDirs),
    configFiles: frameworkConfigFilePaths(filePaths)
  };
}
