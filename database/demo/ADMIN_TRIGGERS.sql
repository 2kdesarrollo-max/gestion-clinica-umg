SET SERVEROUTPUT ON
SET PAGESIZE 200
SET LINESIZE 200

PROMPT ============================================================
PROMPT ADMIN_TRIGGERS - Triggers (compilar + pruebas)
PROMPT ============================================================

PROMPT 1) Compilar triggers del proyecto
@../03_triggers.sql

PROMPT 2) Probar trigger de inventario de equipos (INSERT/DELETE con ROLLBACK)
DECLARE
  v_equipo NUMBER;
  v_disp_before NUMBER;
  v_disp_after NUMBER;
  v_reserva NUMBER;
BEGIN
  SELECT id_equipo INTO v_equipo FROM SUPERADMIN.EQUIPOS WHERE activo = 1 FETCH FIRST 1 ROWS ONLY;
  SELECT cantidad_disponible INTO v_disp_before FROM SUPERADMIN.EQUIPOS WHERE id_equipo = v_equipo;

  SELECT id_reserva INTO v_reserva FROM SUPERADMIN.RESERVAS ORDER BY fecha_creacion DESC FETCH FIRST 1 ROWS ONLY;

  INSERT INTO SUPERADMIN.RESERVA_EQUIPOS (id_reserva_equipo, id_reserva, id_equipo, cantidad)
  VALUES (SUPERADMIN.SEQ_RESERVA_EQUIPOS.NEXTVAL, v_reserva, v_equipo, 1);

  SELECT cantidad_disponible INTO v_disp_after FROM SUPERADMIN.EQUIPOS WHERE id_equipo = v_equipo;
  DBMS_OUTPUT.PUT_LINE('Equipo='||v_equipo||' disponible antes='||v_disp_before||' despues='||v_disp_after);

  DELETE FROM SUPERADMIN.RESERVA_EQUIPOS WHERE id_reserva = v_reserva AND id_equipo = v_equipo;
  ROLLBACK;
END;
/

PROMPT 3) Probar trigger anti-traslape (intenta programar choque)
DECLARE
  v_paciente NUMBER;
  v_medico NUMBER;
  v_quirofano NUMBER;
  v_especialidad NUMBER;
  v_fecha DATE;
  v_hi DATE;
  v_hf DATE;
  v_id1 NUMBER;
  v_id2 NUMBER;
BEGIN
  SELECT id_paciente INTO v_paciente FROM SUPERADMIN.PACIENTES WHERE activo = 1 FETCH FIRST 1 ROWS ONLY;
  SELECT id_medico INTO v_medico FROM SUPERADMIN.MEDICOS WHERE activo = 1 FETCH FIRST 1 ROWS ONLY;
  SELECT id_quirofano INTO v_quirofano FROM SUPERADMIN.QUIROFANOS WHERE activo = 1 FETCH FIRST 1 ROWS ONLY;
  SELECT id_especialidad INTO v_especialidad FROM SUPERADMIN.ESPECIALIDADES FETCH FIRST 1 ROWS ONLY;

  v_fecha := TRUNC(SYSDATE) + 1;
  v_hi := v_fecha + (10/24);
  v_hf := v_fecha + (11/24);

  v_id1 := SUPERADMIN.SEQ_RESERVAS.NEXTVAL;
  INSERT INTO SUPERADMIN.RESERVAS (id_reserva,id_paciente,id_medico,id_quirofano,id_especialidad,tipo_cirugia,descripcion_necesidad,fecha_reserva,hora_inicio,hora_fin,estado,prioridad,fecha_creacion,creado_por,observaciones)
  VALUES (v_id1,v_paciente,v_medico,v_quirofano,v_especialidad,'PRUEBA1','ok',v_fecha,v_hi,v_hf,'APROBADA','NORMAL',SYSDATE,'ADMIN_TRIGGERS',NULL);

  v_id2 := SUPERADMIN.SEQ_RESERVAS.NEXTVAL;
  INSERT INTO SUPERADMIN.RESERVAS (id_reserva,id_paciente,id_medico,id_quirofano,id_especialidad,tipo_cirugia,descripcion_necesidad,fecha_reserva,hora_inicio,hora_fin,estado,prioridad,fecha_creacion,creado_por,observaciones)
  VALUES (v_id2,v_paciente,v_medico,v_quirofano,v_especialidad,'PRUEBA2','debe fallar',v_fecha,v_hi,v_hf,'APROBADA','NORMAL',SYSDATE,'ADMIN_TRIGGERS',NULL);

  COMMIT;
EXCEPTION
  WHEN OTHERS THEN
    DBMS_OUTPUT.PUT_LINE('Esperado (anti-traslape): ' || SQLERRM);
    ROLLBACK;
END;
/

