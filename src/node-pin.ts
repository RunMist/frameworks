/**
 * Node version pins in a repo, and resolving the version a build uses.
 *
 * One rule set for every caller: the create form / settings page (files read
 * through the git provider API) and the build itself (@runmist/deploy runs
 * this on the server against the checkout), so what the UI predicts is what
 * the build does.
 */

import {
  findNodeLine,
  type NodeLineStatus,
  type NodeReleaseLine,
  nodeLineStatus,
  recommendedNodeMajor,
  supportedNodeLines
} from './node-releases';

export type NodePinSource =
  | '.nvmrc'
  | '.node-version'
  | '.tool-versions'
  | 'mise.toml'
  | '.mise.toml'
  | 'volta.node'
  | 'engines.node';

export type NodePin = {
  source: NodePinSource;
  /** Repo-relative path of the file the pin came from. */
  path: string;
  /** The pin as written ("12.2.0", ">=18", "lts/erbium"). */
  raw: string;
};

/** Reads a repo-relative file; undefined when it doesn't exist. */
export type ReadRepoFile = (path: string) => string | undefined;

/** Every file the pin finder may read, relative to one directory. */
export const NODE_PIN_FILES = [
  '.nvmrc',
  '.node-version',
  '.tool-versions',
  'mise.toml',
  '.mise.toml',
  'package.json'
] as const;

const joinPath = (dir: string, file: string) =>
  dir === '.' || dir === '' ? file : `${dir}/${file}`;

/** appPath and each parent up to the repo root, nearest first. */
export const pinSearchDirs = (appPath: string): string[] => {
  const parts = appPath
    .replace(/^\.\/?/, '')
    .split('/')
    .filter(Boolean);
  const dirs: string[] = [];
  for (let i = parts.length; i > 0; i--) dirs.push(parts.slice(0, i).join('/'));
  dirs.push('.');
  return dirs;
};

