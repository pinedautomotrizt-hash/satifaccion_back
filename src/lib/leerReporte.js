import * as XLSX from 'xlsx';
import { normalizarEncabezado } from './normalizar.js';

// Nombres de columna aceptados en el reporte (ya normalizados), en orden de preferencia.
// Formato principal: "Servicio de Órdenes de Trabajo por Local" (ServOrdTrabajoxLocal-Deta).
const ALIAS = {
  numero_ot: ['nro_orden', 'numero_orden', 'n_orden', 'nro_ot', 'numero_ot', 'n_ot', 'num_ot', 'ot', 'orden', 'orden_de_trabajo'],
  local: ['local', 'sucursal'],
  placa: ['placa', 'nro_placa', 'placa_vehiculo', 'n_placa'],
  cliente: ['nombre_cliente', 'razon_social', 'cliente'],
  documento_cliente: ['cliente', 'ruc', 'dni', 'nro_documento', 'documento'],
  marca: ['marca', 'marca_vehiculo'],
  modelo: ['modelo', 'modelo_vehiculo'],
  asesor: ['asesor', 'asesor_servicio'],
  servicio: ['grupo_servicio', 'servicio', 'tipo_servicio'],
  estado: ['estado', 'estado_ot', 'estado_orden'],
  fecha_apertura: ['fec_apertura', 'fecha_apertura', 'fecha_ingreso', 'fecha'],
  fecha_cierre: ['fec_cierre', 'fecha_cierre'],
  fecha_entrega: ['fec_entrega', 'fecha_entrega', 'fecha_salida'],
  fecha_factura: ['fec_factura', 'fecha_factura'],
};

/** Lee un .xlsx o .csv y devuelve filas como objetos con las claves de ALIAS. */
export function leerReporte(buffer, nombreArchivo) {
  const matriz = nombreArchivo.toLowerCase().endsWith('.csv')
    ? parsearCsv(decodificar(buffer))
    : leerXlsx(buffer);

  // El reporte trae filas de título antes de los encabezados
  const filaEncabezado = matriz.findIndex((fila) => {
    const c = mapearColumnas(fila);
    return c.placa !== undefined && c.estado !== undefined;
  });
  if (filaEncabezado === -1) {
    throw new Error('No se encontró la fila de encabezados (se necesitan las columnas "Placa" y "Estado").');
  }

  const columnas = mapearColumnas(matriz[filaEncabezado]);
  if (columnas.numero_ot === undefined) {
    throw new Error('Falta la columna "Nro Orden" en el reporte.');
  }
  // Si solo hay una columna "Cliente", es el nombre, no el documento
  if (columnas.documento_cliente === columnas.cliente) delete columnas.documento_cliente;

  return matriz.slice(filaEncabezado + 1)
    .filter((fila) => fila.some((celda) => celda !== null && celda !== ''))
    .map((fila) => Object.fromEntries(
      Object.entries(columnas).map(([campo, idx]) => [campo, fila[idx] ?? null]),
    ));
}

function mapearColumnas(encabezados) {
  const claves = encabezados.map(normalizarEncabezado);
  const columnas = {};
  for (const [campo, alias] of Object.entries(ALIAS)) {
    for (const a of alias) {
      const idx = claves.indexOf(a);
      if (idx !== -1) { columnas[campo] = idx; break; }
    }
  }
  return columnas;
}

function leerXlsx(buffer) {
  const libro = XLSX.read(buffer, { type: 'buffer' });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  // raw: las fechas reales llegan como número de serie y se convierten en normalizarFecha
  return XLSX.utils.sheet_to_json(hoja, { header: 1, defval: null, raw: true, blankrows: false })
    .map((fila) => fila.map((v) => (typeof v === 'string' ? v.trim() : v)));
}

/** El sistema del taller exporta los CSV en Latin-1; si el archivo es UTF-8 válido se respeta. */
function decodificar(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('latin1').decode(buffer);
  }
}

/** CSV con separador "," o ";" (Excel en español usa ";") y campos entre comillas. */
function parsearCsv(texto) {
  const lineas = texto.split(/\r?\n/, 10).join('\n');
  const sep = (lineas.match(/;/g) || []).length > (lineas.match(/,/g) || []).length ? ';' : ',';

  const filas = [];
  let fila = [], campo = '', comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (comillas) {
      if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') comillas = false;
      else campo += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) { fila.push(campo.trim()); campo = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo.trim()); filas.push(fila); fila = []; campo = '';
    } else campo += ch;
  }
  if (campo !== '' || fila.length) { fila.push(campo.trim()); filas.push(fila); }
  return filas;
}
