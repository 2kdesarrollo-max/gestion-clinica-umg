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
BEFORE INSERT OR UPDATE ON SUPERADMIN.RESERVAS
FOR EACH ROW
WHEN (NEW.estado NOT IN ('CANCELADA','COMPLETADA'))
DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM SUPERADMIN.RESERVAS
  WHERE id_quirofano = :NEW.id_quirofano
    AND id_reserva <> NVL(:NEW.id_reserva, -1)
    AND estado NOT IN ('CANCELADA','COMPLETADA')
    AND TRUNC(fecha_reserva) = TRUNC(:NEW.fecha_reserva)
    AND (hora_inicio < :NEW.hora_fin AND hora_fin > :NEW.hora_inicio);
  IF v_count > 0 THEN
    RAISE_APPLICATION_ERROR(-20001,
      'El quirofano ya tiene una reserva en ese horario.');
  END IF;
END;
/
SHOW ERRORS;

-- TRIGGER 3: Prioridad de emergencias
CREATE OR REPLACE REPLACE TRIGGER TRG_PRIORIDAD_EMERGENCIA
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
