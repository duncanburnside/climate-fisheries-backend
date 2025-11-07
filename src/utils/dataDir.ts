import { join } from 'path';

export function getDataDir(): string {
  if (process.env.DATA_DIR) {
    return process.env.DATA_DIR;
  }
  
  const projectRoot = process.cwd();
  const possiblePaths = [
    join(projectRoot, 'Data'),
    join(projectRoot, '..', 'Data'),
    join(projectRoot, 'data'),
  ];
  
  return possiblePaths[0];
}

export const indicatorMapping: Record<string, string> = {
  'SBOT': 'SBT',
};

