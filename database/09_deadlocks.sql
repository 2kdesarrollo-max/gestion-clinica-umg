-- ============================================================
-- Script: 09_deadlocks.sql
-- Usuario: admin_concurrencia / Concurrencia123
-- Base de datos: XEPDB1
-- REQUIERE DOS SESIONES SIMULTANEAS
-- ============================================================

-- PARTE 1: Provocar deadlock real
-- SESION A (ejecutar primero):
UPDATE SUPERADMIN.QUIROFANOS SET estado='OCUPADO' WHERE id_quirofano=1;
-- Esperar 5 segundos, luego ejecutar:
UPDATE SUPERADMIN.QUIROFANOS SET estado='OCUPADO' WHERE id_quirofano=2;
-- Oracle lanzara ORA-00060 aqui

-- SESION B (ejecutar mientras Sesion A espera):
UPDATE SUPERADMIN.QUIROFANOS SET estado='OCUPADO' WHERE id_quirofano=2;
-- Esperar 5 segundos, luego ejecutar:
UPDATE SUPERADMIN.QUIROFANOS SET estado='OCUPADO' WHERE id_quirofano=1;
-- Oracle lanzara ORA-00060 aqui

-- PARTE 2: Deteccion del deadlock
SELECT l.sid, s.username, l.type, l.lmode, l.request, l.block
FROM V$LOCK l JOIN V$SESSION s ON l.sid = s.sid
WHERE l.block = 1 OR l.request > 0;

SELECT sid, event, wait_time, seconds_in_wait
FROM V$SESSION WHERE event LIKE '%enq%';

-- PARTE 3: Ver trace del deadlock
SELECT value FROM V$DIAG_INFO WHERE name = 'Diag Trace';

-- PARTE 4: Prevencion con orden ascendente de IDs
CREATE OR REPLACE PROCEDURE SP_RESERVAR_CON_ORDEN (
  p_id_quirofano1 IN NUMBER,
  p_id_quirofano2 IN NUMBER
) AS
  v_primero NUMBER;
  v_segundo NUMBER;
BEGIN
  IF p_id_quirofano1 < p_id_quirofano2 THEN
    v_primero := p_id_quirofano1;
    v_segundo := p_id_quirofano2;
  ELSE
    v_primero := p_id_quirofano2;
    v_segundo := p_id_quirofano1;
  END IF;
  UPDATE SUPERADMIN.QUIROFANOS SET estado='OCUPADO' WHERE id_quirofano=v_primero;
  UPDATE SUPERADMIN.QUIROFANOS SET estado='OCUPADO' WHERE id_quirofano=v_segundo;
  COMMIT;
  DBMS_OUTPUT.PUT_LINE('Reserva sin deadlock completada.');
END SP_RESERVAR_CON_ORDEN;
/

ROLLBACK;
COMMIT;
