# @bitclaw/frameworks

Framework, ORM, runtime, and monorepo detection for deployment pipelines. Built on Bun.

## Features

- **Framework detection** Identifies Next.js, Remix, Astro, SvelteKit, Nuxt, and more from `package.json` deps
- **ORM detection** Detects Prisma, Drizzle, Sequelize, TypeORM, Mongoose, and others
- **Runtime detection** Identifies Bun vs Node.js with version resolution
- **Monorepo detection** Detects Turborepo, Nx, PNPM workspaces, Bun workspaces, Lerna
- **Repo analysis** Full `analyzeRepo` combining all detections in one pass
- **Presets** Deployment presets per framework (build command, output dir, install command)

## Installation

```bash
bun add @bitclaw/frameworks
```

## Quick Start

```typescript
import { analyzeRepo } from '@bitclaw/frameworks'

const result = await analyzeRepo('/path/to/repo')
console.log(result)
// {
//   framework: { name: 'nextjs', confidence: 'high' },
//   orm: { name: 'prisma' },
//   runtime: { name: 'bun', version: '1.3.0' },
//   monorepo: null,
//   packageManager: 'bun'
// }
```

## API

```typescript
analyzeRepo(dir)                   // → Promise<RepoDetectionResult>
detectFramework(packageJson)       // → DetectedApp | null
detectOrm(packageJson)             // → OrmPreset | null
detectRuntime(dir)                 // → Promise<{ name, version }>
detectMonorepo(dir)                // → Promise<MonorepoInfo | null>
detectPackageManager(dir)          // → Promise<'bun' | 'npm' | 'pnpm' | 'yarn'>
getPreset(frameworkName)           // → FrameworkPreset | null
getOrmPreset(ormName)              // → OrmPreset | null
```

## Testing

```bash
bun test
```
