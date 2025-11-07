import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// Initialize S3 client for Cloudflare R2
// R2 is S3-compatible, so we use the S3 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || 'https://3617e178a84ccd9084eced8f55c34fe1.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true, // Required for R2
});

const R2_BUCKET = process.env.R2_BUCKET || 'climate-fisheries-data';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://3617e178a84ccd9084eced8f55c34fe1.r2.cloudflarestorage.com/climate-fisheries-data';

/**
 * Get the public URL for a file in R2
 */
export function getR2PublicUrl(key: string): string {
  // Normalize path separators to forward slashes (R2 uses forward slashes)
  let normalizedKey = key.replace(/\\/g, '/');
  
  // Remove leading slash if present
  if (normalizedKey.startsWith('/')) {
    normalizedKey = normalizedKey.slice(1);
  }
  
  // Ensure it starts with Data/
  if (!normalizedKey.startsWith('Data/')) {
    normalizedKey = `Data/${normalizedKey}`;
  }
  
  return `${R2_PUBLIC_URL}/${normalizedKey}`;
}

/**
 * Fetch a file from R2 and return its contents as a string
 */
export async function fetchFileFromR2(key: string): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });

    const response = await r2Client.send(command);
    
    if (!response.Body) {
      throw new Error(`Empty response body for key: ${key}`);
    }

    // Convert stream to string
    const stream = response.Body as any;
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    
    const buffer = Buffer.concat(chunks);
    return buffer.toString('utf-8');
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      const notFoundError: any = new Error(`File not found: ${key}`);
      notFoundError.code = 'ENOENT';
      throw notFoundError;
    }
    throw error;
  }
}

/**
 * Get the R2 key for a data file based on the path structure
 * Normalizes path separators to forward slashes for R2
 */
export function getR2Key(path: string): string {
  // Normalize path separators to forward slashes (R2 uses forward slashes)
  let normalizedPath = path.replace(/\\/g, '/');
  
  // Remove leading slash if present
  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.slice(1);
  }
  
  // Ensure it starts with Data/
  if (normalizedPath.startsWith('Data/')) {
    return normalizedPath;
  }
  
  return `Data/${normalizedPath}`;
}

