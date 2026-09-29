-- Agrega la tercera pregunta (CES): "¿Qué tan fácil fue realizar su servicio con nosotros?" 1 a 5.
-- Las encuestas anteriores quedan con esfuerzo = NULL (no cuentan para el CES).
-- La API exige la respuesta en todas las encuestas nuevas.
USE satisfaccion;

ALTER TABLE encuestas_satisfaccion
  ADD COLUMN esfuerzo TINYINT UNSIGNED NULL AFTER recomendacion,
  ADD CONSTRAINT chk_esfuerzo CHECK (esfuerzo BETWEEN 1 AND 5);
