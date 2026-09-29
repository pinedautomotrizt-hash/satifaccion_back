import { Router } from 'express';
import { pool } from '../db.js';
import { config } from '../config.js';

export const ordenesRouter = Router();

// GET /api/ordenes/:numero
// Busca la OT por su número y dice si el cliente puede calificarla.
ordenesRouter.get('/:numero', async (req, res) => {
  const numero = String(req.params.numero ?? '').replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z0-9-]{4,30}$/.test(numero)) {
    return res.status(400).json({ mensaje: 'Ingrese un número de orden de trabajo válido.' });
  }

  const [[fila]] = await pool.query(
    `SELECT o.id, o.numero_ot, o.placa, o.cliente, o.marca, o.modelo, o.servicio, o.estado,
            o.fecha_apertura, o.fecha_cierre, e.id AS encuesta_id
       FROM ordenes_trabajo o
       LEFT JOIN encuestas_satisfaccion e ON e.orden_id = o.id
      WHERE o.numero_ot = ?`,
    [numero],
  );

  if (!fila) {
    return res.status(404).json({ mensaje: 'No encontramos esta orden de trabajo. Verifique el número.' });
  }

  const { encuesta_id, ...orden } = fila;
  if (encuesta_id !== null) {
    return res.json({ puedeVotar: false, mensaje: 'Esta orden de trabajo ya fue calificada. ¡Gracias!', orden });
  }
  if (!config.estadosPermitidos.includes(orden.estado)) {
    const mensaje = orden.estado === 'APERTURADO'
      ? 'Su vehículo aún está en servicio. Podrá calificarnos cuando la orden esté cerrada.'
      : 'Esta orden de trabajo no está disponible para calificar.';
    return res.json({ puedeVotar: false, mensaje, orden });
  }
  res.json({ puedeVotar: true, orden });
});
