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

### Node versions

Dynamic, no hardcoded version list. Feed live release lines (nodejs/Release
`schedule.json` + `nodejs.org/dist/index.json`) or fall back to the bundled
`NODE_RELEASE_SNAPSHOT`.

```typescript
const lines = nodeLinesOrSnapshot(liveLines)
const today = todayIso()
supportedNodeLines(lines, today)   // picker: LTS lines still getting fixes
endOfLifeNodeLines(lines, today)   // "Older versions" override list
recommendedNodeMajor(lines, today) // newest active LTS
nodeLineStatus(line, today)        // active_lts | maintenance_lts | current | eol_soon | eol | unreleased

const pin = findNodePin(readFile, appPath) // .nvmrc > .node-version > .tool-versions/mise.toml > volta > engines
resolveNodeRuntime({ setting: 'auto', pin, lines, today })
// → { major: 12, version: '12.22.12', source: '.nvmrc', status: 'eol', ... }
```

## Testing

```bash
bun test
```
