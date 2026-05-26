import type { FrameworkPreset } from './types';

export const FRAMEWORK_PRESETS: FrameworkPreset[] = [
  {
    id: 'tanstack-start',
    name: 'TanStack Start',
    description: 'TanStack Start with Nitro',
    runtime: 'bun',
    installCommand: 'bun install --frozen-lockfile',
    buildCommand: 'bun run build',
    startCommand: 'bun .output/server/index.mjs',
    outputDirectory: '.output/public',
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
    staticUrlPath: '/_next/*'
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
    staticUrlPath: '/assets/*'
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
