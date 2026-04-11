-- Migraciones incrementales (aplicar en BD ya existente)

-- Evita ORA-12899 al registrar operaciones de auditoría como 'CANCELACION'
ALTER TABLE AUDITORIA_RESERVAS MODIFY operacion VARCHAR2(20);

COMMIT;

