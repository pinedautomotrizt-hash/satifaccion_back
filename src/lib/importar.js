import { pool } from '../db.js';
import { leerReporte } from './leerReporte.js';
import { normalizarPlaca, normalizarEstado, normalizarFecha } from './normalizar.js';

// Orden de avance de los estados (FACTURADO y LIQUIDADO son finales, mismo nivel)
const ORDEN_ESTADO = (col) =>
  `CASE ${col} WHEN 'APERTURADO' THEN 1 WHEN 'CERRADO' THEN 2 ELSE 3 END`;

/** Error de formato del archivo (se muestra tal cual al usuario). */
export class ErrorReporte extends Error {}

/**
 * Carga un reporte de OT en la base: inserta las nuevas y actualiza estado/datos de las existentes.
 * Registra la importación en la tabla `importaciones`.
 * @param {Buffer} buffer
 * @param {string} nombreArchivo
 */
export async function importarReporte(buffer, nombreArchivo) {
  let filas;
  try {
    filas = leerReporte(buffer, nombreArchivo);
  } catch (err) {
    throw new ErrorReporte(err.message);
  }

  // El reporte trae una fila por actividad: se agrupa por N° de orden
  const ordenes = new Map();
  const errores = new Map();
  for (const f of filas) {
    const numeroOt = String(f.numero_ot ?? '').trim();
    const placa = String(f.placa ?? '').trim().toUpperCase();
    const estado = normalizarEstado(f.estado);
    if (!numeroOt || !placa || !estado) {
      const clave = numeroOt || `sin número (${placa || 'sin placa'})`;
      errores.set(clave, !estado ? `Estado no reconocido: "${f.estado ?? ''}"` : 'Falta N° de orden o placa');
      continue;
    }
    const previa = ordenes.get(numeroOt);
    ordenes.set(numeroOt, [
      numeroOt.slice(0, 30), texto(f.local, 80), placa.slice(0, 15), normalizarPlaca(placa).slice(0, 15),
      texto(f.documento_cliente, 20), texto(f.cliente, 150), texto(f.marca, 60), texto(f.modelo, 60),
      texto(f.asesor, 120) ?? previa?.[8] ?? null, estado,
      normalizarFecha(f.fecha_apertura), normalizarFecha(f.fecha_cierre),
      normalizarFecha(f.fecha_entrega), normalizarFecha(f.fecha_factura),
      texto(f.servicio, 120) ?? previa?.[14] ?? null,
    ]);
  }
  const validas = [...ordenes.values()];

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    for (let i = 0; i < validas.length; i += 500) {
      await conexion.query(
        `INSERT INTO ordenes_trabajo
           (numero_ot, local, placa, placa_normalizada, documento_cliente, cliente, marca, modelo, asesor,
            estado, fecha_apertura, fecha_cierre, fecha_entrega, fecha_factura, servicio)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           local = VALUES(local), placa = VALUES(placa), placa_normalizada = VALUES(placa_normalizada),
           documento_cliente = VALUES(documento_cliente), cliente = VALUES(cliente),
           marca = VALUES(marca), modelo = VALUES(modelo), asesor = COALESCE(VALUES(asesor), asesor),
           -- El estado solo avanza (APERTURADO -> CERRADO -> FACTURADO/LIQUIDADO): si por error se sube
           -- un reporte antiguo, no se retrocede ni se reabre la votación de una OT ya facturada.
           estado = IF(${ORDEN_ESTADO('VALUES(estado)')} >= ${ORDEN_ESTADO('estado')}, VALUES(estado), estado),
           fecha_apertura = COALESCE(VALUES(fecha_apertura), fecha_apertura),
           fecha_cierre = COALESCE(VALUES(fecha_cierre), fecha_cierre),
           fecha_entrega = COALESCE(VALUES(fecha_entrega), fecha_entrega),
           fecha_factura = COALESCE(VALUES(fecha_factura), fecha_factura),
           servicio = COALESCE(VALUES(servicio), servicio)`,
        [validas.slice(i, i + 500)],
      );
    }
    await conexion.query(
      'INSERT INTO importaciones (archivo, filas, ordenes, errores) VALUES (?, ?, ?, ?)',
      [nombreArchivo.slice(0, 255), filas.length, validas.length, errores.size],
    );
    await conexion.commit();
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }

  const porEstado = {};
  for (const fila of validas) porEstado[fila[9]] = (porEstado[fila[9]] ?? 0) + 1;
  return {
    archivo: nombreArchivo,
    filas: filas.length,
    procesadas: validas.length,
    porEstado,
    errores: [...errores].map(([numero_ot, motivo]) => ({ numero_ot, motivo })),
  };
}

function texto(valor, max) {
  const t = String(valor ?? '').trim();
  return t ? t.slice(0, max) : null;
}
