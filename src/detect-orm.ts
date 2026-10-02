import type { OrmPresetId } from './types';

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export type OrmDetectionRule = {
  id: Exclude<OrmPresetId, 'none'>;
  /** Package names to match in dependencies or devDependencies */
  matchPackages: string[];
};

/** Checked in order; the first match wins. */
export const ORM_DETECTION_RULES: readonly OrmDetectionRule[] = [
  { id: 'prisma', matchPackages: ['prisma', '@prisma/client'] },
  { id: 'drizzle', matchPackages: ['drizzle-orm'] },
  { id: 'typeorm', matchPackages: ['typeorm'] },
  { id: 'knex', matchPackages: ['knex'] },
  { id: 'mikro-orm', matchPackages: ['@mikro-orm/core', 'mikro-orm'] },
  { id: 'sequelize', matchPackages: ['sequelize'] }
];

export function detectOrm(packageJson: PackageJson): OrmPresetId {
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  for (const rule of ORM_DETECTION_RULES) {
    if (rule.matchPackages.some(pkg => deps[pkg])) return rule.id;
  }

  return 'none';
}
