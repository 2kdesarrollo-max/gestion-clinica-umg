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
  p_prioridad       IN VARCHAR2 DEFAULT 'NORMAL',
  p_creado_por      IN VARCHAR2,
  p_id_reserva      OUT NUMBER
) AS
  v_id NUMBER;
  v_prioridad VARCHAR2(20);
  v_estado VARCHAR2(20);
  v_conf_quirofano NUMBER := 0;
  v_conf_medico NUMBER := 0;
  v_conf_bloqueo NUMBER := 0;
  v_es_paciente NUMBER := 0;
BEGIN
  v_id := SEQ_RESERVAS.NEXTVAL;
  v_prioridad := NVL(UPPER(TRIM(p_prioridad)), 'NORMAL');
  IF v_prioridad NOT IN ('NORMAL','URGENTE','EMERGENCIA') THEN
    v_prioridad := 'NORMAL';
  END IF;

  IF REGEXP_LIKE(NVL(p_creado_por,''), '^PACIENTE_', 'i') THEN
    v_es_paciente := 1;
  END IF;

  IF v_es_paciente = 0 AND v_prioridad IN ('NORMAL','URGENTE') THEN
    SELECT COUNT(*) INTO v_conf_quirofano
    FROM RESERVAS r
    WHERE r.id_quirofano = p_id_quirofano
      AND r.estado IN ('APROBADA','EN_CURSO')
      AND TRUNC(r.fecha_reserva) = TRUNC(p_fecha)
      AND (r.hora_inicio < p_hora_fin AND r.hora_fin > p_hora_inicio);

    SELECT COUNT(*) INTO v_conf_bloqueo
    FROM QUIROFANO_BLOQUEOS b
    WHERE b.id_quirofano = p_id_quirofano
      AND b.activo = 1
      AND (b.inicio < p_hora_fin AND b.fin > p_hora_inicio);

    SELECT COUNT(*) INTO v_conf_medico
    FROM RESERVAS r
    WHERE r.id_medico = p_id_medico
      AND r.estado IN ('APROBADA','EN_CURSO')
      AND TRUNC(r.fecha_reserva) = TRUNC(p_fecha)
      AND (r.hora_inicio < p_hora_fin AND r.hora_fin > p_hora_inicio);
  END IF;

  IF v_es_paciente = 1 THEN
    v_estado := 'SOLICITADA';
  ELSIF v_conf_quirofano = 0 AND v_conf_bloqueo = 0 AND v_conf_medico = 0 AND v_prioridad IN ('NORMAL','URGENTE') THEN
    v_estado := 'APROBADA';
  ELSE
    v_estado := 'SOLICITADA';
  END IF;

  INSERT INTO RESERVAS VALUES (
    v_id, p_id_paciente, p_id_medico, p_id_quirofano,
    p_id_especialidad, NULL, p_tipo_cirugia, p_descripcion,
    p_fecha, p_hora_inicio, p_hora_fin,
    v_estado, v_prioridad, SYSDATE, p_creado_por, NULL
  );
  SAVEPOINT SP_RESERVA;

  IF v_es_paciente = 1 THEN
    INSERT INTO VALIDACIONES VALUES (
      SEQ_VALIDACIONES.NEXTVAL, v_id,
      'ASIGNACION',
      'PENDIENTE',
      'Pendiente de asignación de médico y quirófano por recepción.',
      SYSDATE
    );
  ELSE
    INSERT INTO VALIDACIONES VALUES (
      SEQ_VALIDACIONES.NEXTVAL, v_id,
      'QUIROFANO',
      CASE WHEN v_conf_quirofano = 0 AND v_conf_bloqueo = 0 THEN 'OK' ELSE 'FAIL' END,
      CASE
        WHEN v_conf_quirofano > 0 THEN 'Conflicto de quirófano en ese horario'
        WHEN v_conf_bloqueo > 0 THEN 'Quirófano en mantenimiento/bloqueado en ese horario'
        ELSE 'Quirófano disponible'
      END,
      SYSDATE
    );
  END IF;
  SAVEPOINT SP_VALIDACION;

  IF v_es_paciente = 0 THEN
    INSERT INTO VALIDACIONES VALUES (
      SEQ_VALIDACIONES.NEXTVAL, v_id,
      'MEDICO',
      CASE WHEN v_conf_medico = 0 THEN 'OK' ELSE 'FAIL' END,
      CASE WHEN v_conf_medico = 0 THEN 'Médico disponible' ELSE 'Conflicto de médico en ese horario' END,
      SYSDATE
    );
  END IF;

  IF v_es_paciente = 0 THEN
    INSERT INTO VALIDACIONES VALUES (
      SEQ_VALIDACIONES.NEXTVAL, v_id,
      'EQUIPOS', 'OK', 'Sin equipos asignados', SYSDATE
    );
  END IF;

  INSERT INTO CONFIRMACIONES VALUES (
    SEQ_CONFIRMACIONES.NEXTVAL, v_id,
    p_creado_por, SYSDATE,
    CASE
      WHEN v_es_paciente = 1 THEN 'Solicitud registrada. Pendiente de asignación y revisión.'
      WHEN v_estado = 'APROBADA' THEN 'Reserva aprobada automáticamente'
      ELSE 'Reserva pendiente por conflicto. Requiere revisión del jefe.'
    END
  );
  SAVEPOINT SP_CONFIRMACION;

  IF v_prioridad = 'URGENTE' AND v_estado = 'APROBADA' THEN
    INSERT INTO AUDITORIA_RESERVAS VALUES (
      SEQ_AUDITORIA.NEXTVAL, 'RESERVAS', 'NOTIF_JEFE',
      v_id, NULL, 'Reserva URGENTE aprobada automáticamente',
      USER, p_creado_por, SYSDATE, NULL
    );
  END IF;

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
