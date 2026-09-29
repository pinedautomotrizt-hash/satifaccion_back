-- Datos de ejemplo para probar la app (opcional)
USE satisfaccion;

INSERT INTO ordenes_trabajo (numero_ot, local, placa, placa_normalizada, documento_cliente, cliente, marca, modelo, estado, fecha_apertura, fecha_cierre) VALUES
  ('OT-0001', 'Pineda Trujillo', 'ABC-123', 'ABC123', '10456789123', 'Juan Pérez',      'TOYOTA',  'HILUX',    'CERRADO',    '2026-09-25', '2026-09-28'),
  ('OT-0002', 'Pineda Trujillo', 'XYZ-789', 'XYZ789', '10987654321', 'María Gómez',     'HYUNDAI', 'TUCSON',   'APERTURADO', '2026-09-28', NULL),
  ('OT-0003', 'Pineda Trujillo', 'DEF-456', 'DEF456', '20123456789', 'Transportes SAC', 'NISSAN',  'FRONTIER', 'FACTURADO',  '2026-09-20', '2026-09-22')
ON DUPLICATE KEY UPDATE estado = VALUES(estado);
