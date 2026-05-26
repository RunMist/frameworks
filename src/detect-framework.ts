type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type FrameworkDetectionRule = {
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
const DETECTION_RULES: FrameworkDetectionRule[] = [
  { id: 'tanstack-start', matchPackages: ['@tanstack/react-start'] },
  { id: 'nextjs', matchPackages: ['next'] },
  { id: 'nuxt', matchPackages: ['nuxt', 'nuxt3'] },
  { id: 'sveltekit', matchPackages: ['@sveltejs/kit'] },
  { id: 'astro', matchPackages: ['astro'] },
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
