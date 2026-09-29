/** "abc-123 " -> "ABC123" */
export function normalizarPlaca(placa) {
  return String(placa ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Convierte el texto del estado del reporte a uno de: APERTURADO, CERRADO, FACTURADO, LIQUIDADO */
export function normalizarEstado(estado) {
  const e = sinTildes(String(estado ?? '')).toUpperCase().trim();
  if (e.startsWith('APERT') || e.startsWith('ABIERT')) return 'APERTURADO';
  if (e.startsWith('CERRAD')) return 'CERRADO';
  if (e.startsWith('FACTUR')) return 'FACTURADO';
  if (e.startsWith('LIQUID')) return 'LIQUIDADO';
  return null;
}

/** "N° de OT" -> "n_de_ot" */
export function normalizarEncabezado(texto) {
  return sinTildes(String(texto ?? ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Acepta Date, "dd/mm/yyyy [hh:mm]", "yyyy-mm-dd [hh:mm:ss]". Devuelve "yyyy-mm-dd hh:mm:ss" o null. */
export function normalizarFecha(valor) {
  if (valor == null || valor === '') return null;
  if (valor instanceof Date && !isNaN(valor)) return formatear(valor);
  if (typeof valor === 'number') {
    // Número de serie de Excel (días desde 1899-12-30)
    return formatear(new Date(Math.round((valor - 25569) * 86400) * 1000));
  }

  const texto = String(valor).trim();
  let m = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const [, d, mes, a, h = '0', min = '0', s = '0'] = m;
    return formatear(new Date(Date.UTC(+a, +mes - 1, +d, +h, +min, +s)));
  }
  m = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const [, a, mes, d, h = '0', min = '0', s = '0'] = m;
    return formatear(new Date(Date.UTC(+a, +mes - 1, +d, +h, +min, +s)));
  }
  return null;
}

function formatear(fecha) {
  // Las fechas de Excel llegan en UTC con la hora "de pared", por eso se usan los getters UTC
  const p = (n) => String(n).padStart(2, '0');
  return `${fecha.getUTCFullYear()}-${p(fecha.getUTCMonth() + 1)}-${p(fecha.getUTCDate())} ` +
    `${p(fecha.getUTCHours())}:${p(fecha.getUTCMinutes())}:${p(fecha.getUTCSeconds())}`;
}

function sinTildes(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}
