import { DETECTION_RULES } from './detect-framework';
import { ORM_DETECTION_RULES } from './detect-orm';

/**
 * Runtime packages each framework ships to production besides the one it
 * is detected by. Security advisories for a framework usually land on these
 * (an HTTP layer, a cookie parser, a server core), so an advisory watcher
 * needs them too. Every detection package is included automatically; list
 * only the extras here.
 */
const FRAMEWORK_RUNTIME_SIBLINGS: Record<string, string[]> = {
  'tanstack-start': [
    '@tanstack/react-router',
    '@tanstack/start-server-core',
    '@tanstack/router-core'
  ],
  nextjs: [],
  nuxt: ['nitropack', 'h3'],
  sveltekit: [],
  astro: [],
  'react-router': [
    'react-router',
    '@react-router/node',
    '@react-router/serve',
    '@remix-run/node',
    '@remix-run/server-runtime'
  ],
  nitro: ['h3'],
  hono: ['@hono/node-server'],
  elysia: [],
  express: ['body-parser', 'cookie', 'send', 'serve-static', 'path-to-regexp'],
  fastify: ['find-my-way', '@fastify/static'],
  vite: []
};

/**
 * Every package an advisory watcher should always watch, whether or not
 * any app has deployed it yet: each supported framework's and ORM's
 * detection packages plus their runtime siblings. Sorted and deduplicated.
 */
export const SECURITY_WATCH_PACKAGES: readonly string[] = [
  ...new Set([
    ...DETECTION_RULES.flatMap(rule => [
      ...rule.matchPackages,
      ...(FRAMEWORK_RUNTIME_SIBLINGS[rule.id] ?? [])
    ]),
    ...ORM_DETECTION_RULES.flatMap(rule => rule.matchPackages)
  ])
].sort();
