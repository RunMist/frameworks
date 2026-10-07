import type { FrameworkPreset, ProjectKind } from './types';

export const FRAMEWORK_PRESETS: FrameworkPreset[] = [
  {
    id: 'tanstack-start',
    name: 'TanStack Start',
    description: 'TanStack Start (Vite SSR, no Nitro)',
    runtime: 'bun',
    kind: 'web_app',
    installCommand: 'bun install --frozen-lockfile',
    buildCommand: 'bun run build',
    // No universal default is possible here - see
    // docs/runmist/tanstack-start-deploy-targets.md. Current (1.168.x+)
    // TanStack Start dropped the Nitro requirement; there's no framework-
    // shipped server binary anymore for self-hosted targets, so every
    // project writes its own thin Fetch-API wrapper (this repo's own
    // server/start.ts, tanstack.com's src/server.ts) and its command/path
    // varies per project. This placeholder documents that expectation
    // rather than guessing a value that will be wrong as often as right.
    startCommand:
      'bun server/start.ts # verify: use the actual server entry for this project',
    outputDirectory: 'dist/client',
    staticUrlPath: '/assets/*'
  },
  {
    id: 'nitro',
    name: 'Nitro',
    description: 'UnJS Nitro server framework',
    runtime: 'bun',
    kind: 'web_app',
    installCommand: 'bun install --frozen-lockfile',
    buildCommand: 'bun run build',
    startCommand: 'bun .output/server/index.mjs',
    outputDirectory: '.output/public',
    staticUrlPath: '/assets/*'
  },
  {
    id: 'react-router',
    name: 'React Router',
    description: 'React Router v7 / Remix',
    runtime: 'node',
    kind: 'web_app',
    installCommand: 'npm install',
    buildCommand: 'npm run build',
    startCommand: 'node index.js',
    outputDirectory: 'build/client',
    staticUrlPath: '/build/*'
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    description: 'React framework by Vercel',
    runtime: 'node',
    kind: 'web_app',
    installCommand: 'npm install',
    buildCommand: 'npm run build',
    // NOT 'node server.js' - that file only exists when next.config sets
    // `output: 'standalone'` (opt-in, produces .next/standalone/server.js,
    // a different path). A plain `next build` - the common case, and what
    // this preset must default to since it has no way to know which mode
    // a given project uses - never produces a server.js anywhere, so that
    // default 404'd on module load for every non-standalone project.
    // Confirmed live against bitclaw.com 2026-09-28: MODULE_NOT_FOUND on
    // '.../server.js', health check failure, deploy rolled back. `next
    // start` is Next.js's own documented production entry point and works
    // for both build modes. Multi-word, not bun/node/npm-prefixed -
    // redeploy.sh's ExecStart mapping resolves this via
    // node_modules/.bin/next, not through npm run/exec (see that script's
    // own comment on exactly this shape).
    startCommand: 'next start',
    outputDirectory: '.next',
    // Scoped to "/_next/static/*", not the whole "/_next/*" namespace -
    // "_next" also hosts dynamic endpoints (the image optimizer at
    // "/_next/image", "/_next/data/*" on the older Pages Router). A
    // reverse-proxy config that treats the whole prefix as static will
    // 404 those instead of proxying them to the app - confirmed live
    // against bitclaw.com (see @runmist/deploy's matching fix).
    staticUrlPath: '/_next/static/*',
    cacheDirs: ['.next/cache']
  },
  {
    id: 'nuxt',
    name: 'Nuxt',
    description: 'Vue.js full-stack framework',
    runtime: 'node',
    kind: 'web_app',
    installCommand: 'npm install',
    buildCommand: 'npm run build',
    startCommand: 'node .output/server/index.mjs',
    outputDirectory: '.output/public',
    staticUrlPath: '/_nuxt/*'
  },
  {
    id: 'sveltekit',
    name: 'SvelteKit',
    description: 'Svelte app framework',
    runtime: 'node',
    kind: 'web_app',
    installCommand: 'npm install',
    buildCommand: 'npm run build',
    startCommand: 'node build/index.js',
    outputDirectory: 'build/client',
    staticUrlPath: '/_app/immutable/*'
  },
  {
    id: 'astro',
    name: 'Astro',
    description: 'Content-focused web framework',
    runtime: 'node',
    kind: 'web_app',
    installCommand: 'npm install',
    buildCommand: 'npm run build',
    startCommand: 'node ./dist/server/entry.mjs',
    outputDirectory: 'dist/client',
    staticUrlPath: '/_astro/*'
  },
  {
    id: 'gatsby',
    name: 'Gatsby',
    description: 'React static site generator',
    runtime: 'node',
    kind: 'static',
    spaFallback: false,
    installCommand: 'npm ci',
    buildCommand: 'npm run build',
    // Static: nothing runs, Caddy serves the build output.
    startCommand: '',
    outputDirectory: 'public',
    staticUrlPath: null,
    cacheDirs: ['.cache']
  },
  {
    id: 'vite',
    name: 'Vite',
    description: 'Frontend build tool',
    runtime: 'bun',
    kind: 'static',
    spaFallback: true,
    installCommand: 'bun install --frozen-lockfile',
    buildCommand: 'bun run build',
    startCommand: 'bun run preview',
    outputDirectory: 'dist',
    staticUrlPath: '/assets/*',
    cacheDirs: ['node_modules/.vite']
  },
  {
    id: 'hono',
    name: 'Hono',
    description: 'Lightweight web framework',
    runtime: 'bun',
    kind: 'api',
    installCommand: 'bun install --frozen-lockfile',
    buildCommand: 'bun run build',
    startCommand: 'bun run start',
    outputDirectory: 'dist',
    staticUrlPath: null
  },
  {
    id: 'elysia',
    name: 'Elysia',
    description: 'Bun-first web framework',
    runtime: 'bun',
    kind: 'api',
    installCommand: 'bun install --frozen-lockfile',
    buildCommand: 'bun run build',
    startCommand: 'bun run start',
    outputDirectory: 'dist',
    staticUrlPath: null
  },
  {
    id: 'express',
    name: 'Express',
    description: 'Node.js web framework',
    runtime: 'node',
    kind: 'api',
    installCommand: 'npm install',
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    outputDirectory: 'dist',
    staticUrlPath: null
  },
  {
    id: 'fastify',
    name: 'Fastify',
    description: 'Fast Node.js web framework',
    runtime: 'node',
    kind: 'api',
    installCommand: 'npm install',
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    outputDirectory: 'dist',
    staticUrlPath: null
  },
  {
    id: 'other',
    name: 'Other',
    description: 'Custom application',
    runtime: 'bun',
    kind: 'web_app',
    installCommand: 'bun install',
    buildCommand: 'bun run build',
    startCommand: 'bun run start',
    outputDirectory: 'dist',
    staticUrlPath: null
  }
];

/** The kind a framework deploys as by default; unknown ids are web apps. */
export const suggestProjectKind = (frameworkId: string | null): ProjectKind =>
  (frameworkId ? getPreset(frameworkId)?.kind : undefined) ?? 'web_app';

export function getPreset(id: string): FrameworkPreset | undefined {
  return FRAMEWORK_PRESETS.find(p => p.id === id);
}

/** Pre-computed combobox items -- avoids re-creating on every render. */
export const FRAMEWORK_PRESET_OPTIONS = FRAMEWORK_PRESETS.map(p => ({
  value: p.id,
  label: p.name,
  description: p.description
}));

export const PROJECT_KINDS: readonly ProjectKind[] = [
  'web_app',
  'api',
  'static'
] as const;
