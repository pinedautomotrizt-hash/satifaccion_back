import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { pool } from './db.js';
import { ordenesRouter } from './routes/ordenes.js';
import { encuestasRouter } from './routes/encuestas.js';
import { adminRouter } from './routes/admin.js';

const app = express();

app.use(cors({ origin: config.corsOrigin.length ? config.corsOrigin : true }));
app.use(express.json());

app.get('/api/salud', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
});

app.use('/api/ordenes', ordenesRouter);
app.use('/api/encuestas', encuestasRouter);
app.use('/api/admin', adminRouter);

app.use((_req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada.' }));

// Express 5 envía aquí los errores de las rutas async
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ mensaje: 'Error interno del servidor.' });
});

app.listen(config.port, () => {
  console.log(`API de satisfacción escuchando en http://localhost:${config.port}`);
  console.log(`Estados que permiten votar: ${config.estadosPermitidos.join(', ')}`);
});
