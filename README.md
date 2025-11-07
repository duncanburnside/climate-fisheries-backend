# Climate Fisheries Backend

Node.js/TypeScript backend API for the Climate Fisheries application.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Production

```bash
npm start
```

## Environment Variables

### Local Development
- `DATA_DIR`: Path to the Data directory (defaults to `./Data`)
- `PORT`: Server port (defaults to 5000)
- `CONTACT_EMAIL`: Email address for contact form submissions

### Cloudflare R2 (Production)
When `R2_ACCESS_KEY_ID` is set, the application will fetch data from Cloudflare R2 instead of the local filesystem.

Create a `.env.local` file in the project root with:

```env
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_ENDPOINT=https://3617e178a84ccd9084eced8f55c34fe1.r2.cloudflarestorage.com
R2_BUCKET=climate-fisheries-data
CLOUDFLARE_API_TOKEN=your-api-token
```

**Note:** `.env.local` is gitignored and should not be committed. For production (Vercel), set these as environment variables in your Vercel project settings.

### Uploading Data Folder to R2

To upload your local `Data` folder to Cloudflare R2:

1. **Create `.env.local` file** with your R2 credentials (see Environment Variables section)

2. **Run the upload script**:
```bash
npm run upload-r2
```

This script will:
1. Scan your local `Data` directory
2. Upload all files to R2 with controlled concurrency (20 files at a time)
3. Show progress every 100 files
4. Maintain the same directory structure in R2

The script is designed to efficiently upload files with controlled concurrency, processing files in batches of 20 to balance speed and cost.

**Note:** The script automatically loads credentials from `.env.local` for local development.

## Database

Instead of storing thousands of JSON files (1.2GB uncompressed), you can use a database. This provides:

- **Much smaller size**: The database compresses JSON data efficiently (similar to the 33MB zip compression)
- **Faster queries**: Indexed database queries are much faster than reading individual files
- **Easier deployment**: Single database instead of thousands of JSON files
- **Backward compatible**: The API automatically falls back to file system (or R2) if database is not available

The application supports three database options:

1. **Supabase** (PostgreSQL) - Recommended for production/cloud deployments
2. **Cloudflare D1** (SQLite) - For Cloudflare Workers deployments
3. **SQLite** (local) - For local development

### Database Configuration

Set the `DB_TYPE` environment variable in `.env.local`:

```env
# For Supabase (recommended for Vercel/production)
DB_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# For SQLite (local development)
DB_TYPE=sqlite
DB_PATH=./data.db

# For Cloudflare D1 (only works in Cloudflare Workers)
DB_TYPE=d1
```

### Supabase Setup (Recommended)

Supabase is a PostgreSQL-based backend-as-a-service, perfect for production deployments on Vercel.

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Run the SQL schema** in your Supabase SQL Editor:
   ```bash
   # Copy the schema from scripts/supabase-schema.sql
   # Or run it directly in the Supabase dashboard
   ```

3. **Add credentials to `.env.local`**:
   ```env
   DB_TYPE=supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-supabase-anon-key
   ```

4. **Migrate your data**:
   ```bash
   npm run migrate-supabase
   ```

This will upload all JSON files from your `Data` directory to Supabase in batches.

### Cloudflare D1 Setup

Cloudflare D1 is a serverless SQLite database that works with Cloudflare Workers. **Note:** D1 is only available in Cloudflare Workers context, not in Node.js. If you're deploying to Vercel, use Supabase instead.

For Cloudflare Workers deployments:
1. Create a D1 database in your Cloudflare dashboard
2. Bind it to your Worker in `wrangler.toml`
3. Set `DB_TYPE=d1` in your environment variables

### SQLite Setup (Local Development)

For local development, you can use SQLite:

1. **Migrate your data**:
   ```bash
   npm run migrate-db
   ```

**Note:** `better-sqlite3` requires C++20 support. If you encounter build errors, you may need to:
- Update your C++ compiler (Xcode Command Line Tools on macOS)
- Use a Node.js version that has pre-built binaries available
- Or use Supabase instead (recommended)

The database will be created at `data.db` in the project root (or `DB_PATH` if set in `.env.local`).

### Using the Database

Once configured, the API will automatically use the database instead of reading files. The API routes have built-in fallback logic:

1. **First**: Try to query the database
2. **Fallback**: If database is not available or data not found, use file system (or R2)

This means you can:
- Use Supabase for production deployments
- Use SQLite for faster local development
- Still fall back to R2 if needed

### Database Schema

All database types use the same schema with three main tables:

- **`zone_data`**: Stores zone data from `MODEL/{model}/{indicator}/{climate}/{zoneId}.json`
  - Primary key: `(model, indicator, climate, zone_id)`
- **`pixel_data`**: Stores pixel data from `PIXEL/{indicator}/{climate}/{period}.json`
  - Primary key: `(indicator, climate, period)`
- **`chart_data`**: Stores chart data from `ZONECHART/{model}/{indicator}.json`
  - Primary key: `(model, indicator)`

All tables are indexed for fast queries. JSON data is stored as JSONB (PostgreSQL) or TEXT (SQLite).

## API Endpoints

- `GET /zone` - Get zone data
- `GET /pixel` - Get pixel data
- `GET /pixel-data` - Get full pixel data array
- `POST /email` - Send email (placeholder)
- `GET /health` - Health check

## Deployment

This backend is designed to be deployed as a separate Vercel project. The `vercel.json` configuration handles routing for serverless functions.
