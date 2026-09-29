import 'dotenv/config';

const lista = (valor) =>
  (valor ?? '').split(',').map((v) => v.trim()).filter(Boolean);

export const config = {
  port: Number(process.env.PORT) || 3000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'satisfaccion',
  },
  estadosPermitidos: lista(process.env.ESTADOS_PERMITIDOS || 'CERRADO').map((e) => e.toUpperCase()),
  adminApiKey: process.env.ADMIN_API_KEY || '',
  corsOrigin: lista(process.env.CORS_ORIGIN),
};
