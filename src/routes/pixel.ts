import { Request, Response } from 'express';
import { indicatorMapping, getDataDir, readDataFile } from '../utils/dataDir';
import { getR2PublicUrl } from '../utils/r2';
import { join } from 'path';

export async function handlePixel(req: Request, res: Response) {
  try {
    const { indicator, climate, period, latitude, longitude } = req.query;

    if (!indicator || !climate || !period || !latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing required parameters: indicator, climate, period, latitude, longitude'
      });
    }

    const mappedIndicator = indicatorMapping[indicator as string] || indicator;

    // Create the R2 key for the pixel data file
    const relativePath = join('PIXEL', mappedIndicator, climate as string, `${period}.json`);
    const r2Key = relativePath.replace(/\\/g, '/');
    
    // Return the public URL for the data file
    const publicUrl = getR2PublicUrl(r2Key);
    
    return res.json({
      url: publicUrl,
      indicator: mappedIndicator,
      climate,
      period,
      latitude,
      longitude,
      note: 'Use the provided URL to fetch the pixel data directly'
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}

