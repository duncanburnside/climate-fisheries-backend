import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// Initialize S3 client for Cloudflare R2 only if credentials are available
// R2 is S3-compatible, so we use the S3 client
let r2Client: S3Client | null = null;

function getR2Client(): S3Client | null {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  
  if (!accessKeyId || !secretAccessKey) {
    return null;
  }
  
  if (!r2Client) {
    const endpoint = (process.env.R2_ENDPOINT || 'https://3617e178a84ccd9084eced8f55c34fe1.r2.cloudflarestorage.com').trim();
    
    // Log configuration for debugging (without exposing secrets)
    console.log('Initializing R2 client:', {
      endpoint,
      bucket: process.env.R2_BUCKET || 'climate-fisheries-data',
      hasAccessKey: !!accessKeyId,
      hasSecretKey: !!secretAccessKey,
      accessKeyLength: accessKeyId.length,
      secretKeyLength: secretAccessKey.length
    });
    
    r2Client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
      forcePathStyle: true, // Required for R2
    });
  }
  
  return r2Client;
}

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
    // Validate R2 credentials
    const client = getR2Client();
    if (!client) {
      throw new Error('R2 credentials not configured. R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must be set.');
    }

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });

    const response = await client.send(command);
    
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
    // Log error details for debugging
    console.error('R2 fetch error:', {
      key,
      bucket: R2_BUCKET,
      errorName: error.name,
      errorMessage: error.message,
      httpStatusCode: error.$metadata?.httpStatusCode,
      hasCredentials: !!(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)
    });

    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      const notFoundError: any = new Error(`File not found in R2: ${key}`);
      notFoundError.code = 'ENOENT';
      notFoundError.name = 'NoSuchKey';
      throw notFoundError;
    }
    
    // Re-throw with more context
    if (error.message) {
      throw new Error(`R2 fetch failed for key ${key}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get the R2 key for a data file based on the path structure
 * Normalizes path separators to forward slashes for R2
 * Note: PIXEL files are stored without Data/ prefix, MODEL files are stored with Data/ prefix
 */
export function getR2Key(path: string): string {
  // Normalize path separators to forward slashes (R2 uses forward slashes)
  let normalizedPath = path.replace(/\\/g, '/');
  
  // Remove leading slash if present
  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.slice(1);
  }
  
  // PIXEL files are stored without Data/ prefix
  if (normalizedPath.startsWith('PIXEL/')) {
    return normalizedPath;
  }
  
  // MODEL and other files are stored with Data/ prefix
  if (normalizedPath.startsWith('Data/')) {
    return normalizedPath;
  }
  
  // For MODEL and other paths, add Data/ prefix
  return `Data/${normalizedPath}`;
}

