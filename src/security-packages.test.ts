import { describe, expect, test } from 'bun:test';
import { DETECTION_RULES } from './detect-framework';
import { ORM_DETECTION_RULES } from './detect-orm';
import { SECURITY_WATCH_PACKAGES } from './security-packages';

describe('SECURITY_WATCH_PACKAGES', () => {
  test('includes every framework and ORM detection package', () => {
    for (const rule of [...DETECTION_RULES, ...ORM_DETECTION_RULES]) {
      for (const pkg of rule.matchPackages) {
        expect(SECURITY_WATCH_PACKAGES).toContain(pkg);
      }
    }
  });

  test('includes runtime siblings and has no duplicates', () => {
    expect(SECURITY_WATCH_PACKAGES).toContain('h3');
    expect(SECURITY_WATCH_PACKAGES).toContain('body-parser');
    expect(new Set(SECURITY_WATCH_PACKAGES).size).toBe(
      SECURITY_WATCH_PACKAGES.length
    );
  });
});
