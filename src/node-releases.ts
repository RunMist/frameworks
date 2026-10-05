/**
 * Node.js release lines: schedule dates per major plus the newest release on
 * each line. Consumers feed live data (nodejs/Release schedule.json +
 * nodejs.org/dist/index.json); NODE_RELEASE_SNAPSHOT is the fallback for a
 * fresh database, tests and a dead poller.
 *
 * Status is always computed from the dates and "today", never stored, so a
 * line flips to LTS or end-of-life on the right day even when the data is
 * old.
 */

export type NodeReleaseLine = {
  major: number;
  /** YYYY-MM-DD dates from schedule.json; null when the line has none. */
  start: string | null;
  ltsStart: string | null;
  maintenanceStart: string | null;
  endOfLife: string | null;
  /** LTS codename, lowercase ("erbium"); null for non-LTS lines. */
  codename: string | null;
  /** Newest release on the line ("12.22.12"); null if none yet. */
  latestVersion: string | null;
};

export type NodeLineStatus =
  | 'unreleased'
  | 'current'
  | 'active_lts'
  | 'maintenance_lts'
  | 'eol_soon'
  | 'eol';

/** A supported line within this many days of end-of-life is `eol_soon`. */
export const NODE_EOL_SOON_DAYS = 180;

const DAY_MS = 86_400_000;

/** Today as YYYY-MM-DD (UTC), the format every schedule date uses. */
export const todayIso = (now: Date = new Date()) =>
  now.toISOString().slice(0, 10);

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

export const nodeLineStatus = (
  line: NodeReleaseLine,
  today: string
): NodeLineStatus => {
  if (!line.start || line.start > today) return 'unreleased';
  if (line.endOfLife && line.endOfLife <= today) return 'eol';
  if (
    line.endOfLife &&
    daysBetween(today, line.endOfLife) <= NODE_EOL_SOON_DAYS
  ) {
    return 'eol_soon';
  }
  if (line.ltsStart && line.ltsStart <= today) {
    return line.maintenanceStart && line.maintenanceStart <= today
      ? 'maintenance_lts'
      : 'active_lts';
  }
  return 'current';
};

/** True for lines that ever were (or are) LTS: even majors since Node 4. */
const isLtsLine = (line: NodeReleaseLine) => line.ltsStart !== null;

/**
 * Lines offered in the main picker: LTS lines that have reached LTS and
 * still get fixes (active, maintenance, or ending soon), newest first.
 * Current/odd lines are left out: they live about six months.
 */
export const supportedNodeLines = (
  lines: NodeReleaseLine[],
  today: string
): NodeReleaseLine[] =>
  lines
    .filter(line => {
      if (!line.ltsStart || line.ltsStart > today) return false;
      const status = nodeLineStatus(line, today);
      return (
        status === 'active_lts' ||
        status === 'maintenance_lts' ||
        status === 'eol_soon'
      );
    })
    .sort((a, b) => b.major - a.major);

/**
 * End-of-life LTS lines, newest first: the "Older versions" override list.
 * Odd lines are not listed (a repo pin to one still resolves under Auto).
 */
export const endOfLifeNodeLines = (
  lines: NodeReleaseLine[],
  today: string
): NodeReleaseLine[] =>
  lines
    .filter(
      line =>
        isLtsLine(line) &&
        line.latestVersion !== null &&
        nodeLineStatus(line, today) === 'eol'
    )
    .sort((a, b) => b.major - a.major);

/**
 * The recommended major: newest active LTS, else the newest supported line,
 * else the newest released LTS line (only with absurdly stale data).
 */
export const recommendedNodeMajor = (
  lines: NodeReleaseLine[],
  today: string
): number => {
  const supported = supportedNodeLines(lines, today);
  const active = supported.find(
    line => nodeLineStatus(line, today) === 'active_lts'
  );
  const pick =
    active ??
    supported[0] ??
    lines
      .filter(line => isLtsLine(line) && line.start && line.start <= today)
      .sort((a, b) => b.major - a.major)[0];
  return pick?.major ?? NODE_RELEASE_SNAPSHOT_FALLBACK_MAJOR;
};

export const findNodeLine = (lines: NodeReleaseLine[], major: number) =>
  lines.find(line => line.major === major) ?? null;

