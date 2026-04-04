-- ============================================================
-- Script: 03_triggers.sql
-- Usuario: admin_triggers / Triggers123
-- Base de datos: XEPDB1
-- ============================================================

-- TRIGGER 1: Auditoria completa de reservas
CREATE OR REPLACE TRIGGER TRG_AUDITORIA_RESERVAS
FOR INSERT OR UPDATE OR DELETE ON SUPERADMIN.RESERVAS
COMPOUND TRIGGER
  TYPE T_AUDITORIA IS RECORD (
    operacion     VARCHAR2(10),
    id_registro   NUMBER,
    val_anterior  VARCHAR2(1000),
    val_nuevo     VARCHAR2(1000)
  );
  TYPE T_AUDITORIA_TAB IS TABLE OF T_AUDITORIA INDEX BY PLS_INTEGER;
  v_cambios T_AUDITORIA_TAB;
  v_idx PLS_INTEGER := 0;

  AFTER EACH ROW IS
  BEGIN
    v_idx := v_idx + 1;
    IF INSERTING THEN
      v_cambios(v_idx).operacion   := 'INSERT';
      v_cambios(v_idx).id_registro := :NEW.id_reserva;
      v_cambios(v_idx).val_anterior := NULL;
      v_cambios(v_idx).val_nuevo   := 'Estado:'||:NEW.estado||' Prioridad:'||:NEW.prioridad;
    ELSIF UPDATING THEN
      v_cambios(v_idx).operacion   := 'UPDATE';
      v_cambios(v_idx).id_registro := :NEW.id_reserva;
      v_cambios(v_idx).val_anterior := 'Estado:'||:OLD.estado||' Prioridad:'||:OLD.prioridad;
      v_cambios(v_idx).val_nuevo   := 'Estado:'||:NEW.estado||' Prioridad:'||:NEW.prioridad;
    ELSIF DELETING THEN
      v_cambios(v_idx).operacion   := 'DELETE';
      v_cambios(v_idx).id_registro := :OLD.id_reserva;
      v_cambios(v_idx).val_anterior := 'Estado:'||:OLD.estado;
      v_cambios(v_idx).val_nuevo   := NULL;
    END IF;
  END AFTER EACH ROW;

  AFTER STATEMENT IS
  BEGIN
    FOR i IN 1..v_idx LOOP
      INSERT INTO SUPERADMIN.AUDITORIA_RESERVAS VALUES (
        SUPERADMIN.SEQ_AUDITORIA.NEXTVAL,
        'RESERVAS',
        v_cambios(i).operacion,
        v_cambios(i).id_registro,
        v_cambios(i).val_anterior,
        v_cambios(i).val_nuevo,
        USER, NULL, SYSDATE, NULL
      );
    END LOOP;
  END AFTER STATEMENT;
END TRG_AUDITORIA_RESERVAS;
/
SHOW ERRORS;

