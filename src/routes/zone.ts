import { Request, Response } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getDataDir, indicatorMapping } from '../utils/dataDir';

export async function handleZone(req: Request, res: Response) {
  try {
    const { model, indicator, climate, id: zoneId, period } = req.query;

    if (!model || !indicator || !climate || !zoneId || !period) {
      return res.status(400).json({
        error: 'Missing required parameters: model, indicator, climate, id, period'
      });
    }

    const mappedIndicator = indicatorMapping[indicator as string] || indicator;

    const dataDir = getDataDir();
    const filename = join(dataDir, 'MODEL', model as string, mappedIndicator, climate as string, `${zoneId}.json`);

    try {
      const fileContents = await readFile(filename, 'utf-8');
      const data = JSON.parse(fileContents);

      if (!(period in data)) {
        return res.status(400).json({
          error: `Period '${period}' not found in data`
        });
      }

      const periodData = data[period as string];
      let ret: any;

      if (Array.isArray(periodData) && periodData.length >= 3) {
        ret = {
          mean: periodData[0],
          min: periodData[1],
          max: periodData[2],
          years: data.years,
        };
      } else if (typeof periodData === 'number') {
        ret = {
          mean: periodData,
          min: null,
          max: null,
          years: data.years,
        };
      } else {
        return res.status(500).json({
          error: `Unexpected data format for period '${period}'`
        });
      }

      const chartFilename = join(dataDir, 'ZONECHART', model as string, `${mappedIndicator}.json`);
      try {
        const chartContents = await readFile(chartFilename, 'utf-8');
        const chart = JSON.parse(chartContents);
        if (zoneId in chart) {
          ret.chart = chart[zoneId as string];
        }
      } catch (error) {
        // Chart data is optional
      }

      return res.json(ret);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          error: `File not found: ${filename}`,
          absolute_path: filename,
          request_params: {
            model,
            indicator: mappedIndicator,
            climate,
            id: zoneId,
            period,
          },
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

