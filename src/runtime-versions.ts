export const NODE_VERSIONS = ['22.x', '20.x', '18.x'] as const;
export const DEFAULT_NODE_VERSION = '22.x';

// Bun versions , "latest" installs whatever is current at deploy time
// Pinned versions (1.3, 1.2, 1.1) resolve to latest patch via the official installer
export const BUN_VERSIONS = ['latest', '1.3', '1.2', '1.1'] as const;
export const DEFAULT_BUN_VERSION = 'latest';

export type NodeVersion = (typeof NODE_VERSIONS)[number];
export type BunVersion = (typeof BUN_VERSIONS)[number];