/** Live data when present, the bundled snapshot otherwise. */
export const nodeLinesOrSnapshot = (lines: NodeReleaseLine[] | null) =>
  lines && lines.length > 0 ? lines : NODE_RELEASE_SNAPSHOT;

const NODE_RELEASE_SNAPSHOT_FALLBACK_MAJOR = 24;

const line = (
  major: number,
  start: string,
  ltsStart: string | null,
  maintenanceStart: string | null,
  endOfLife: string,
  codename: string | null,
  latestVersion: string | null
): NodeReleaseLine => ({
  major,
  start,
  ltsStart,
  maintenanceStart,
  endOfLife,
  codename,
  latestVersion
});

/**
 * Snapshot of schedule.json + dist/index.json taken 2026-10-04. Fallback
 * only; refresh it when cutting a release of this package.
 */
export const NODE_RELEASE_SNAPSHOT: NodeReleaseLine[] = [
  line(
    4,
    '2015-09-08',
    '2015-10-12',
    '2017-04-01',
    '2018-04-30',
    'argon',
    '4.9.1'
  ),
  line(5, '2015-10-29', null, '2016-04-30', '2016-06-30', null, '5.12.0'),
  line(
    6,
    '2016-04-26',
    '2016-10-18',
    '2018-04-30',
    '2019-04-30',
    'boron',
    '6.17.1'
  ),
  line(7, '2016-10-25', null, '2017-04-30', '2017-06-30', null, '7.10.1'),
  line(
    8,
    '2017-05-30',
    '2017-10-31',
    '2019-01-01',
    '2019-12-31',
    'carbon',
    '8.17.0'
  ),
  line(9, '2017-10-01', null, '2018-04-01', '2018-06-30', null, '9.11.2'),
  line(
    10,
    '2018-04-24',
    '2018-10-30',
    '2020-05-19',
    '2021-04-30',
    'dubnium',
    '10.24.1'
  ),
  line(11, '2018-10-23', null, '2019-04-22', '2019-06-01', null, '11.15.0'),
  line(
    12,
    '2019-04-23',
    '2019-10-21',
    '2020-11-30',
    '2022-04-30',
    'erbium',
    '12.22.12'
  ),
  line(13, '2019-10-22', null, '2020-04-01', '2020-06-01', null, '13.14.0'),
  line(
    14,
    '2020-04-21',
    '2020-10-27',
    '2021-10-19',
    '2023-04-30',
    'fermium',
    '14.21.3'
  ),
  line(15, '2020-10-20', null, '2021-04-01', '2021-06-01', null, '15.14.0'),
  line(
    16,
    '2021-04-20',
    '2021-10-26',
    '2022-10-18',
    '2023-09-11',
    'gallium',
    '16.20.2'
  ),
  line(17, '2021-10-19', null, '2022-04-01', '2022-06-01', null, '17.9.1'),
  line(
    18,
    '2022-04-19',
    '2022-10-25',
    '2023-10-18',
    '2025-04-30',
    'hydrogen',
    '18.20.8'
  ),
  line(19, '2022-10-18', null, '2023-04-01', '2023-06-01', null, '19.9.0'),
  line(
    20,
    '2023-04-18',
    '2023-10-24',
    '2024-10-22',
    '2026-04-30',
    'iron',
    '20.20.2'
  ),
  line(21, '2023-10-17', null, '2024-04-01', '2024-06-01', null, '21.7.3'),
  line(
    22,
    '2024-04-24',
    '2024-10-29',
    '2025-10-21',
    '2027-04-30',
    'jod',
    '22.23.3'
  ),
  line(23, '2024-10-16', null, '2025-04-01', '2025-06-01', null, '23.11.1'),
  line(
    24,
    '2025-05-06',
    '2025-10-28',
    '2026-10-20',
    '2028-04-30',
    'krypton',
    '24.21.0'
  ),
  line(25, '2025-10-15', null, '2026-04-01', '2026-06-01', null, '25.9.0'),
  line(
    26,
    '2026-05-05',
    '2026-10-28',
    '2027-10-20',
    '2029-04-30',
    null,
    '26.10.0'
  ),
  line(27, '2027-04-22', null, '2027-10-20', '2030-04-30', null, null)
];
