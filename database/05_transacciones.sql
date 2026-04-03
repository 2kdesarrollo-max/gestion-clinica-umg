-- ============================================================
-- Script: 05_transacciones.sql
-- Usuario: superadmin / SuperAdmin123
-- Base de datos: XEPDB1
-- ============================================================

-- PROCEDIMIENTO 1: Reservar quirofano con transaccion anidada
CREATE OR REPLACE PROCEDURE SP_RESERVAR_QUIROFANO (
  p_id_paciente     IN NUMBER,
  p_id_medico       IN NUMBER,
  p_id_quirofano    IN NUMBER,
  p_id_especialidad IN NUMBER,
  p_tipo_cirugia    IN VARCHAR2,
  p_descripcion     IN VARCHAR2,
  p_fecha           IN DATE,
  p_hora_inicio     IN DATE,
  p_hora_fin        IN DATE,
  p_creado_por      IN VARCHAR2,
  p_id_reserva      OUT NUMBER
) AS
  v_id NUMBER;
BEGIN
  v_id := SEQ_RESERVAS.NEXTVAL;

  -- Paso 1: Insertar reserva
  INSERT INTO RESERVAS VALUES (
    v_id, p_id_paciente, p_id_medico, p_id_quirofano,
    p_id_especialidad, NULL, p_tipo_cirugia, p_descripcion,
    p_fecha, p_hora_inicio, p_hora_fin,
    'SOLICITADA', 'NORMAL', SYSDATE, p_creado_por, NULL
  );
  SAVEPOINT SP_RESERVA;

  -- Paso 2: Insertar validacion
  INSERT INTO VALIDACIONES VALUES (
    SEQ_VALIDACIONES.NEXTVAL, v_id,
    'HORARIO', 'OK', 'Horario disponible', SYSDATE
  );
  SAVEPOINT SP_VALIDACION;

  -- Paso 3: Insertar confirmacion
  INSERT INTO CONFIRMACIONES VALUES (
    SEQ_CONFIRMACIONES.NEXTVAL, v_id,
    p_creado_por, SYSDATE, 'Reserva registrada exitosamente'
  );
  SAVEPOINT SP_CONFIRMACION;

  p_id_reserva := v_id;
  COMMIT;
  DBMS_OUTPUT.PUT_LINE('Reserva creada exitosamente. ID: ' || v_id);

EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    DBMS_OUTPUT.PUT_LINE('Error al crear reserva: ' || SQLERRM);
    RAISE;
END SP_RESERVAR_QUIROFANO;
/

-- PROCEDIMIENTO 2: Cancelar reserva
CREATE OR REPLACE PROCEDURE SP_CANCELAR_RESERVA (
  p_id_reserva  IN NUMBER,
  p_motivo      IN VARCHAR2,
  p_cancelado_por IN VARCHAR2
) AS
BEGIN
  UPDATE RESERVAS
  SET estado = 'CANCELADA',
      observaciones = p_motivo
  WHERE id_reserva = p_id_reserva
    AND estado NOT IN ('COMPLETADA','CANCELADA');

  IF SQL%ROWCOUNT = 0 THEN
    RAISE_APPLICATION_ERROR(-20010,
      'Reserva no encontrada o no se puede cancelar.');
  END IF;
  SAVEPOINT SP_CANCELACION;

  INSERT INTO AUDITORIA_RESERVAS VALUES (
    SEQ_AUDITORIA.NEXTVAL, 'RESERVAS', 'CANCELACION',
    p_id_reserva, NULL, 'Cancelado por: '||p_cancelado_por||' Motivo: '||p_motivo,
    USER, p_cancelado_por, SYSDATE, NULL
  );

  COMMIT;
  DBMS_OUTPUT.PUT_LINE('Reserva ' || p_id_reserva || ' cancelada.');

EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK TO SP_CANCELACION;
    DBMS_OUTPUT.PUT_LINE('Error: ' || SQLERRM);
    RAISE;
END SP_CANCELAR_RESERVA;
/

-- PROCEDIMIENTO 3: Procesar emergencia (preempta reserva normal)
CREATE OR REPLACE PROCEDURE SP_PROCESAR_EMERGENCIA (
  p_id_medico     IN NUMBER,
  p_id_quirofano  IN NUMBER,
  p_id_paciente   IN NUMBER,
  p_nivel         IN VARCHAR2,
  p_descripcion   IN VARCHAR2
) AS
  v_id NUMBER;
BEGIN
  v_id := SEQ_EMERGENCIAS.NEXTVAL;

  INSERT INTO EMERGENCIAS VALUES (
    v_id, p_id_medico, p_id_quirofano, p_id_paciente,
    p_nivel, p_descripcion, SYSDATE, 'ACTIVA', NULL
  );
  SAVEPOINT SP_EMERGENCIA;

  COMMIT;
  DBMS_OUTPUT.PUT_LINE('Emergencia registrada. ID: ' || v_id);

EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    DBMS_OUTPUT.PUT_LINE('Error: ' || SQLERRM);
    RAISE;
END SP_PROCESAR_EMERGENCIA;
/

-- PROCEDIMIENTO 4: Reprogramar reserva
CREATE OR REPLACE PROCEDURE SP_REPROGRAMAR_RESERVA (
  p_id_reserva        IN NUMBER,
  p_fecha_nueva       IN DATE,
  p_hora_inicio_nueva IN DATE,
  p_hora_fin_nueva    IN DATE,
  p_justificacion     IN VARCHAR2,
  p_reprogramado_por  IN VARCHAR2
) AS
  v_fecha_ant DATE;
  v_hi_ant    DATE;
  v_hf_ant    DATE;
BEGIN
  SELECT fecha_reserva, hora_inicio, hora_fin
  INTO v_fecha_ant, v_hi_ant, v_hf_ant
  FROM RESERVAS WHERE id_reserva = p_id_reserva;
  SAVEPOINT SP_ANTES;

  INSERT INTO REPROGRAMACIONES VALUES (
    SEQ_REPROGRAMACIONES.NEXTVAL, p_id_reserva,
    v_fecha_ant, v_hi_ant, v_hf_ant,
    p_fecha_nueva, p_hora_inicio_nueva, p_hora_fin_nueva,
    p_justificacion, p_reprogramado_por, SYSDATE
  );

  UPDATE RESERVAS
  SET fecha_reserva = p_fecha_nueva,
      hora_inicio   = p_hora_inicio_nueva,
      hora_fin      = p_hora_fin_nueva,
      estado        = 'REPROGRAMADA',
      observaciones = p_justificacion
  WHERE id_reserva = p_id_reserva;

  COMMIT;
  DBMS_OUTPUT.PUT_LINE('Reserva reprogramada exitosamente.');

EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK TO SP_ANTES;
    DBMS_OUTPUT.PUT_LINE('Error: ' || SQLERRM);
    RAISE;
END SP_REPROGRAMAR_RESERVA;
/

SHOW ERRORS;
COMMIT;
