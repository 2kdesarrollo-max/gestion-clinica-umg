-- ============================================================
-- Script: 08_concurrencia.sql
-- Usuario: admin_concurrencia / Concurrencia123
-- Base de datos: XEPDB1
-- REQUIERE DOS SESIONES SIMULTANEAS
-- ============================================================

-- ESCENARIO 1: Lectura Sucia
-- SESION A: Modificar sin commit
UPDATE SUPERADMIN.RESERVAS SET estado = 'CANCELADA' WHERE id_reserva = 1;
-- NO EJECUTAR COMMIT TODAVIA

-- SESION B: Leer (Oracle muestra valor original por MVCC)
SELECT estado FROM SUPERADMIN.RESERVAS WHERE id_reserva = 1;
-- Resultado esperado: valor ORIGINAL (Oracle no permite dirty reads)

-- SESION A: Hacer rollback para limpiar
ROLLBACK;

-- -------------------------------------------------------

-- ESCENARIO 2: Lectura No Repetible
-- SESION A: Primera lectura
SELECT estado FROM SUPERADMIN.QUIROFANOS WHERE id_quirofano = 1;

-- SESION B: Modificar y commit
UPDATE SUPERADMIN.QUIROFANOS SET estado = 'MANTENIMIENTO' WHERE id_quirofano = 1;
COMMIT;

-- SESION A: Segunda lectura (valor diferente)
SELECT estado FROM SUPERADMIN.QUIROFANOS WHERE id_quirofano = 1;

-- SESION B: Restaurar
UPDATE SUPERADMIN.QUIROFANOS SET estado = 'DISPONIBLE' WHERE id_quirofano = 1;
COMMIT;

-- -------------------------------------------------------

-- ESCENARIO 3: Phantom Reads
-- SESION A: Contar reservas de hoy
SELECT COUNT(*) FROM SUPERADMIN.RESERVAS
WHERE TRUNC(fecha_reserva) = TRUNC(SYSDATE);

-- SESION B: Insertar nueva reserva y commit
INSERT INTO SUPERADMIN.RESERVAS VALUES (
  9999, 1, 1, 1, 1, NULL, 'PRUEBA PHANTOM', 'Test phantom read',
  SYSDATE, SYSDATE + 1/24, SYSDATE + 2/24,
  'SOLICITADA', 'NORMAL', SYSDATE, 'admin_concurrencia', NULL
);
COMMIT;

-- SESION A: Contar de nuevo (resultado diferente)
SELECT COUNT(*) FROM SUPERADMIN.RESERVAS
WHERE TRUNC(fecha_reserva) = TRUNC(SYSDATE);

-- Limpiar
DELETE FROM SUPERADMIN.RESERVAS WHERE id_reserva = 9999;
COMMIT;

-- -------------------------------------------------------

-- ESCENARIO 4: DBMS_LOCK con timeout
-- SESION A: Adquirir bloqueo exclusivo
DECLARE v VARCHAR2(128); r INTEGER;
BEGIN
  DBMS_LOCK.ALLOCATE_UNIQUE('QUIROFANO_1_LOCK', v);
  r := DBMS_LOCK.REQUEST(v, DBMS_LOCK.X_MODE, 30);
  DBMS_OUTPUT.PUT_LINE('Bloqueo adquirido. Resultado: ' || r);
  DBMS_LOCK.SLEEP(20);
  r := DBMS_LOCK.RELEASE(v);
  DBMS_OUTPUT.PUT_LINE('Bloqueo liberado');
END;
/

-- SESION B: Intentar mismo bloqueo (timeout 5 segundos)
DECLARE v VARCHAR2(128); r INTEGER;
BEGIN
  DBMS_LOCK.ALLOCATE_UNIQUE('QUIROFANO_1_LOCK', v);
  r := DBMS_LOCK.REQUEST(v, DBMS_LOCK.X_MODE, 5);
  IF r = 1 THEN
    DBMS_OUTPUT.PUT_LINE('TIMEOUT: bloqueo no disponible');
  END IF;
END;
/

-- -------------------------------------------------------

-- ESCENARIO 5: Prioridad de emergencias
-- SESION A: Reserva normal en proceso
INSERT INTO SUPERADMIN.RESERVAS VALUES (
  8888, 1, 1, 1, 1, NULL, 'CIRUGIA NORMAL', 'Cirugia programada',
  SYSDATE, SYSDATE+1/24, SYSDATE+2/24,
  'APROBADA', 'NORMAL', SYSDATE, 'admin_concurrencia', NULL
);
-- NO HACER COMMIT

-- SESION B: Emergencia critica en mismo quirofano
INSERT INTO SUPERADMIN.EMERGENCIAS VALUES (
  9001, 1, 1, 1, 'CRITICA',
  'Emergencia cardiaca urgente', SYSDATE, 'ACTIVA', NULL
);
COMMIT;
-- El trigger TRG_PRIORIDAD_EMERGENCIA cancela la reserva normal

-- SESION A: Verificar
COMMIT;
SELECT id_reserva, estado FROM SUPERADMIN.RESERVAS WHERE id_reserva = 8888;

-- -------------------------------------------------------

-- ESCENARIO 6: MVCC
-- SESION A: SET TRANSACTION READ ONLY
SET TRANSACTION READ ONLY;
SELECT estado FROM SUPERADMIN.QUIROFANOS WHERE id_quirofano = 2;

-- SESION B: Modificar y commit
UPDATE SUPERADMIN.QUIROFANOS SET estado = 'OCUPADO' WHERE id_quirofano = 2;
COMMIT;

-- SESION A: Sigue viendo version original
SELECT estado FROM SUPERADMIN.QUIROFANOS WHERE id_quirofano = 2;
COMMIT;

-- Verificar en V$SESSION y V$LOCK
SELECT sid, serial#, username, status, event
FROM V$SESSION WHERE username = 'ADMIN_CONCURRENCIA';

SELECT l.sid, s.username, l.type, l.lmode, l.request
FROM V$LOCK l JOIN V$SESSION s ON l.sid = s.sid
WHERE s.username = 'ADMIN_CONCURRENCIA';
