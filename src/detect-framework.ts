import type { ProjectKind } from './types';

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export type FrameworkDetectionRule = {
  id: string;
  /** Package names to match in dependencies or devDependencies */
  matchPackages: string[];
  /** Only match in devDependencies (not dependencies) */
  devOnly?: boolean;
};

/**
 * Ordered by specificity: meta-frameworks first, then base tools last.
 * Higher-specificity frameworks supersede lower ones (e.g. TanStack Start supersedes Nitro and Vite).
 */
export const DETECTION_RULES: readonly FrameworkDetectionRule[] = [
  { id: 'tanstack-start', matchPackages: ['@tanstack/react-start'] },
  { id: 'nextjs', matchPackages: ['next'] },
  { id: 'nuxt', matchPackages: ['nuxt', 'nuxt3'] },
  { id: 'sveltekit', matchPackages: ['@sveltejs/kit'] },
  { id: 'astro', matchPackages: ['astro'] },
  { id: 'gatsby', matchPackages: ['gatsby'] },
  { id: 'docusaurus', matchPackages: ['@docusaurus/core'] },
  {
    id: 'react-router',
    matchPackages: ['@react-router/dev', '@remix-run/dev']
  },
  { id: 'nitro', matchPackages: ['nitropack', 'nitro'] },
  { id: 'hono', matchPackages: ['hono'] },
  { id: 'elysia', matchPackages: ['elysia'] },
  { id: 'express', matchPackages: ['express'] },
  { id: 'fastify', matchPackages: ['fastify'] },
  { id: 'vite', matchPackages: ['vite'], devOnly: true }
];

export function detectFramework(packageJson: PackageJson): string | null {
  const deps = packageJson.dependencies ?? {};
  const devDeps = packageJson.devDependencies ?? {};

  for (const rule of DETECTION_RULES) {
    const hasDep = rule.matchPackages.some(pkg => {
      if (rule.devOnly) {
        return pkg in devDeps;
      }
      return pkg in deps || pkg in devDeps;
    });

    if (hasDep) {
      return rule.id;
    }
  }

  return null;
}

/**
 * What a framework's build adapter makes of the app. Astro and SvelteKit
 * build for whichever host their adapter targets, so the package alone
 * doesn't say whether the result is a server or plain files.
 */
export type AdapterDetection = {
  kind: ProjectKind;
  /** Build output to serve, when `kind` is static and differs from the preset. */
  outputDirectory: string | null;
  /**
   * An adapter that builds for one hosting platform only (e.g.
   * `@astrojs/vercel`): its output doesn't run anywhere else, so the app
   * needs the Node or static adapter before it can deploy here.
   */
  hostAdapter: string | null;
};

const ASTRO_HOST_ADAPTERS = [
  '@astrojs/vercel',
  '@astrojs/netlify',
  '@astrojs/cloudflare'
];

// adapter-auto picks an adapter from the build environment and builds
// nothing it can run on a plain server.
const SVELTEKIT_HOST_ADAPTERS = [
  '@sveltejs/adapter-auto',
  '@sveltejs/adapter-vercel',
  '@sveltejs/adapter-netlify',
  '@sveltejs/adapter-cloudflare',
  '@sveltejs/adapter-cloudflare-workers'
];

/** Null when the framework has no adapter or none is found. */
export function detectAdapter(
  framework: string | null,
  packageJson: PackageJson
): AdapterDetection | null {
  const all = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const has = (pkg: string) => pkg in all;
  const hostAdapter = (candidates: string[]) => candidates.find(has) ?? null;

  if (framework === 'astro') {
    if (has('@astrojs/node'))
      return { kind: 'web_app', outputDirectory: null, hostAdapter: null };
    const host = hostAdapter(ASTRO_HOST_ADAPTERS);
    if (host)
      return { kind: 'web_app', outputDirectory: null, hostAdapter: host };
    // No adapter: Astro can only build static pages, into dist/.
    return { kind: 'static', outputDirectory: 'dist', hostAdapter: null };
  }

  if (framework === 'sveltekit') {
    if (has('@sveltejs/adapter-static'))
      return { kind: 'static', outputDirectory: 'build', hostAdapter: null };
    if (has('@sveltejs/adapter-node'))
      return { kind: 'web_app', outputDirectory: null, hostAdapter: null };
    const host = hostAdapter(SVELTEKIT_HOST_ADAPTERS);
    if (host)
      return { kind: 'web_app', outputDirectory: null, hostAdapter: host };
  }

  return null;
}

const START_SCRIPT_COMMAND =
  /^(npm start|(npm|bun|pnpm|yarn) run start|(pnpm|yarn) start)$/;

/**
 * True when the framework's preset starts the app through the package's own
 * `start` script (Express, Fastify, Hono, Elysia: the framework's docs put
 * the entry file there) and package.json has none. Repos built for Vercel's
 * zero-config Express/Hono often have no start script and no `listen()`.
 */
export function missingStartScript(
  presetStartCommand: string | null | undefined,
  packageJson: { scripts?: Record<string, string> }
): boolean {
  if (!presetStartCommand || !START_SCRIPT_COMMAND.test(presetStartCommand))
    return false;
  return !packageJson.scripts?.start;
}
