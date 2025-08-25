import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { runMigrations } from './db.js';
import { router } from './routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api', router);

const port = Number(process.env.PORT) || 4000;

runMigrations()
  .catch((err) => {
    console.warn('DB init failed (server will still start)', err?.code ?? err);
  })
  .finally(() => {
    app.listen(port, () => {
      console.log(`API listening on ${port}`);
    });
  });
