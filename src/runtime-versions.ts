// Node versions are dynamic: see node-releases.ts (release lines + status)
// and node-pin.ts (repo pins, resolving the version a build uses).

// Bun versions , "latest" installs whatever is current at deploy time
// Pinned versions (1.3, 1.2, 1.1) resolve to latest patch via the official installer
export const BUN_VERSIONS = ['latest', '1.3', '1.2', '1.1'] as const;
export const DEFAULT_BUN_VERSION = 'latest';

export type BunVersion = (typeof BUN_VERSIONS)[number];
