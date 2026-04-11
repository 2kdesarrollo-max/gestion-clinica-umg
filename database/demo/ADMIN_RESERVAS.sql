SET SERVEROUTPUT ON
SET PAGESIZE 200
SET LINESIZE 200

PROMPT ============================================================
PROMPT ADMIN_RESERVAS - Operaciones (reservar/programar/cancelar)
PROMPT ============================================================

PROMPT 1) Crear solicitud (SP_RESERVAR_QUIROFANO)
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

  DBMS_OUTPUT.PUT_LINE('Reserva creada ID=' || v_id);
END;
/

PROMPT 2) Programar (UPDATE a APROBADA) y asignar observaciones
DECLARE
  v_id NUMBER;
BEGIN
  SELECT id_reserva INTO v_id
  FROM SUPERADMIN.RESERVAS
  WHERE tipo_cirugia = 'DEMO_RESERVA'
  ORDER BY fecha_creacion DESC FETCH FIRST 1 ROWS ONLY;

  UPDATE SUPERADMIN.RESERVAS
  SET estado = 'APROBADA',
      observaciones = 'Aprobada por recepcion'
  WHERE id_reserva = v_id;
  COMMIT;
  DBMS_OUTPUT.PUT_LINE('Reserva programada ID=' || v_id);
END;
/

PROMPT 3) Cancelar (SP_CANCELAR_RESERVA)
DECLARE
  v_id NUMBER;
BEGIN
  SELECT id_reserva INTO v_id
  FROM SUPERADMIN.RESERVAS
  WHERE tipo_cirugia = 'DEMO_RESERVA'
  ORDER BY fecha_creacion DESC FETCH FIRST 1 ROWS ONLY;

  SP_CANCELAR_RESERVA(v_id, 'Cancelacion demo', 'ADMIN_RESERVAS');
  COMMIT;
  DBMS_OUTPUT.PUT_LINE('Cancelada ID=' || v_id);
END;
/

