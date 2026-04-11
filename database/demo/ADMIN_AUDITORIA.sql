SET SERVEROUTPUT ON
SET PAGESIZE 200
SET LINESIZE 200

PROMPT ============================================================
PROMPT ADMIN_AUDITORIA - Auditoria (TRIGGER + FGA)
PROMPT ============================================================

PROMPT 1) Auditoria por tabla (AUDITORIA_RESERVAS)
SELECT id_auditoria, tabla_afectada, operacion, id_registro, usuario_sistema, fecha_hora
FROM SUPERADMIN.AUDITORIA_RESERVAS
ORDER BY fecha_hora DESC FETCH FIRST 20 ROWS ONLY;

PROMPT 2) Probar auditoria: actualizar observaciones de una reserva y luego ver log
DECLARE
  v_id NUMBER;
BEGIN
  SELECT id_reserva INTO v_id FROM SUPERADMIN.RESERVAS ORDER BY fecha_creacion DESC FETCH FIRST 1 ROWS ONLY;
  UPDATE SUPERADMIN.RESERVAS SET observaciones = 'AUDIT_TEST ' || TO_CHAR(SYSDATE,'YYYY-MM-DD HH24:MI:SS') WHERE id_reserva = v_id;
  COMMIT;
  DBMS_OUTPUT.PUT_LINE('Reserva actualizada: ' || v_id);
END;
/

SELECT id_auditoria, tabla_afectada, operacion, id_registro, valor_nuevo, usuario_sistema, fecha_hora
FROM SUPERADMIN.AUDITORIA_RESERVAS
WHERE tabla_afectada = 'RESERVAS'
ORDER BY fecha_hora DESC FETCH FIRST 10 ROWS ONLY;

PROMPT 3) FGA - Politicas registradas
SELECT object_schema, object_name, policy_name, audit_condition, statement_types, enabled
FROM DBA_AUDIT_POLICIES
WHERE object_schema = 'SUPERADMIN'
ORDER BY object_name, policy_name;

PROMPT 4) FGA - Disparar evento con SELECT (si aplica) y consultar trail
SELECT COUNT(*) total_reservas FROM SUPERADMIN.RESERVAS WHERE prioridad = 'EMERGENCIA';

SELECT db_user, object_schema, object_name, policy_name, sql_text, timestamp
FROM DBA_FGA_AUDIT_TRAIL
WHERE object_schema = 'SUPERADMIN'
ORDER BY timestamp DESC FETCH FIRST 20 ROWS ONLY;

