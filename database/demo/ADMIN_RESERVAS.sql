SET SERVEROUTPUT ON
SET PAGESIZE 200
SET LINESIZE 200

PROMPT ============================================================
PROMPT ADMIN_RESERVAS - Operaciones (reservar/programar/cancelar)
PROMPT ============================================================

PROMPT 1) Reserva -> Programacion -> Cancelacion (y cleanup)
DECLARE
  v_paciente NUMBER;
  v_medico NUMBER;
  v_quirofano NUMBER;
  v_especialidad NUMBER;
  v_id NUMBER;
  v_fecha DATE;
  v_hi DATE;
  v_hf DATE;
BEGIN
  SELECT id_paciente INTO v_paciente FROM SUPERADMIN.PACIENTES WHERE activo = 1 FETCH FIRST 1 ROWS ONLY;
  SELECT id_medico INTO v_medico FROM SUPERADMIN.MEDICOS WHERE activo = 1 FETCH FIRST 1 ROWS ONLY;
  SELECT id_quirofano INTO v_quirofano FROM SUPERADMIN.QUIROFANOS WHERE activo = 1 FETCH FIRST 1 ROWS ONLY;
  SELECT id_especialidad INTO v_especialidad FROM SUPERADMIN.ESPECIALIDADES FETCH FIRST 1 ROWS ONLY;

  v_fecha := TRUNC(SYSDATE) + 2;
  v_hi := v_fecha + (8/24);
  v_hf := v_fecha + (9/24);

  SP_RESERVAR_QUIROFANO(
    p_id_paciente => v_paciente,
    p_id_medico => v_medico,
    p_id_quirofano => v_quirofano,
    p_id_especialidad => v_especialidad,
    p_tipo_cirugia => 'DEMO_RESERVA',
    p_descripcion => 'Creada por ADMIN_RESERVAS',
    p_fecha => v_fecha,
    p_hora_inicio => v_hi,
    p_hora_fin => v_hf,
    p_prioridad => 'NORMAL',
    p_creado_por => 'ADMIN_RESERVAS',
    p_id_reserva => v_id
  );
  COMMIT;
  DBMS_OUTPUT.PUT_LINE('Reserva creada ID=' || v_id);

  UPDATE SUPERADMIN.RESERVAS
  SET estado = 'APROBADA',
      observaciones = 'Aprobada por recepcion'
  WHERE id_reserva = v_id;
  COMMIT;
  DBMS_OUTPUT.PUT_LINE('Reserva programada ID=' || v_id);

  SP_CANCELAR_RESERVA(v_id, 'Cancelacion demo', 'ADMIN_RESERVAS');
  COMMIT;
  DBMS_OUTPUT.PUT_LINE('Cancelada ID=' || v_id);

  DELETE FROM SUPERADMIN.RESERVA_EQUIPOS WHERE id_reserva = v_id;
  DELETE FROM SUPERADMIN.VALIDACIONES WHERE id_reserva = v_id;
  DELETE FROM SUPERADMIN.CONFIRMACIONES WHERE id_reserva = v_id;
  DELETE FROM SUPERADMIN.REPROGRAMACIONES WHERE id_reserva = v_id;
  DELETE FROM SUPERADMIN.AUDITORIA_RESERVAS WHERE tabla_afectada = 'RESERVAS' AND id_registro = v_id;
  DELETE FROM SUPERADMIN.RESERVAS WHERE id_reserva = v_id;
  COMMIT;
  DBMS_OUTPUT.PUT_LINE('Cleanup completo ID=' || v_id);
END;
/
