import type { OrmPreset, OrmPresetId } from './types';

type Runtime = 'bun' | 'node';

const pkgRunner = (runtime: Runtime): string =>
  runtime === 'bun' ? 'bunx' : 'npm exec --';

const PRISMA_HOOKS = (runner: string): string[] => [
  `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1 ${runner} prisma generate`,
  `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1 ${runner} prisma migrate deploy`
];

const makePresets = (runner: string): OrmPreset[] => [
  {
    id: 'none',
    name: 'None',
    description: 'No ORM , manage migrations manually'
  },
  {
    id: 'prisma',
    name: 'Prisma',
    description: 'Type-safe ORM with auto-generated client',
    hooks: { 'after-install': PRISMA_HOOKS(runner) }
  },
  {
    id: 'drizzle',
    name: 'Drizzle',
    description: 'Lightweight TypeScript ORM',
    hooks: { 'after-install': [`${runner} drizzle-kit migrate`] }
  },
  {
    id: 'knex',
    name: 'Knex.js',
    description: 'SQL query builder with migrations',
    hooks: { 'after-install': [`${runner} knex migrate:latest`] }
  },
  {
    id: 'typeorm',
    name: 'TypeORM',
    description: 'ORM for TypeScript and JavaScript',
    hooks: {
      'after-install': [`${runner} typeorm migration:run -d ./data-source.ts`]
    }
  },
  {
    id: 'mikro-orm',
    name: 'MikroORM',
    description: 'TypeScript ORM with unit of work',
    hooks: { 'after-install': [`${runner} mikro-orm migration:up`] }
  },
  {
    id: 'sequelize',
    name: 'Sequelize',
    description: 'Promise-based Node.js ORM',
    hooks: { 'after-install': [`${runner} sequelize-cli db:migrate`] }
  }
];

// Default presets use bunx (Bun is always installed on runmist servers)
export const ORM_PRESETS: OrmPreset[] = makePresets('bunx');

export function getOrmPreset(
  id: string,
  runtime: Runtime = 'bun'
): OrmPreset | undefined {
  return makePresets(pkgRunner(runtime)).find(p => p.id === id);
}

export const ORM_PRESET_OPTIONS = ORM_PRESETS.map(p => ({
  value: p.id as OrmPresetId,
  label: p.name,
  description: p.description
}));

// Flattens a preset's hooks (arrays of commands) into the newline-joined
// strings the deploy-hooks textarea fields store, e.g. for a
// `{ 'after-install': string[] }` preset shape.
export function ormHooksToRecord(
  preset: OrmPreset | undefined
): Record<string, string> {
  const record: Record<string, string> = {};
  if (preset?.hooks) {
    for (const [id, commands] of Object.entries(preset.hooks)) {
      if (commands?.length) record[id] = commands.join('\n');
    }
  }
  return record;
}

/**
 * Recomputes ORM-generated deploy hooks after a runtime change (e.g.
 * Drizzle's "npm exec -- drizzle-kit migrate" vs "bunx drizzle-kit
 * migrate"), but only if the current hooks still exactly match what the
 * old runtime's preset produced - preserves a hand-edited hook instead of
 * silently overwriting it. Returns null when nothing should change.
 */
export function regenerateOrmHooksForRuntime(
  orm: string,
  oldRuntime: Runtime,
  newRuntime: Runtime,
  currentHooks: Record<string, string>
): Record<string, string> | null {
  if (orm === 'none') return null;

  const oldHooks = ormHooksToRecord(getOrmPreset(orm, oldRuntime));
  const hooksMatchOldPreset =
    JSON.stringify(currentHooks) === JSON.stringify(oldHooks);

  return hooksMatchOldPreset
    ? ormHooksToRecord(getOrmPreset(orm, newRuntime))
    : null;
}
