import { describe, expect, test } from 'bun:test';
import { detectOrm } from './detect-orm';

describe('detectOrm', () => {
  test('detects prisma via prisma dep', () => {
    expect(detectOrm({ dependencies: { prisma: '^6.0.0' } })).toBe('prisma');
  });

  test('detects prisma via @prisma/client dep', () => {
    expect(detectOrm({ dependencies: { '@prisma/client': '^6.0.0' } })).toBe(
      'prisma'
    );
  });

  test('detects prisma in devDependencies', () => {
    expect(detectOrm({ devDependencies: { prisma: '^6.0.0' } })).toBe('prisma');
  });

  test('detects drizzle', () => {
    expect(detectOrm({ dependencies: { 'drizzle-orm': '^0.30.0' } })).toBe(
      'drizzle'
    );
  });

  test('detects typeorm', () => {
    expect(detectOrm({ dependencies: { typeorm: '^0.3.0' } })).toBe('typeorm');
  });

  test('detects knex', () => {
    expect(detectOrm({ dependencies: { knex: '^3.0.0' } })).toBe('knex');
  });

  test('detects mikro-orm via @mikro-orm/core', () => {
    expect(detectOrm({ dependencies: { '@mikro-orm/core': '^6.0.0' } })).toBe(
      'mikro-orm'
    );
  });

  test('detects mikro-orm via mikro-orm', () => {
    expect(detectOrm({ dependencies: { 'mikro-orm': '^6.0.0' } })).toBe(
      'mikro-orm'
    );
  });

  test('detects sequelize', () => {
    expect(detectOrm({ dependencies: { sequelize: '^6.0.0' } })).toBe(
      'sequelize'
    );
  });

  test('returns none when no ORM found', () => {
    expect(detectOrm({ dependencies: { express: '^4.0.0' } })).toBe('none');
  });

  test('returns none for empty package.json', () => {
    expect(detectOrm({})).toBe('none');
  });

  // Priority: prisma wins when multiple ORMs present
  test('prisma takes priority when multiple ORM deps present', () => {
    expect(
      detectOrm({
        dependencies: { prisma: '^6.0.0', 'drizzle-orm': '^0.30.0' }
      })
    ).toBe('prisma');
  });

  // Real-world: weatherdestination uses prisma
  test('detects weatherdestination prisma setup', () => {
    expect(
      detectOrm({
        dependencies: {
          '@prisma/adapter-libsql': '^7.4.0',
          '@prisma/client': '^7.4.0',
          '@prisma/instrumentation': '^7.4.0',
          prisma: '^7.4.0'
        }
      })
    ).toBe('prisma');
  });
});
