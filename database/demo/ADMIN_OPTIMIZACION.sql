SET SERVEROUTPUT ON
SET PAGESIZE 200
SET LINESIZE 200

PROMPT ============================================================
PROMPT ADMIN_OPTIMIZACION - Planes, indices y estadisticas
PROMPT ============================================================

ALTER SESSION SET statistics_level = ALL;

PROMPT 1) Plan de ejecucion (sin tocar indices)
EXPLAIN PLAN FOR
SELECT /* demo */ r.id_reserva, r.fecha_reserva, r.estado
FROM SUPERADMIN.RESERVAS r
WHERE r.estado = 'SOLICITADA'
ORDER BY r.fecha_reserva DESC;

SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY(NULL, NULL, 'BASIC +PREDICATE'));

PROMPT 2) Crear indice (B-tree) y comparar plan
BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX IDX_RESERVAS_ESTADO_FECHA ON SUPERADMIN.RESERVAS(estado, fecha_reserva)';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE <> -955 THEN RAISE; END IF;
END;
/

EXPLAIN PLAN FOR
SELECT /* demo */ r.id_reserva, r.fecha_reserva, r.estado
FROM SUPERADMIN.RESERVAS r
WHERE r.estado = 'SOLICITADA'
ORDER BY r.fecha_reserva DESC;

SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY(NULL, NULL, 'BASIC +PREDICATE'));

PROMPT 3) Estadisticas (DBMS_STATS) y comparar plan
BEGIN
  DBMS_STATS.GATHER_TABLE_STATS(
    ownname => 'SUPERADMIN',
    tabname => 'RESERVAS',
    estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
    method_opt => 'FOR ALL COLUMNS SIZE AUTO',
    cascade => TRUE
  );
END;
/

EXPLAIN PLAN FOR
SELECT /* demo */ r.id_reserva, r.fecha_reserva, r.estado
FROM SUPERADMIN.RESERVAS r
WHERE r.estado = 'SOLICITADA'
ORDER BY r.fecha_reserva DESC;

SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY(NULL, NULL, 'BASIC +PREDICATE'));

PROMPT 4) (Opcional) Indice funcional para busquedas case-insensitive por email
BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX IDX_PACIENTES_EMAIL_UPPER ON SUPERADMIN.PACIENTES(UPPER(email))';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE <> -955 THEN RAISE; END IF;
END;
/

EXPLAIN PLAN FOR
SELECT /* demo */ id_paciente, nombre, apellido
FROM SUPERADMIN.PACIENTES
WHERE UPPER(email) = UPPER('cliente01@correo.com');

SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY(NULL, NULL, 'BASIC +PREDICATE'));

