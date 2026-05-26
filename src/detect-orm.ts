import type { OrmPresetId } from './types';

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export function detectOrm(packageJson: PackageJson): OrmPresetId {
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  if (deps.prisma || deps['@prisma/client']) return 'prisma';
  if (deps['drizzle-orm']) return 'drizzle';
  if (deps.typeorm) return 'typeorm';
  if (deps.knex) return 'knex';
  if (deps['@mikro-orm/core'] || deps['mikro-orm']) return 'mikro-orm';
  if (deps.sequelize) return 'sequelize';

  return 'none';
}
