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

- `DATA_DIR`: Path to the Data directory (defaults to `./Data`)
- `PORT`: Server port (defaults to 5000)
- `CONTACT_EMAIL`: Email address for contact form submissions

## API Endpoints

- `GET /zone` - Get zone data
- `GET /pixel` - Get pixel data
- `GET /pixel-data` - Get full pixel data array
- `POST /email` - Send email (placeholder)
- `GET /health` - Health check

## Deployment

This backend is designed to be deployed as a separate Vercel project. The `vercel.json` configuration handles routing for serverless functions.