const firstLine = (content: string) =>
  content
    .split('\n')
    .map(l => l.replace(/#.*$/, '').trim())
    .find(Boolean) ?? null;

const fromToolVersions = (content: string) => {
  for (const raw of content.split('\n')) {
    const [tool, version] = raw.replace(/#.*$/, '').trim().split(/\s+/);
    if ((tool === 'nodejs' || tool === 'node') && version) return version;
  }
  return null;
};

// Minimal TOML read: the first quoted value of `node`/`nodejs` under
// [tools]. Covers `node = "22"`, `node = ["22", "20"]` and
// `node = { version = "22" }`.
const fromMiseToml = (content: string) => {
  let inTools = false;
  for (const raw of content.split('\n')) {
    const l = raw.replace(/#.*$/, '').trim();
    const section = l.match(/^\[([^\]]+)\]$/);
    if (section) {
      inTools = section[1]?.trim() === 'tools';
      continue;
    }
    if (!inTools) continue;
    const entry = l.match(/^"?(node|nodejs)"?\s*=\s*(.+)$/);
    const value = entry?.[2]?.match(/"([^"]+)"|'([^']+)'/);
    if (value) return value[1] ?? value[2] ?? null;
  }
  return null;
};

const fromPackageJson = (content: string) => {
  try {
    const pkg = JSON.parse(content) as {
      volta?: { node?: unknown };
      engines?: { node?: unknown };
    };
    return {
      volta: typeof pkg.volta?.node === 'string' ? pkg.volta.node : null,
      engines: typeof pkg.engines?.node === 'string' ? pkg.engines.node : null
    };
  } catch {
    return { volta: null, engines: null };
  }
};

/**
 * Finds the repo's Node pin for an app. Precedence (first match wins, each
 * kind searched from the app dir up to the repo root): `.nvmrc` /
 * `.node-version`, then `.tool-versions` / `mise.toml` / `.mise.toml`, then
 * `package.json` `volta.node`, then `engines.node`.
 */
export const findNodePin = (
  read: ReadRepoFile,
  appPath = '.'
): NodePin | null => {
  const dirs = pinSearchDirs(appPath);
  const parsers: Array<[NodePinSource, (content: string) => string | null]> = [
    ['.nvmrc', firstLine],
    ['.node-version', firstLine],
    ['.tool-versions', fromToolVersions],
    ['mise.toml', fromMiseToml],
    ['.mise.toml', fromMiseToml]
  ];
  const groups: NodePinSource[][] = [
    ['.nvmrc', '.node-version'],
    ['.tool-versions', 'mise.toml', '.mise.toml']
  ];
  for (const group of groups) {
    for (const dir of dirs) {
      for (const source of group) {
        const path = joinPath(dir, source);
        const content = read(path);
        if (content === undefined) continue;
        const parse = parsers.find(([s]) => s === source)?.[1];
        const raw = parse?.(content);
        if (raw) return { source, path, raw };
      }
    }
  }
  for (const key of ['volta', 'engines'] as const) {
    for (const dir of dirs) {
      const path = joinPath(dir, 'package.json');
      const content = read(path);
      if (content === undefined) continue;
      const raw = fromPackageJson(content)[key];
      if (raw) {
        return {
          source: key === 'volta' ? 'volta.node' : 'engines.node',
          path,
          raw
        };
      }
    }
  }
  return null;
};

// ---------------------------------------------------------------------------
// Semver ranges, enough to answer "does this range allow any version of
// major M". Versions map to one number: major*1e8 + minor*1e4 + patch.
// ---------------------------------------------------------------------------

const MAJOR = 1e8;
const MINOR = 1e4;
const INF = Number.POSITIVE_INFINITY;

type Partial = { major: number; minor: number | null; patch: number | null };
type Interval = { lo: number; hi: number };

const parsePartial = (token: string): Partial | null | 'any' => {
  const cleaned = token.replace(/^v/i, '').replace(/[-+].*$/, '');
  if (cleaned === '' || cleaned === '*' || cleaned.toLowerCase() === 'x') {
    return 'any';
  }
  const parts = cleaned.split('.');
  const nums = parts.map(p => (/^\d+$/.test(p) ? Number(p) : null));
  if (nums[0] === null || nums[0] === undefined) return null;
  return { major: nums[0], minor: nums[1] ?? null, patch: nums[2] ?? null };
};

const lowest = (p: Partial) =>
  p.major * MAJOR + (p.minor ?? 0) * MINOR + (p.patch ?? 0);

const nextUp = (p: Partial) => {
  if (p.minor === null) return (p.major + 1) * MAJOR;
  if (p.patch === null) return p.major * MAJOR + (p.minor + 1) * MINOR;
  return lowest(p) + 1;
};

const comparatorInterval = (comp: string): Interval | null => {
  const match = comp.match(/^(>=|<=|>|<|=|\^|~)?(.*)$/);
  const op = match?.[1] ?? '';
  const p = parsePartial(match?.[2] ?? '');
  if (p === null) return null;
  if (p === 'any') {
    return op === '<' || op === '>' ? { lo: 0, hi: 0 } : { lo: 0, hi: INF };
  }
  const full = p.minor !== null && p.patch !== null;
  switch (op) {
    case '>=':
      return { lo: lowest(p), hi: INF };
    case '>':
      return { lo: full ? lowest(p) + 1 : nextUp(p), hi: INF };
    case '<':
      return { lo: 0, hi: lowest(p) };
    case '<=':
      return { lo: 0, hi: full ? lowest(p) + 1 : nextUp(p) };
    case '~':
      return {
        lo: lowest(p),
        hi:
          p.minor === null
            ? (p.major + 1) * MAJOR
            : p.major * MAJOR + (p.minor + 1) * MINOR
      };
    case '^': {
      let hi = (p.major + 1) * MAJOR;
      if (p.major === 0 && p.minor !== null && p.minor > 0) {
        hi = (p.minor + 1) * MINOR;
      }
      return { lo: lowest(p), hi };
    }
    default:
      return { lo: lowest(p), hi: nextUp(p) };
  }
};

const intersect = (a: Interval, b: Interval): Interval => ({
  lo: Math.max(a.lo, b.lo),
  hi: Math.min(a.hi, b.hi)
});

/** Each `||` alternative as one interval; null if the range is unparsable. */
const rangeIntervals = (range: string): Interval[] | null => {
  const intervals: Interval[] = [];
  for (const alt of range.split('||')) {
    const normalized = alt.trim().replace(/(>=|<=|>|<|=|\^|~)\s+/g, '$1');
    const hyphen = normalized.match(/^(\S+)\s+-\s+(\S+)$/);
    if (hyphen) {
      const from = parsePartial(hyphen[1] ?? '');
      const to = parsePartial(hyphen[2] ?? '');
      if (from === null || to === null) return null;
      intervals.push({
        lo: from === 'any' ? 0 : lowest(from),
        hi:
          to === 'any'
            ? INF
            : to.minor !== null && to.patch !== null
              ? lowest(to) + 1
              : nextUp(to)
      });
      continue;
    }
    let acc: Interval = { lo: 0, hi: INF };
    for (const comp of normalized.split(/\s+/).filter(Boolean)) {
      const interval = comparatorInterval(comp);
      if (!interval) return null;
      acc = intersect(acc, interval);
    }
    intervals.push(acc);
  }
  return intervals;
};

/** Whether a semver range allows at least one version of `major`. */
export const rangeAllowsMajor = (range: string, major: number) => {
  const intervals = rangeIntervals(range);
  if (!intervals) return false;
  const line = { lo: major * MAJOR, hi: (major + 1) * MAJOR };
  return intervals.some(i => {
    const both = intersect(i, line);
    return both.lo < both.hi;
  });
};

// ---------------------------------------------------------------------------
// Pin -> major
// ---------------------------------------------------------------------------

/**
 * The major a pin asks for, or null if it can't be read. An exact or partial
 * version names its own major ("12.2.0" -> 12). A range picks the newest
 * supported LTS it allows, else the newest LTS line, else the newest line.
 * `lts/*` and `node` mean the recommended line.
 */
export const resolveNodePin = (
  raw: string,
  lines: NodeReleaseLine[],
  today: string
): number | null => {
  const pin = raw.trim().toLowerCase();
  if (pin === '' || pin === 'system') return null;
  if (
    pin === 'lts/*' ||
    pin === 'lts' ||
    pin === 'node' ||
    pin === 'stable' ||
    pin === 'latest' ||
    pin === 'current'
  ) {
    return recommendedNodeMajor(lines, today);
  }
  if (pin.startsWith('lts/')) {
    const codename = pin.slice(4);
    return lines.find(l => l.codename === codename)?.major ?? null;
  }
  const exact = pin.match(/^v?(\d+)(\.(\d+|x|\*))*$/);
  if (exact) return Number(exact[1]);

  if (!rangeIntervals(pin)) return null;
  const released = lines.filter(l => l.start !== null && l.start <= today);
  const supported = supportedNodeLines(lines, today).map(l => l.major);
  const rank = (l: NodeReleaseLine) => {
    if (supported.includes(l.major)) return 2;
    return l.ltsStart !== null ? 1 : 0;
  };
  const allowed = released
    .filter(l => rangeAllowsMajor(pin, l.major))
    .sort((a, b) => rank(b) - rank(a) || b.major - a.major);
  return allowed[0]?.major ?? null;
};

// ---------------------------------------------------------------------------
// Setting + pin -> the version a build uses
// ---------------------------------------------------------------------------

/** Project setting: 'auto' or an explicit major line like '24.x'. */
export const NODE_VERSION_AUTO = 'auto';

/** Major of an explicit setting ('24.x', '24'), null for auto/garbage. */
export const explicitNodeMajor = (setting: string | null | undefined) => {
  const match = setting?.trim().match(/^v?(\d+)(\.x)?$/i);
  return match ? Number(match[1]) : null;
};

export const nodeVersionSetting = (major: number) => `${major}.x`;

// A major missing from the data: older than every known line means long
// dead (Node 0.x-3), newer means not in the data yet.
const unknownLineStatus = (
  lines: NodeReleaseLine[],
  major: number
): NodeLineStatus =>
  lines.length > 0 && major < Math.min(...lines.map(l => l.major))
    ? 'eol'
    : 'current';

export type NodeRuntimeSource = 'setting' | 'default' | NodePinSource;

export type ResolvedNodeRuntime = {
  major: number;
  /** Newest patch on the line, what the build installs; null if unknown. */
  version: string | null;
  source: NodeRuntimeSource;
  status: NodeLineStatus;
  /** The repo pin, whether it was used, overridden or unreadable. */
  pin: NodePin | null;
  /** Auto found a pin it couldn't read and fell back to the default. */
  pinUnresolved: boolean;
};

export const resolveNodeRuntime = (input: {
  setting: string | null | undefined;
  pin: NodePin | null;
  lines: NodeReleaseLine[];
  today: string;
}): ResolvedNodeRuntime => {
  const { pin, lines, today } = input;
  const explicit = explicitNodeMajor(input.setting);
  let major: number;
  let source: NodeRuntimeSource;
  let pinUnresolved = false;
  if (explicit !== null) {
    major = explicit;
    source = 'setting';
  } else {
    const fromPin = pin ? resolveNodePin(pin.raw, lines, today) : null;
    if (pin && fromPin !== null) {
      major = fromPin;
      source = pin.source;
    } else {
      major = recommendedNodeMajor(lines, today);
      source = 'default';
      pinUnresolved = pin !== null;
    }
  }
  const line = findNodeLine(lines, major);
  return {
    major,
    version: line?.latestVersion ?? null,
    source,
    status: line
      ? nodeLineStatus(line, today)
      : unknownLineStatus(lines, major),
    pin,
    pinUnresolved
  };
};

const PIN_FILE_NAMES = new Set<string>(
  NODE_PIN_FILES.filter(name => name !== 'package.json')
);

/** The tree paths a caller must fetch for pin detection (besides package.json). */
export const nodePinFilePaths = (filePaths: string[]) =>
  filePaths.filter(path => PIN_FILE_NAMES.has(path.split('/').pop() ?? ''));
