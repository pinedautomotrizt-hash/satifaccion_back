-- Base de datos del sistema de satisfacción
CREATE DATABASE IF NOT EXISTS satisfaccion
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE satisfaccion;

-- Registro de órdenes de trabajo (se carga desde el reporte "Servicio de Órdenes de Trabajo por Local")
CREATE TABLE IF NOT EXISTS ordenes_trabajo (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero_ot         VARCHAR(30)  NOT NULL,          -- "Nro Orden"
  local             VARCHAR(80)  NULL,
  placa             VARCHAR(15)  NOT NULL,
  placa_normalizada VARCHAR(15)  NOT NULL,          -- placa sin guiones/espacios, en mayúsculas
  documento_cliente VARCHAR(20)  NULL,              -- "Cliente" (RUC / DNI)
  cliente           VARCHAR(150) NULL,              -- "Nombre Cliente"
  marca             VARCHAR(60)  NULL,
  modelo            VARCHAR(60)  NULL,
  asesor            VARCHAR(120) NULL,
  servicio          VARCHAR(120) NULL,          -- "Grupo Servicio" (ej. MANTENIMIENTO 50,000 KM)
  estado            ENUM('APERTURADO','CERRADO','FACTURADO','LIQUIDADO') NOT NULL,
  fecha_apertura    DATETIME     NULL,
  fecha_cierre      DATETIME     NULL,
  fecha_entrega     DATETIME     NULL,
  fecha_factura     DATETIME     NULL,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_numero_ot (numero_ot),
  KEY idx_placa (placa_normalizada)
) ENGINE=InnoDB;

-- Encuestas: una por orden de trabajo, con dos preguntas
--   satisfaccion  "¿Cuál es su satisfacción con el servicio?"  1 = Insatisfecho, 2 = Neutral, 3 = Satisfecho
--   recomendacion "¿Qué tan probable es que nos recomiende?"  0 a 10 (NPS)
--   comentario    opcional, solo se pide cuando la calificación es baja
CREATE TABLE IF NOT EXISTS encuestas_satisfaccion (
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
) ENGINE=InnoDB;

-- Registro de cargas del reporte de OT (botón Importar del panel /admin)
CREATE TABLE IF NOT EXISTS importaciones (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  archivo     VARCHAR(255) NOT NULL,
  filas       INT UNSIGNED NOT NULL,
  ordenes     INT UNSIGNED NOT NULL,
  errores     INT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
