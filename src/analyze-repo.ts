import { detectFramework } from './detect-framework';
import { detectMonorepo } from './detect-monorepo';
import { detectOrm } from './detect-orm';
import { detectPackageManager, detectRuntime } from './detect-runtime';
import type { DetectedApp, RepoDetectionResult } from './types';

/**
 * Analyze a repository's file tree and package.json contents to detect
 * monorepo structure, frameworks, and runtimes.
 *
 * @param filePaths - All file paths in the repo (from git tree API)
 * @param packageJsonContents - Map of file path to parsed package.json content string
 */
export function analyzeRepo(
  filePaths: string[],
  packageJsonContents: Map<string, string>
): RepoDetectionResult {
  const packageManager = detectPackageManager(filePaths);
  const monorepo = detectMonorepo(filePaths);

  // Detect root-level framework
  let rootFramework: string | null = null;
  let rootRuntime: 'bun' | 'node' | null = null;
  let rootParsed: Record<string, unknown> | null = null;
  const rootPkgJson = packageJsonContents.get('package.json');
  if (rootPkgJson) {
    try {
      rootParsed = JSON.parse(rootPkgJson);
      rootFramework = detectFramework(rootParsed!);
      rootRuntime = detectRuntime(rootFramework, filePaths);
    } catch {
      // Invalid JSON, skip
    }
  }

  if (!monorepo.isMonorepo) {
    // Single-app repo
    const apps: DetectedApp[] = [];
    if (rootFramework) {
      apps.push({
        name: '.',
        path: '.',
        framework: rootFramework,
        runtime: rootRuntime,
        orm: detectOrm(rootParsed ?? {})
      });
    }
    return {
      isMonorepo: false,
      apps,
      rootFramework,
      rootRuntime,
      packageManager
    };
  }

  // Monorepo: analyze each app directory
  const apps: DetectedApp[] = [];
  for (const appDir of monorepo.appDirs) {
    const pkgPath = `apps/${appDir}/package.json`;
    const pkgContent = packageJsonContents.get(pkgPath);
    if (!pkgContent) continue;

    try {
      const parsed = JSON.parse(pkgContent);
      const framework = detectFramework(parsed);
      const runtime = detectRuntime(framework, filePaths);
      apps.push({
        name: appDir,
        path: `apps/${appDir}`,
        framework,
        runtime,
        orm: detectOrm(parsed)
      });
    } catch {
      // Invalid JSON, skip this app
    }
  }

  return {
    isMonorepo: true,
    apps,
    rootFramework,
    rootRuntime,
    packageManager
  };
}
