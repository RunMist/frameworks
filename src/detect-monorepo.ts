import type { MonorepoInfo } from './types';

const MONOREPO_INDICATORS = [
  'pnpm-workspace.yaml',
  'turbo.json',
  'lerna.json',
  'nx.json'
];

const APP_DIR_PATTERN = /^apps\/([^/]+)\/package\.json$/;

export function detectMonorepo(filePaths: string[]): MonorepoInfo {
  const hasIndicator = filePaths.some(p => MONOREPO_INDICATORS.includes(p));

  // Also check for workspaces in root package.json (handled by caller via packageJsonContents)
  // Here we just detect via file-based indicators

  const appDirs: string[] = [];
  for (const fp of filePaths) {
    const match = APP_DIR_PATTERN.exec(fp);
    if (match?.[1]) {
      appDirs.push(match[1]);
    }
  }

  return {
    isMonorepo: hasIndicator && appDirs.length > 0,
    appDirs
  };
}
