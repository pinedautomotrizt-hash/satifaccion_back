-- Para bases creadas con la versión anterior (una sola pregunta).
-- Agrega la pregunta de recomendación (0 a 10) y renombra "nivel" a "satisfaccion".
-- ATENCIÓN: borra las encuestas existentes (no tienen respuesta de recomendación).
-- Ejecutar solo si todavía no hay encuestas reales.
USE satisfaccion;

DELETE FROM encuestas_satisfaccion;

ALTER TABLE encuestas_satisfaccion
  DROP CHECK chk_nivel,
  CHANGE nivel satisfaccion TINYINT UNSIGNED NOT NULL,
  ADD COLUMN recomendacion TINYINT UNSIGNED NOT NULL AFTER satisfaccion,
  ADD CONSTRAINT chk_satisfaccion CHECK (satisfaccion BETWEEN 1 AND 3),
  ADD CONSTRAINT chk_recomendacion CHECK (recomendacion BETWEEN 0 AND 10);
