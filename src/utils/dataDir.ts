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
 * Falls back to local filesystem if R2 fails or file doesn't exist in R2
 */
export async function readDataFile(filePath: string): Promise<string> {
  // Try R2 first if credentials are configured (check for non-empty string)
  if (process.env.R2_ACCESS_KEY_ID && process.env.R2_ACCESS_KEY_ID.trim() !== '') {
    try {
      const r2Key = getR2Key(filePath);
      return await fetchFileFromR2(r2Key);
    } catch (error: any) {
      // If R2 fails (file not found or other error), fall back to local filesystem
      if (error.code === 'ENOENT' || error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        console.log(`File not found in R2: ${filePath}, falling back to local filesystem`);
      } else {
        console.warn(`R2 fetch failed for ${filePath}, falling back to local filesystem:`, error.message);
      }
      // Continue to fall back to local filesystem
    }
  }
  
  // Fall back to local filesystem
  const dataDir = getDataDir();
  const fullPath = filePath.startsWith(dataDir) ? filePath : join(dataDir, filePath);
  return await readFile(fullPath, 'utf-8');
}

