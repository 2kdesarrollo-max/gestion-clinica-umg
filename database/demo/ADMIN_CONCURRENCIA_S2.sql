SET SERVEROUTPUT ON
SET PAGESIZE 200
SET LINESIZE 200

PROMPT ============================================================
PROMPT ADMIN_CONCURRENCIA - Sesion 2 (S2)
PROMPT Ejecutar en segunda conexion, en paralelo a S1.
PROMPT ============================================================

PROMPT
PROMPT 1) Phantom / No repetible (INSERT + COMMIT)
PROMPT Esto fuerza que S1 vea un conteo distinto en su segunda lectura.
PROMPT

DECLARE
  v_paciente NUMBER;
  v_medico NUMBER;
  v_quirofano NUMBER;
  v_especialidad NUMBER;
BEGIN
  SELECT id_paciente INTO v_paciente FROM SUPERADMIN.PACIENTES WHERE activo = 1 FETCH FIRST 1 ROWS ONLY;
  SELECT id_medico INTO v_medico FROM SUPERADMIN.MEDICOS WHERE activo = 1 FETCH FIRST 1 ROWS ONLY;
  SELECT id_quirofano INTO v_quirofano FROM SUPERADMIN.QUIROFANOS WHERE activo = 1 FETCH FIRST 1 ROWS ONLY;
  SELECT id_especialidad INTO v_especialidad FROM SUPERADMIN.ESPECIALIDADES FETCH FIRST 1 ROWS ONLY;

  INSERT INTO SUPERADMIN.RESERVAS (
    id_reserva, id_paciente, id_medico, id_quirofano, id_especialidad,
    tipo_cirugia, descripcion_necesidad, fecha_reserva, hora_inicio, hora_fin,
    estado, prioridad, fecha_creacion, creado_por, observaciones
  ) VALUES (
    SUPERADMIN.SEQ_RESERVAS.NEXTVAL, v_paciente, v_medico, v_quirofano, v_especialidad,
    'PRUEBA_CONCURRENCIA', 'Insert para phantom', TRUNC(SYSDATE),
    TRUNC(SYSDATE) + (8/24), TRUNC(SYSDATE) + (9/24),
    'SOLICITADA', 'NORMAL', SYSDATE, 'ADMIN_CONCURRENCIA', NULL
  );
  COMMIT;
  DBMS_OUTPUT.PUT_LINE('INSERT+COMMIT ejecutado. S1 debe ver cambio en conteo.');
END;
/

PROMPT
PROMPT 2) DBMS_LOCK (retener lock por 20s)
PROMPT S1 intentara tomar el lock con timeout 5s.
PROMPT

DECLARE
  v_ret NUMBER;
BEGIN
  v_ret := DBMS_LOCK.REQUEST(id => 9999, lockmode => DBMS_LOCK.X_MODE, timeout => 5, release_on_commit => TRUE);
  DBMS_OUTPUT.PUT_LINE('Lock tomado retorno=' || v_ret || '. Manteniendo 20s...');
  DBMS_LOCK.SLEEP(20);
  COMMIT;
  DBMS_OUTPUT.PUT_LINE('Lock liberado.');
END;
/

PROMPT
PROMPT 3) Bloqueo por fila (intenta actualizar el mismo registro bloqueado por S1)
PROMPT Esto se quedara esperando hasta que S1 haga ROLLBACK/COMMIT.
PROMPT

DECLARE
  v_id NUMBER;
BEGIN
  SELECT id_paciente INTO v_id FROM SUPERADMIN.PACIENTES WHERE activo = 1 FETCH FIRST 1 ROWS ONLY;
  UPDATE SUPERADMIN.PACIENTES SET telefono = telefono WHERE id_paciente = v_id;
  COMMIT;
  DBMS_OUTPUT.PUT_LINE('UPDATE ejecutado. Si no espero, es que no habia lock.');
END;
/

