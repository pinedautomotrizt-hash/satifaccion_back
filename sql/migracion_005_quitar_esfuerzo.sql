-- OPCIONAL: elimina la columna de la pregunta de facilidad (CES), que ya no se usa.
-- ATENCIÓN: borra las respuestas de facilidad ya guardadas. La app funciona igual sin ejecutar esto.
USE satisfaccion;

ALTER TABLE encuestas_satisfaccion
  DROP CHECK chk_esfuerzo,
  DROP COLUMN esfuerzo;
