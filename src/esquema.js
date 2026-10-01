import { pool } from './db.js';

// Crea las tablas si no existen (por ejemplo, en una base nueva en Railway).
// Si ya existen no hace nada, así que es seguro ejecutarlo en cada arranque.
// Mantener sincronizado con sql/schema.sql.
const TABLAS = [
  `CREATE TABLE IF NOT EXISTS ordenes_trabajo (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    numero_ot         VARCHAR(30)  NOT NULL,
    local             VARCHAR(80)  NULL,
    placa             VARCHAR(15)  NOT NULL,
    placa_normalizada VARCHAR(15)  NOT NULL,
    documento_cliente VARCHAR(20)  NULL,
    cliente           VARCHAR(150) NULL,
    marca             VARCHAR(60)  NULL,
    modelo            VARCHAR(60)  NULL,
    asesor            VARCHAR(120) NULL,
    servicio          VARCHAR(120) NULL,
    estado            ENUM('APERTURADO','CERRADO','FACTURADO','LIQUIDADO') NOT NULL,
    fecha_apertura    DATETIME     NULL,
    fecha_cierre      DATETIME     NULL,
    fecha_entrega     DATETIME     NULL,
    fecha_factura     DATETIME     NULL,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_numero_ot (numero_ot),
    KEY idx_placa (placa_normalizada)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS encuestas_satisfaccion (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    orden_id       INT UNSIGNED NOT NULL,
    satisfaccion   TINYINT UNSIGNED NOT NULL,
    recomendacion  TINYINT UNSIGNED NOT NULL,
    comentario     VARCHAR(500) NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_orden (orden_id),
    KEY idx_fecha (created_at),
    CONSTRAINT fk_encuesta_orden FOREIGN KEY (orden_id) REFERENCES ordenes_trabajo(id),
    CONSTRAINT chk_satisfaccion CHECK (satisfaccion BETWEEN 1 AND 3),
    CONSTRAINT chk_recomendacion CHECK (recomendacion BETWEEN 0 AND 10)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS importaciones (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    archivo     VARCHAR(255) NOT NULL,
    filas       INT UNSIGNED NOT NULL,
    ordenes     INT UNSIGNED NOT NULL,
    errores     INT UNSIGNED NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

export async function prepararBaseDeDatos() {
  for (const sql of TABLAS) await pool.query(sql);
}
