-- ============================================================
-- Script: 04_fga.sql
-- Usuario: admin_auditoria / Auditoria123
-- Base de datos: XEPDB1
-- ============================================================

BEGIN
  -- FGA 1: Auditar consultas de reservas canceladas
  DBMS_FGA.ADD_POLICY(
    object_schema  => 'SUPERADMIN',
    object_name    => 'RESERVAS',
    policy_name    => 'FGA_RESERVAS_CANCELADAS',
    audit_condition => 'ESTADO = ''CANCELADA''',
    audit_column   => 'ID_RESERVA,ESTADO,ID_PACIENTE',
    enable         => TRUE,
    statement_types => 'SELECT'
  );

  -- FGA 2: Auditar consultas de disponibilidad de quirofanos
  DBMS_FGA.ADD_POLICY(
    object_schema  => 'SUPERADMIN',
    object_name    => 'QUIROFANOS',
    policy_name    => 'FGA_QUIROFANOS_DISPONIBILIDAD',
    audit_condition => NULL,
    audit_column   => 'ESTADO',
    enable         => TRUE,
    statement_types => 'SELECT'
  );

  -- FGA 3: Auditar modificaciones de emergencias
  DBMS_FGA.ADD_POLICY(
    object_schema  => 'SUPERADMIN',
    object_name    => 'EMERGENCIAS',
    policy_name    => 'FGA_EMERGENCIAS_DML',
    audit_condition => NULL,
    audit_column   => NULL,
    enable         => TRUE,
    statement_types => 'INSERT,UPDATE'
  );

  -- FGA 4: Auditar consultas al log de auditoria
  DBMS_FGA.ADD_POLICY(
    object_schema  => 'SUPERADMIN',
    object_name    => 'AUDITORIA_RESERVAS',
    policy_name    => 'FGA_AUDITORIA_CONSULTAS',
    audit_condition => NULL,
    audit_column   => NULL,
    enable         => TRUE,
    statement_types => 'SELECT'
  );
END;
/

-- Verificar politicas creadas
SELECT policy_name, object_name, enabled
FROM dba_audit_policies
WHERE object_schema = 'SUPERADMIN';

COMMIT;
