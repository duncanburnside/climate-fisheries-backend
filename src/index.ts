import express, { Request, Response } from 'express';
import cors from 'cors';
import { handleZone } from './routes/zone';
import { handlePixel } from './routes/pixel';
import { handlePixelData } from './routes/pixel-data';
import { handleEmail } from './routes/email';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/zone', handleZone);
app.get('/pixel', handlePixel);
app.get('/pixel-data', handlePixelData);
app.post('/email', handleEmail);

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

const port = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;

