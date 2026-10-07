import type { NodePin } from './node-pin';

export type DeployHookId =
  | 'after-install'
  | 'before-activate'
  | 'after-activate'
  | 'on-fail';

export type OrmPresetId =
  | 'prisma'
  | 'drizzle'
  | 'knex'
  | 'typeorm'
  | 'mikro-orm'
  | 'sequelize'
  | 'none';

export type OrmPreset = {
  id: OrmPresetId;
  name: string;
  description: string;
  hooks?: Partial<Record<DeployHookId, string[]>>;
};

/**
 * What a project deploys as. `web_app` and `api` run a long-lived process
 * behind Caddy; `static` runs nothing: the build output is served as files.
 */
export type ProjectKind = 'web_app' | 'api' | 'static';

export type FrameworkPreset = {
  id: string;
  name: string;
  description: string;
  runtime: 'bun' | 'node';
  /** Default project kind suggested for this framework (user can override). */
  kind: ProjectKind;
  /**
   * Static sites only: serve /index.html for unknown paths (client-side
   * routing). Off means a missing page is a real 404.
   */
  spaFallback?: boolean;
  installCommand: string;
  buildCommand: string;
  startCommand: string;
  outputDirectory: string;
  /** Caddy URL path for static asset interception (e.g. "/build/*", "/assets/*"). Null for API-only frameworks. */
  staticUrlPath: string | null;
  /** Deploy hook commands keyed by hook point in the pipeline */
  hooks?: Partial<Record<DeployHookId, string[]>>;
  /**
   * App-relative paths to real, verified incremental-build caches for this
   * framework (e.g. Next.js's `.next/cache`). Preserved across deploys where
   * the build pipeline supports it, instead of being wiped on every build.
   * Only populate for caches that are actually real and verified - leave
   * unset rather than guess.
   */
  cacheDirs?: string[];
};

export type DetectedApp = {
  name: string;
  path: string;
  framework: string | null;
  runtime: 'bun' | 'node' | null;
  orm: OrmPresetId;
  /** The repo's Node version pin for this app (nearest dir first). */
  nodePin: NodePin | null;
  /** From the framework's adapter (`detectAdapter`); null means use the preset. */
  kind?: ProjectKind | null;
  /** Static build output from the adapter, overriding the preset's. */
  outputDirectory?: string | null;
  /** Host-only adapter that has to be swapped before deploying here. */
  hostAdapter?: string | null;
};

export type MonorepoInfo = {
  isMonorepo: boolean;
  appDirs: string[];
};

export type RepoDetectionResult = {
  isMonorepo: boolean;
  apps: DetectedApp[];
  rootFramework: string | null;
  rootRuntime: 'bun' | 'node' | null;
  rootNodePin: NodePin | null;
  packageManager: 'bun' | 'npm' | 'yarn' | 'pnpm' | null;
};
