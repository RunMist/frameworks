import { describe, expect, test } from 'bun:test';
import {
  endOfLifeNodeLines,
  findNodeLine,
  NODE_RELEASE_SNAPSHOT,
  nodeLineStatus,
  nodeLinesOrSnapshot,
  recommendedNodeMajor,
  supportedNodeLines
} from './node-releases';

const lines = NODE_RELEASE_SNAPSHOT;
const status = (major: number, today: string) => {
  const line = findNodeLine(lines, major);
  if (!line) throw new Error(`no line ${major}`);
  return nodeLineStatus(line, today);
};
const majors = (list: { major: number }[]) => list.map(l => l.major);

describe('nodeLineStatus', () => {
  test('on 2026-10-04: 24 active LTS, 22 maintenance, 26 current, 20 eol', () => {
    expect(status(24, '2026-10-04')).toBe('active_lts');
    expect(status(22, '2026-10-04')).toBe('maintenance_lts');
    expect(status(26, '2026-10-04')).toBe('current');
    expect(status(20, '2026-10-04')).toBe('eol');
    expect(status(12, '2026-10-04')).toBe('eol');
    expect(status(27, '2026-10-04')).toBe('unreleased');
  });

  test('26 flips to active LTS on 2026-10-28, 24 to maintenance on 2026-10-20', () => {
    expect(status(26, '2026-10-27')).toBe('current');
    expect(status(26, '2026-10-28')).toBe('active_lts');
    expect(status(24, '2026-10-19')).toBe('active_lts');
    expect(status(24, '2026-10-20')).toBe('maintenance_lts');
  });

  test('a line is eol_soon within 180 days of end-of-life, eol on the day', () => {
    // 22 ends 2027-04-30: 180 days before is 2026-11-01.
    expect(status(22, '2026-10-31')).toBe('maintenance_lts');
    expect(status(22, '2026-11-01')).toBe('eol_soon');
    expect(status(22, '2027-04-29')).toBe('eol_soon');
    expect(status(22, '2027-04-30')).toBe('eol');
  });
});

describe('picker lists', () => {
  test('supported lines are LTS lines still getting fixes, newest first', () => {
    expect(majors(supportedNodeLines(lines, '2026-10-04'))).toEqual([24, 22]);
    expect(majors(supportedNodeLines(lines, '2026-10-28'))).toEqual([
      26, 24, 22
    ]);
    expect(majors(supportedNodeLines(lines, '2027-04-30'))).toEqual([26, 24]);
  });

  test('recommended is the newest active LTS', () => {
    expect(recommendedNodeMajor(lines, '2026-10-04')).toBe(24);
    expect(recommendedNodeMajor(lines, '2026-10-27')).toBe(24);
    expect(recommendedNodeMajor(lines, '2026-10-28')).toBe(26);
  });

  test('older versions are end-of-life LTS lines only, newest first', () => {
    const older = majors(endOfLifeNodeLines(lines, '2026-10-04'));
    expect(older[0]).toBe(20);
    expect(older).toContain(12);
    expect(older).not.toContain(21);
    expect(older).not.toContain(22);
  });
});

describe('nodeLinesOrSnapshot', () => {
  test('falls back to the snapshot when live data is empty', () => {
    expect(nodeLinesOrSnapshot(null)).toBe(NODE_RELEASE_SNAPSHOT);
    expect(nodeLinesOrSnapshot([])).toBe(NODE_RELEASE_SNAPSHOT);
    const live = [{ ...NODE_RELEASE_SNAPSHOT[0]!, latestVersion: '4.9.9' }];
    expect(nodeLinesOrSnapshot(live)).toBe(live);
  });
});
