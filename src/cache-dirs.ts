import type { FrameworkPreset, MonorepoInfo } from './types';

/**
 * Monorepo tool caches - orthogonal to any single framework, since
 * Turborepo/Nx wrap other frameworks' build commands rather than being one
 * themselves. Repo-root-relative, always (Turborepo/Nx operate at the
 * monorepo root, not per-app).
 */
export const MONOREPO_CACHE_DIRS = ['.turbo', '.nx/cache'];

/**
 * Resolves the cache directories worth preserving across builds for a given
 * framework preset and monorepo context. Returns two separate lists because
 * they have different path bases: `appRelative` entries must be joined with
 * the project's `appPath` by the caller (this function doesn't know it),
 * `repoRootRelative` entries are already correct as-is.
 */
export function resolveCacheDirs(
  preset: FrameworkPreset | undefined,
  monorepoInfo?: MonorepoInfo
): { appRelative: string[]; repoRootRelative: string[] } {
  return {
    appRelative: preset?.cacheDirs ?? [],
    repoRootRelative: monorepoInfo?.isMonorepo ? MONOREPO_CACHE_DIRS : []
  };
}
