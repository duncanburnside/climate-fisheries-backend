import { Request, Response } from 'express';
import { indicatorMapping, getDataDir, readDataFile } from '../utils/dataDir';
import { getR2PublicUrl } from '../utils/r2';
import { join } from 'path';

export async function handleZone(req: Request, res: Response) {
  try {
    const { model, indicator, climate, id: zoneId, period } = req.query;

    if (!model || !indicator || !climate || !zoneId || !period) {
      return res.status(400).json({
        error: 'Missing required parameters: model, indicator, climate, id, period'
      });
    }

    const mappedIndicator = indicatorMapping[indicator as string] || indicator;

    // Create R2 keys for the data files
    const relativePath = join('MODEL', model as string, mappedIndicator, climate as string, `${zoneId}.json`);
    const r2Key = relativePath.replace(/\\/g, '/');
    
    // Create R2 key for chart data
    const chartRelativePath = join('ZONECHART', model as string, `${mappedIndicator}.json`);
    const chartR2Key = chartRelativePath.replace(/\\/g, '/');
    
    // Return public URLs for the data files
    const dataUrl = getR2PublicUrl(r2Key);
    const chartUrl = getR2PublicUrl(chartR2Key);
    
    return res.json({
      dataUrl,
      chartUrl,
      indicator: mappedIndicator,
      model,
      climate,
      zoneId,
      period,
      note: 'Use the provided URLs to fetch zone data and chart data directly'
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}

