import { Request, Response } from 'express';
import { indicatorMapping, readDataFile } from '../utils/dataDir';
import { join } from 'path';

export async function handlePixel(req: Request, res: Response) {
  try {
    const { indicator, climate, period, latitude, longitude } = req.query;

    if (!indicator || !climate || !period || !latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing required parameters: indicator, climate, period, latitude, longitude'
      });
    }

    // Ensure all parameters are strings
    const indicatorStr = String(indicator);
    const climateStr = String(climate);
    const periodStr = String(period);
    const latitudeStr = String(latitude);
    const longitudeStr = String(longitude);

    const mappedIndicator = indicatorMapping[indicatorStr] || indicatorStr;

    // Calculate pixel index (same logic as Python backend)
    const latIndex = (parseFloat(latitudeStr) + 179.75) / 0.5;
    const longIndex = (parseFloat(longitudeStr) + 89.75) / 0.5;
    const index = Math.floor((latIndex * 360) + longIndex);

    // Build file path
    const relativePath = join('PIXEL', mappedIndicator, climateStr, `${periodStr}.json`);

    try {
      // Read and parse JSON file from R2 or local filesystem
      const fileContents = await readDataFile(relativePath);
      const pixelJson = JSON.parse(fileContents);

      // Preprocessing outputs an array, not a dict
      let data: any = {};
      if (index < pixelJson.length && pixelJson[index] !== null) {
        data = pixelJson[index];
      }

      return res.json(data);
    } catch (error: any) {
      if (error.code === 'ENOENT' || error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return res.status(404).json({
          error: `File not found: ${relativePath}`
        });
      }
      if (error instanceof SyntaxError) {
        return res.status(500).json({
          error: `Invalid JSON in file: ${relativePath}`
        });
      }
      throw error;
    }
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}

