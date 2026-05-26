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

export type FrameworkPreset = {
  id: string;
  name: string;
  description: string;
  runtime: 'bun' | 'node';
  installCommand: string;
  buildCommand: string;
  startCommand: string;
  outputDirectory: string;
  /** Caddy URL path for static asset interception (e.g. "/build/*", "/assets/*"). Null for API-only frameworks. */
  staticUrlPath: string | null;
  /** Deploy hook commands keyed by hook point in the pipeline */
  hooks?: Partial<Record<DeployHookId, string[]>>;
};

export type DetectedApp = {
  name: string;
  path: string;
  framework: string | null;
  runtime: 'bun' | 'node' | null;
  orm: OrmPresetId;
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
  packageManager: 'bun' | 'npm' | 'yarn' | 'pnpm' | null;
};
