-- Agrega el servicio realizado ("Grupo Servicio" del reporte) a las órdenes de trabajo.
-- Después de ejecutarla, vuelva a importar el reporte para llenar el servicio de las OT existentes.
USE satisfaccion;

ALTER TABLE ordenes_trabajo
  ADD COLUMN servicio VARCHAR(120) NULL AFTER asesor;
