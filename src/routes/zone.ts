import { Request, Response } from 'express';
import { indicatorMapping, readDataFile } from '../utils/dataDir';
import { join } from 'path';

export async function handleZone(req: Request, res: Response) {
  try {
    const { model, indicator, climate, id: zoneId, period } = req.query;

    if (!model || !indicator || !climate || !zoneId || !period) {
      return res.status(400).json({
        error: 'Missing required parameters: model, indicator, climate, id, period'
      });
    }

    // Ensure all parameters are strings
    const modelStr = String(model);
    const indicatorStr = String(indicator);
    const climateStr = String(climate);
    const zoneIdStr = String(zoneId);
    const periodStr = String(period);

    const mappedIndicator = indicatorMapping[indicatorStr] || indicatorStr;

    // Build file path
    const relativePath = join('MODEL', modelStr, mappedIndicator, climateStr, `${zoneIdStr}.json`);

    try {
      // Read and parse JSON file from R2 or local filesystem
      const fileContents = await readDataFile(relativePath);
      const data = JSON.parse(fileContents);

      if (!(periodStr in data)) {
        return res.status(400).json({
          error: `Period '${periodStr}' not found in data`
        });
      }

      // Handle different data structures:
      // NPP files have: {"present": [mean, min, max], ...}
      // SST files have: {"present": value, ...}
      const periodData = data[periodStr];
      let ret: any;

      if (Array.isArray(periodData) && periodData.length >= 3) {
        // NPP format: array with [mean, min, max]
        ret = {
          mean: periodData[0],
          min: periodData[1],
          max: periodData[2],
          years: data.years,
        };
      } else if (typeof periodData === 'number') {
        // SST format: single value (mean)
        ret = {
          mean: periodData,
          min: null,
          max: null,
          years: data.years,
        };
      } else {
        return res.status(500).json({
          error: `Unexpected data format for period '${periodStr}'`
        });
      }

      // Try to load chart data, but make it optional
      const chartRelativePath = join('ZONECHART', modelStr, `${mappedIndicator}.json`);
      try {
        const chartContents = await readDataFile(chartRelativePath);
        const chart = JSON.parse(chartContents);
        if (zoneIdStr in chart) {
          ret.chart = chart[zoneIdStr];
        }
      } catch (error) {
        // Chart data is optional, so we continue without it
      }

      return res.json(ret);
    } catch (error: any) {
      // Log error details for debugging
      console.error('Error reading zone data:', {
        relativePath,
        error: error.message,
        errorName: error.name,
        errorCode: error.code,
        httpStatusCode: error.$metadata?.httpStatusCode,
        stack: error.stack
      });

      if (error.code === 'ENOENT' || error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return res.status(404).json({
          error: `File not found: ${relativePath}`,
          details: error.message
        });
      }
      if (error instanceof SyntaxError) {
        return res.status(500).json({
          error: `Invalid JSON in file: ${relativePath}`,
          details: error.message
        });
      }
      throw error;
    }
  } catch (error: any) {
    // Log the full error for debugging
    console.error('Unexpected error in zone route:', {
      error: error.message,
      errorName: error.name,
      errorCode: error.code,
      stack: error.stack
    });

    return res.status(500).json({
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

