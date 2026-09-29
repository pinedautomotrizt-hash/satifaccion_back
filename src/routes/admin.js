import { Router } from 'express';
import multer from 'multer';
import { pool } from '../db.js';
import { config } from '../config.js';
import { importarReporte, ErrorReporte } from '../lib/importar.js';

export const adminRouter = Router();
const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Todas las rutas de admin requieren la cabecera x-api-key
adminRouter.use((req, res, next) => {
  if (!config.adminApiKey || req.get('x-api-key') !== config.adminApiKey) {
    return res.status(401).json({ mensaje: 'Clave de administrador incorrecta.' });
  }
  next();
});

// POST /api/admin/importar  (multipart, campo "archivo": .xlsx o .csv del reporte de OT)
// Inserta las OT nuevas y actualiza estado/datos de las existentes (por número de OT).
adminRouter.post('/importar', subida.single('archivo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ mensaje: 'Adjunte el archivo del reporte.' });
  if (!/\.(xlsx|csv)$/i.test(req.file.originalname)) {
    return res.status(400).json({ mensaje: 'El archivo debe ser .xlsx o .csv.' });
  }

  try {
    res.json(await importarReporte(req.file.buffer, req.file.originalname));
  } catch (err) {
    if (err instanceof ErrorReporte) return res.status(400).json({ mensaje: err.message });
    throw err;
  }
});

// GET /api/admin/importaciones  -> últimas cargas del reporte
adminRouter.get('/importaciones', async (_req, res) => {
  const [filas] = await pool.query(
    `SELECT id, archivo, filas, ordenes, errores, created_at
       FROM importaciones ORDER BY id DESC LIMIT 10`,
  );
  res.json({ importaciones: filas });
});

// GET /api/admin/resumen?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
adminRouter.get('/resumen', async (req, res) => {
  const hoy = fechaLocal(new Date());
  const desde = /^\d{4}-\d{2}-\d{2}$/.test(req.query.desde) ? req.query.desde : hoy.slice(0, 8) + '01';
  const hasta = /^\d{4}-\d{2}-\d{2}$/.test(req.query.hasta) ? req.query.hasta : hoy;

  // El volumen es de cientos de encuestas al mes: se traen todas las del rango y se calcula aquí
  const [encuestas] = await pool.query(
    `SELECT e.id, e.satisfaccion, e.recomendacion, e.comentario, e.created_at,
            o.numero_ot, o.placa, o.cliente, o.marca, o.modelo, o.servicio, o.asesor, o.estado
       FROM encuestas_satisfaccion e
       JOIN ordenes_trabajo o ON o.id = e.orden_id
      WHERE e.created_at BETWEEN ? AND ?
      ORDER BY e.created_at DESC`,
    [`${desde} 00:00:00`, `${hasta} 23:59:59`],
  );

  res.json({
    desde, hasta,
    ...indicadores(encuestas),
    tendencia: tendencia(encuestas, desde, hasta),
    porAsesor: porAsesor(encuestas),
    detalle: encuestas.slice(0, 500),
  });
});

/**
 * Indicadores de un grupo de encuestas:
 *  - NPS  = % promotores (9-10) − % detractores (0-6), de -100 a 100
 *  - Satisfacción = % de caritas verdes
 */
function indicadores(encuestas) {
  const total = encuestas.length;
  const distNps = Array(11).fill(0);
  const distSat = [0, 0, 0];
  for (const e of encuestas) {
    distNps[e.recomendacion]++;
    distSat[e.satisfaccion - 1]++;
  }
  const suma = (arr, desde, hasta) => arr.slice(desde, hasta + 1).reduce((a, b) => a + b, 0);
  const promotores = suma(distNps, 9, 10);
  const pasivos = suma(distNps, 7, 8);
  const detractores = suma(distNps, 0, 6);
  const pct = (v, de) => (de ? Math.round((v / de) * 1000) / 10 : null);
  const redondear = (v) => Math.round(v * 10) / 10;

  return {
    total,
    nps: {
      valor: total ? Math.round(((promotores - detractores) / total) * 100) : null,
      promotores, pasivos, detractores,
      promedio: total ? redondear(distNps.reduce((a, c, i) => a + c * i, 0) / total) : null,
      distribucion: distNps,
    },
    satisfaccion: {
      pctSatisfechos: pct(distSat[2], total),
      distribucion: distSat,
    },
  };
}

/**
 * NPS por periodo, incluyendo los periodos sin encuestas.
 * Por día solo si hay suficientes encuestas diarias: con pocas respuestas un solo cliente
 * mueve el NPS de -100 a +100 y la línea no dice nada. Si no, por semana.
 */
function tendencia(encuestas, desde, hasta) {
  const inicio = new Date(`${desde}T00:00:00`);
  const fin = new Date(`${hasta}T00:00:00`);
  const dias = Math.round((fin - inicio) / 86_400_000) + 1;
  const porDia = dias <= 14 || (dias <= 62 && encuestas.length / dias >= 5);
  const agrupacion = porDia ? 'dia' : 'semana';

  const clave = (fecha) => {
    if (agrupacion === 'dia') return fecha;
    const d = new Date(`${fecha}T00:00:00`);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lunes de esa semana
    return fechaLocal(d);
  };

  const grupos = new Map();
  for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
    const k = clave(fechaLocal(d));
    if (!grupos.has(k)) grupos.set(k, []);
  }
  for (const e of encuestas) grupos.get(clave(e.created_at.slice(0, 10)))?.push(e);

  return {
    agrupacion,
    puntos: [...grupos].map(([periodo, lista]) => {
      const i = indicadores(lista);
      return { periodo, total: i.total, nps: i.nps.valor };
    }),
  };
}

function porAsesor(encuestas) {
  const grupos = new Map();
  for (const e of encuestas) {
    const k = e.asesor || 'Sin asesor';
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(e);
  }
  return [...grupos]
    .map(([asesor, lista]) => {
      const i = indicadores(lista);
      return {
        asesor, total: i.total, nps: i.nps.valor,
        pctSatisfechos: i.satisfaccion.pctSatisfechos,
      };
    })
    .sort((a, b) => b.total - a.total);
}

function fechaLocal(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
