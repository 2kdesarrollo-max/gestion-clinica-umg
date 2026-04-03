-- ============================================================
-- Script: 06_materialized_views.sql
-- Usuario: admin_optimizacion / Optimizacion123
-- Base de datos: XEPDB1
-- ============================================================

-- MV 1: Disponibilidad de quirofanos
CREATE MATERIALIZED VIEW SUPERADMIN.MV_DISPONIBILIDAD_QUIROFANOS
BUILD IMMEDIATE
REFRESH COMPLETE ON DEMAND
AS
SELECT q.id_quirofano, q.nombre, q.piso, q.estado,
       COUNT(r.id_reserva) reservas_activas,
       CASE WHEN q.estado = 'DISPONIBLE'
            AND COUNT(r.id_reserva) = 0
            THEN 'LIBRE' ELSE 'OCUPADO' END disponibilidad
FROM SUPERADMIN.QUIROFANOS q
LEFT JOIN SUPERADMIN.RESERVAS r
  ON q.id_quirofano = r.id_quirofano
  AND r.estado IN ('APROBADA','EN_CURSO')
  AND TRUNC(r.fecha_reserva) = TRUNC(SYSDATE)
WHERE q.activo = 1
GROUP BY q.id_quirofano, q.nombre, q.piso, q.estado;

CREATE INDEX IDX_MV_DISPONIBILIDAD
  ON SUPERADMIN.MV_DISPONIBILIDAD_QUIROFANOS(id_quirofano);

-- MV 2: Estadisticas por medico
CREATE MATERIALIZED VIEW SUPERADMIN.MV_ESTADISTICAS_MEDICOS
BUILD IMMEDIATE
REFRESH COMPLETE ON DEMAND
AS
SELECT m.id_medico, m.nombre, m.apellido,
       e.nombre especialidad,
       COUNT(r.id_reserva) total_reservas,
       SUM(CASE WHEN r.estado = 'COMPLETADA' THEN 1 ELSE 0 END) completadas,
       SUM(CASE WHEN r.estado = 'CANCELADA' THEN 1 ELSE 0 END) canceladas
FROM SUPERADMIN.MEDICOS m
LEFT JOIN SUPERADMIN.ESPECIALIDADES e
  ON m.id_especialidad = e.id_especialidad
LEFT JOIN SUPERADMIN.RESERVAS r
  ON m.id_medico = r.id_medico
WHERE m.activo = 1
GROUP BY m.id_medico, m.nombre, m.apellido, e.nombre;

-- MV 3: Ocupacion mensual de quirofanos
CREATE MATERIALIZED VIEW SUPERADMIN.MV_OCUPACION_QUIROFANOS
BUILD IMMEDIATE
REFRESH COMPLETE ON DEMAND
AS
SELECT q.id_quirofano, q.nombre,
       COUNT(r.id_reserva) total_reservas_mes,
       ROUND(COUNT(r.id_reserva) / 30 * 100, 2) porcentaje_ocupacion
FROM SUPERADMIN.QUIROFANOS q
LEFT JOIN SUPERADMIN.RESERVAS r
  ON q.id_quirofano = r.id_quirofano
  AND r.estado NOT IN ('CANCELADA')
  AND TRUNC(r.fecha_reserva,'MM') = TRUNC(SYSDATE,'MM')
WHERE q.activo = 1
GROUP BY q.id_quirofano, q.nombre;

COMMIT;
