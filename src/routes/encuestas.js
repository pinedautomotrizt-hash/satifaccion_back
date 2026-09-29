import { Router } from 'express';
import { pool } from '../db.js';
import { config } from '../config.js';

export const encuestasRouter = Router();

// POST /api/encuestas  { orden_id, satisfaccion: 1..3, recomendacion: 0..10, comentario? }
encuestasRouter.post('/', async (req, res) => {
  const ordenId = Number(req.body?.orden_id);
  const satisfaccion = Number(req.body?.satisfaccion);
  const recomendacion = Number(req.body?.recomendacion);
  const comentario = String(req.body?.comentario ?? '').trim().slice(0, 500) || null;

  if (
    !Number.isInteger(ordenId) ||
    ![1, 2, 3].includes(satisfaccion) ||
    !Number.isInteger(recomendacion) || recomendacion < 0 || recomendacion > 10
  ) {
    return res.status(400).json({ mensaje: 'Datos de la encuesta inválidos.' });
  }

  const [[orden]] = await pool.query('SELECT estado FROM ordenes_trabajo WHERE id = ?', [ordenId]);
  if (!orden) return res.status(404).json({ mensaje: 'La orden de trabajo no existe.' });
  if (!config.estadosPermitidos.includes(orden.estado)) {
    return res.status(409).json({ mensaje: 'Esta orden de trabajo no está disponible para calificar.' });
  }

  try {
    const [r] = await pool.query(
      `INSERT INTO encuestas_satisfaccion (orden_id, satisfaccion, recomendacion, comentario)
       VALUES (?, ?, ?, ?)`,
      [ordenId, satisfaccion, recomendacion, comentario],
    );
    res.status(201).json({ id: r.insertId, mensaje: '¡Gracias por su calificación!' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'Esta orden de trabajo ya fue calificada.' });
    }
    throw err;
  }
});
