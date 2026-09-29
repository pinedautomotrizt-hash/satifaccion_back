-- Registro de cargas del reporte de OT (botón Importar del panel /admin)
USE satisfaccion;

CREATE TABLE IF NOT EXISTS importaciones (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  archivo     VARCHAR(255) NOT NULL,
  filas       INT UNSIGNED NOT NULL,
  ordenes     INT UNSIGNED NOT NULL,
  errores     INT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
