SET SERVEROUTPUT ON
SET PAGESIZE 200
SET LINESIZE 200

PROMPT ============================================================
PROMPT ADMIN_CONCURRENCIA - Sesion 1 (S1)
PROMPT Ejecutar en una conexion. Abrir otra conexion y correr S2.
PROMPT ============================================================

PROMPT
PROMPT 1) Phantom / No repetible (READ COMMITTED)
PROMPT En S2 se hara INSERT/COMMIT entre lecturas.
PROMPT

VARIABLE v_before NUMBER
VARIABLE v_after NUMBER

BEGIN
  SELECT COUNT(*) INTO :v_before FROM SUPERADMIN.RESERVAS WHERE TRUNC(fecha_reserva) = TRUNC(SYSDATE);
END;
/
PRINT v_before

PROMPT Ahora ejecuta el bloque 1 de S2 y luego vuelve aqui.
PROMPT

BEGIN
  SELECT COUNT(*) INTO :v_after FROM SUPERADMIN.RESERVAS WHERE TRUNC(fecha_reserva) = TRUNC(SYSDATE);
END;
/
PRINT v_after

PROMPT
PROMPT 2) DBMS_LOCK (espera/timeout)
PROMPT En S2 se tomara un lock logico por 20s. Aqui intentaras tomarlo con timeout 5s.
PROMPT

DECLARE
  v_ret NUMBER;
BEGIN
  v_ret := DBMS_LOCK.REQUEST(id => 9999, lockmode => DBMS_LOCK.X_MODE, timeout => 5, release_on_commit => TRUE);
  DBMS_OUTPUT.PUT_LINE('DBMS_LOCK.REQUEST retorno=' || v_ret || ' (0=OK, 1=TIMEOUT)');
END;
/

PROMPT
PROMPT 3) Bloqueo real por fila (UPDATE sin COMMIT)
PROMPT Aqui bloqueamos un registro de PACIENTES. S2 intentara actualizar el mismo.
PROMPT

DECLARE
  v_id NUMBER;
BEGIN
  SELECT id_paciente INTO v_id FROM SUPERADMIN.PACIENTES WHERE activo = 1 FETCH FIRST 1 ROWS ONLY;
  UPDATE SUPERADMIN.PACIENTES SET telefono = telefono WHERE id_paciente = v_id;
  DBMS_OUTPUT.PUT_LINE('Bloqueo tomado en PACIENTES.id_paciente=' || v_id || ' (NO COMMIT).');
END;
/

PROMPT Ejecuta el bloque 3 de S2 (se quedara esperando). Luego aqui ejecuta ROLLBACK para liberar.
PROMPT

ROLLBACK;

