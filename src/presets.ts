import type { FrameworkPreset } from './types';

export const FRAMEWORK_PRESETS: FrameworkPreset[] = [
  {
    id: 'tanstack-start',
    name: 'TanStack Start',
    description: 'TanStack Start (Vite SSR, no Nitro)',
    runtime: 'bun',
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
    installCommand: 'npm install',
    buildCommand: 'npm run build',
    startCommand: 'node server.js',
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
    installCommand: 'npm install',
    buildCommand: 'npm run build',
    startCommand: 'node ./dist/server/entry.mjs',
    outputDirectory: 'dist/client',
    staticUrlPath: '/_astro/*'
  },
  {
    id: 'vite',
    name: 'Vite',
    description: 'Frontend build tool',
    runtime: 'bun',
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
    installCommand: 'npm install',
    buildCommand: 'npm run build',
    startCommand: 'node dist/index.js',
    outputDirectory: 'dist',
    staticUrlPath: null
  },
  {
    id: 'fastify',
    name: 'Fastify',
    description: 'Fast Node.js web framework',
    runtime: 'node',
    installCommand: 'npm install',
    buildCommand: 'npm run build',
    startCommand: 'node dist/index.js',
    outputDirectory: 'dist',
    staticUrlPath: null
  },
  {
    id: 'other',
    name: 'Other',
    description: 'Custom application',
    runtime: 'bun',
    installCommand: 'bun install',
    buildCommand: 'bun run build',
    startCommand: 'bun run start',
    outputDirectory: 'dist',
    staticUrlPath: null
  }
];

export function getPreset(id: string): FrameworkPreset | undefined {
  return FRAMEWORK_PRESETS.find(p => p.id === id);
}

/** Pre-computed combobox items -- avoids re-creating on every render. */
export const FRAMEWORK_PRESET_OPTIONS = FRAMEWORK_PRESETS.map(p => ({
  value: p.id,
  label: p.name,
  description: p.description
}));
