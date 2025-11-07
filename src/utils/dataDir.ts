import { join } from 'path';
import { readFile } from 'fs/promises';
import { fetchFileFromR2, getR2Key } from './r2';

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

/**
 * Read a file from either R2 (if R2_ACCESS_KEY_ID is set) or local filesystem
 */
export async function readDataFile(filePath: string): Promise<string> {
  // Use R2 if credentials are configured
  if (process.env.R2_ACCESS_KEY_ID) {
    const r2Key = getR2Key(filePath);
    return await fetchFileFromR2(r2Key);
  }
  
  // Fall back to local filesystem
  const dataDir = getDataDir();
  const fullPath = filePath.startsWith(dataDir) ? filePath : join(dataDir, filePath);
  return await readFile(fullPath, 'utf-8');
}