-- TRIGGER 2: Prevenir sobreasignacion de quirofanos
CREATE OR REPLACE TRIGGER TRG_PREVENIR_SOBREASIGNACION
FOR INSERT OR UPDATE ON SUPERADMIN.RESERVAS
COMPOUND TRIGGER
  TYPE t_reserva IS RECORD (
    id_reserva   SUPERADMIN.RESERVAS.id_reserva%TYPE,
    id_quirofano SUPERADMIN.RESERVAS.id_quirofano%TYPE,
    id_medico    SUPERADMIN.RESERVAS.id_medico%TYPE,
    fecha_res    SUPERADMIN.RESERVAS.fecha_reserva%TYPE,
    hora_ini     SUPERADMIN.RESERVAS.hora_inicio%TYPE,
    hora_fin     SUPERADMIN.RESERVAS.hora_fin%TYPE,
    estado       SUPERADMIN.RESERVAS.estado%TYPE
  );

  TYPE t_reserva_tab IS TABLE OF t_reserva INDEX BY PLS_INTEGER;
  g_reservas t_reserva_tab;
  g_idx PLS_INTEGER := 0;

  BEFORE STATEMENT IS
  BEGIN
    g_reservas.DELETE;
    g_idx := 0;
  END BEFORE STATEMENT;

  AFTER EACH ROW IS
  BEGIN
    IF :NEW.estado IN ('APROBADA','EN_CURSO') THEN
      g_idx := g_idx + 1;
      g_reservas(g_idx).id_reserva := :NEW.id_reserva;
      g_reservas(g_idx).id_quirofano := :NEW.id_quirofano;
      g_reservas(g_idx).id_medico := :NEW.id_medico;
      g_reservas(g_idx).fecha_res := :NEW.fecha_reserva;
      g_reservas(g_idx).hora_ini := :NEW.hora_inicio;
      g_reservas(g_idx).hora_fin := :NEW.hora_fin;
      g_reservas(g_idx).estado := :NEW.estado;
    END IF;
  END AFTER EACH ROW;

  AFTER STATEMENT IS
    v_count NUMBER;
    v_block NUMBER;
    v_medico NUMBER;
  BEGIN
    FOR i IN 1..g_idx LOOP
      EXIT WHEN NOT g_reservas.EXISTS(i);
      SELECT COUNT(*) INTO v_count
      FROM SUPERADMIN.RESERVAS r
      WHERE r.id_quirofano = g_reservas(i).id_quirofano
        AND r.id_reserva <> g_reservas(i).id_reserva
        AND r.estado IN ('APROBADA','EN_CURSO')
        AND TRUNC(r.fecha_reserva) = TRUNC(g_reservas(i).fecha_res)
        AND (r.hora_inicio < g_reservas(i).hora_fin AND r.hora_fin > g_reservas(i).hora_ini);

      IF v_count > 0 THEN
        RAISE_APPLICATION_ERROR(-20001, 'El quirofano ya tiene una reserva en ese horario.');
      END IF;

      SELECT COUNT(*) INTO v_block
      FROM SUPERADMIN.QUIROFANO_BLOQUEOS b
      WHERE b.id_quirofano = g_reservas(i).id_quirofano
        AND b.activo = 1
        AND (b.inicio < g_reservas(i).hora_fin AND b.fin > g_reservas(i).hora_ini);

      IF v_block > 0 THEN
        RAISE_APPLICATION_ERROR(-20003, 'El quirofano tiene un mantenimiento/bloqueo en ese horario.');
      END IF;

      SELECT COUNT(*) INTO v_medico
      FROM SUPERADMIN.RESERVAS r
      WHERE r.id_medico = g_reservas(i).id_medico
        AND r.id_reserva <> g_reservas(i).id_reserva
        AND r.estado IN ('APROBADA','EN_CURSO')
        AND TRUNC(r.fecha_reserva) = TRUNC(g_reservas(i).fecha_res)
        AND (r.hora_inicio < g_reservas(i).hora_fin AND r.hora_fin > g_reservas(i).hora_ini);

      IF v_medico > 0 THEN
        RAISE_APPLICATION_ERROR(-20004, 'El medico ya tiene una reserva en ese horario.');
      END IF;
    END LOOP;
  END AFTER STATEMENT;
END TRG_PREVENIR_SOBREASIGNACION;
/
SHOW ERRORS;

-- TRIGGER 3: Prioridad de emergencias
CREATE OR REPLACE TRIGGER TRG_PRIORIDAD_EMERGENCIA
AFTER INSERT ON SUPERADMIN.EMERGENCIAS
FOR EACH ROW
WHEN (NEW.nivel_prioridad IN ('CRITICA','ALTA'))
BEGIN
  UPDATE SUPERADMIN.RESERVAS
  SET estado = 'CANCELADA',
      observaciones = 'Cancelada por emergencia '||:NEW.nivel_prioridad||
                      ' ID:'||:NEW.id_emergencia
  WHERE id_quirofano = :NEW.id_quirofano
    AND estado IN ('SOLICITADA','APROBADA')
    AND TRUNC(fecha_reserva) = TRUNC(:NEW.fecha_hora);
END;
/
SHOW ERRORS;

-- TRIGGER 4: Validar horario de reserva
CREATE OR REPLACE TRIGGER TRG_VALIDAR_HORARIO
BEFORE INSERT ON SUPERADMIN.RESERVAS
FOR EACH ROW
BEGIN
  IF :NEW.hora_fin <= :NEW.hora_inicio THEN
    RAISE_APPLICATION_ERROR(-20002,
      'La hora de fin debe ser mayor que la hora de inicio.');
  END IF;
  IF TRUNC(:NEW.fecha_reserva) < TRUNC(SYSDATE) THEN
    RAISE_APPLICATION_ERROR(-20003,
      'No se puede reservar en una fecha pasada.');
  END IF;
END;
/
SHOW ERRORS;

-- TRIGGER 5: Actualizar inventario de equipos al asignar
CREATE OR REPLACE TRIGGER TRG_ACTUALIZAR_EQUIPOS
AFTER INSERT ON SUPERADMIN.RESERVA_EQUIPOS
FOR EACH ROW
BEGIN
  UPDATE SUPERADMIN.EQUIPOS
  SET cantidad_disponible = cantidad_disponible - :NEW.cantidad
  WHERE id_equipo = :NEW.id_equipo
    AND cantidad_disponible >= :NEW.cantidad;
  IF SQL%ROWCOUNT = 0 THEN
    RAISE_APPLICATION_ERROR(-20004,
      'No hay suficiente cantidad disponible del equipo.');
  END IF;
END;
/
SHOW ERRORS;

COMMIT;
