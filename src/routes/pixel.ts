import { Request, Response } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getDataDir, indicatorMapping } from '../utils/dataDir';

export async function handlePixel(req: Request, res: Response) {
  try {
    const { indicator, climate, period, latitude, longitude } = req.query;

    if (!indicator || !climate || !period || !latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing required parameters: indicator, climate, period, latitude, longitude'
      });
    }

    const mappedIndicator = indicatorMapping[indicator as string] || indicator;

    const latIndex = (parseFloat(latitude as string) + 179.75) / 0.5;
    const longIndex = (parseFloat(longitude as string) + 89.75) / 0.5;
    const index = Math.floor((latIndex * 360) + longIndex);

    const dataDir = getDataDir();
    const filename = join(dataDir, 'PIXEL', mappedIndicator, climate as string, `${period}.json`);

    try {
      const fileContents = await readFile(filename, 'utf-8');
      const pixelJson = JSON.parse(fileContents);

      let data: any = {};
      if (index < pixelJson.length && pixelJson[index] !== null) {
        data = pixelJson[index];
      }

      return res.json(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          error: `File not found: ${filename}`
        });
      }
      if (error instanceof SyntaxError) {
        return res.status(500).json({
          error: `Invalid JSON in file: ${filename}`
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

