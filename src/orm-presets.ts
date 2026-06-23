import type { OrmPreset } from './types';

export const ORM_PRESETS: OrmPreset[] = [
  {
    id: 'none',
    name: 'None',
    description: 'No ORM — manage migrations manually'
  },
  {
    id: 'prisma',
    name: 'Prisma',
    description: 'Type-safe ORM with auto-generated client',
    hooks: {
      'after-install': [
        'PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1 bunx prisma generate',
        'PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1 bunx prisma migrate deploy'
      ]
    }
  },
  {
    id: 'drizzle',
    name: 'Drizzle',
    description: 'Lightweight TypeScript ORM',
    hooks: {
      'after-install': ['bunx drizzle-kit migrate']
    }
  },
  {
    id: 'knex',
    name: 'Knex.js',
    description: 'SQL query builder with migrations',
    hooks: {
      'after-install': ['bunx knex migrate:latest']
    }
  },
  {
    id: 'typeorm',
    name: 'TypeORM',
    description: 'ORM for TypeScript and JavaScript',
    hooks: {
      'after-install': ['bunx typeorm migration:run -d ./data-source.ts']
    }
  },
  {
    id: 'mikro-orm',
    name: 'MikroORM',
    description: 'TypeScript ORM with unit of work',
    hooks: {
      'after-install': ['bunx mikro-orm migration:up']
    }
  },
  {
    id: 'sequelize',
    name: 'Sequelize',
    description: 'Promise-based Node.js ORM',
    hooks: {
      'after-install': ['bunx sequelize-cli db:migrate']
    }
  }
];

export function getOrmPreset(id: string): OrmPreset | undefined {
  return ORM_PRESETS.find(p => p.id === id);
}

export const ORM_PRESET_OPTIONS = ORM_PRESETS.map(p => ({
  value: p.id,
  label: p.name,
  description: p.description
}));
