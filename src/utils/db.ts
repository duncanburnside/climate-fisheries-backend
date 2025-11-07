import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Database type: 'supabase', 'd1', or 'sqlite'
const DB_TYPE = process.env.DB_TYPE || 'sqlite';

// Supabase client (lazy loaded)
let supabaseClient: any = null;

// D1 database (for Cloudflare Workers - not available in Node.js)
let d1Database: any = null;

// SQLite database (local fallback)
let sqliteDb: any = null;

/**
 * Initialize Supabase client
 */
function getSupabaseClient() {
  if (!supabaseClient) {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not found. Set SUPABASE_URL and SUPABASE_KEY');
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

/**
 * Initialize SQLite database (local fallback)
 */
function getSqliteDb() {
  if (!sqliteDb) {
    try {
      const Database = require('better-sqlite3');
      const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'data.db');
      sqliteDb = new Database(DB_PATH, { readonly: true });
      sqliteDb.pragma('journal_mode = WAL');
    } catch (error) {
      // SQLite not available (e.g., better-sqlite3 not built)
      return null;
    }
  }
  return sqliteDb;
}

/**
 * Get zone data from database
 */
export async function getZoneData(
  model: string,
  indicator: string,
  climate: string,
  zoneId: string
): Promise<any | null> {
  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('zone_data')
      .select('data')
      .eq('model', model)
      .eq('indicator', indicator)
      .eq('climate', climate)
      .eq('zone_id', zoneId)
      .single();

    if (error || !data) return null;
    return typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
  }

  if (DB_TYPE === 'd1') {
    // D1 is only available in Cloudflare Workers context
    // For Node.js, we'd need to use D1 HTTP API
    throw new Error('D1 database is only available in Cloudflare Workers. Use Supabase or SQLite for Node.js.');
  }

  // SQLite fallback
  const db = getSqliteDb();
  if (!db) return null;

  const stmt = db.prepare(`
    SELECT data FROM zone_data
    WHERE model = ? AND indicator = ? AND climate = ? AND zone_id = ?
  `);
  const row = stmt.get(model, indicator, climate, zoneId) as { data: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.data);
}

/**
 * Get pixel data from database
 */
export async function getPixelData(
  indicator: string,
  climate: string,
  period: string
): Promise<any[] | null> {
  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('pixel_data')
      .select('data')
      .eq('indicator', indicator)
      .eq('climate', climate)
      .eq('period', period)
      .single();

    if (error || !data) return null;
    return typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
  }

  if (DB_TYPE === 'd1') {
    throw new Error('D1 database is only available in Cloudflare Workers. Use Supabase or SQLite for Node.js.');
  }

  // SQLite fallback
  const db = getSqliteDb();
  if (!db) return null;

  const stmt = db.prepare(`
    SELECT data FROM pixel_data
    WHERE indicator = ? AND climate = ? AND period = ?
  `);
  const row = stmt.get(indicator, climate, period) as { data: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.data);
}

/**
 * Get chart data from database
 */
export async function getChartData(
  model: string,
  indicator: string
): Promise<any | null> {
  if (DB_TYPE === 'supabase') {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('chart_data')
      .select('data')
      .eq('model', model)
      .eq('indicator', indicator)
      .single();

    if (error || !data) return null;
    return typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
  }

  if (DB_TYPE === 'd1') {
    throw new Error('D1 database is only available in Cloudflare Workers. Use Supabase or SQLite for Node.js.');
  }

  // SQLite fallback
  const db = getSqliteDb();
  if (!db) return null;

  const stmt = db.prepare(`
    SELECT data FROM chart_data
    WHERE model = ? AND indicator = ?
  `);
  const row = stmt.get(model, indicator) as { data: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.data);
}

/**
 * Close database connections
 */
export function closeDb(): void {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
  }
}
