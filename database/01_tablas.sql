-- ============================================================
-- GESTIÓN CLÍNICA INTEGRAL UMG
-- Script: 01_tablas.sql
-- Usuario: superadmin
-- Base de datos: XEPDB1
-- ============================================================

-- ESPECIALIDADES MÉDICAS
CREATE TABLE ESPECIALIDADES (
  id_especialidad   NUMBER PRIMARY KEY,
  nombre            VARCHAR2(100) NOT NULL,
  descripcion       VARCHAR2(300),
  activo            NUMBER(1) DEFAULT 1 CHECK (activo IN (0,1)),
  fecha_creacion    DATE DEFAULT SYSDATE
);

-- MÉDICOS
CREATE TABLE MEDICOS (
  id_medico         NUMBER PRIMARY KEY,
  nombre            VARCHAR2(100) NOT NULL,
  apellido          VARCHAR2(100) NOT NULL,
  id_especialidad   NUMBER REFERENCES ESPECIALIDADES(id_especialidad),
  licencia          VARCHAR2(50) UNIQUE NOT NULL,
  telefono          VARCHAR2(20),
  email             VARCHAR2(100) UNIQUE,
  activo            NUMBER(1) DEFAULT 1 CHECK (activo IN (0,1)),
  fecha_registro    DATE DEFAULT SYSDATE
);

-- QUIRÓFANOS
CREATE TABLE QUIROFANOS (
  id_quirofano      NUMBER PRIMARY KEY,
  nombre            VARCHAR2(100) NOT NULL,
  piso              NUMBER NOT NULL,
  capacidad         NUMBER DEFAULT 1,
  equipamiento      VARCHAR2(300),
  estado            VARCHAR2(20) DEFAULT 'DISPONIBLE'
                    CHECK (estado IN ('DISPONIBLE','OCUPADO','MANTENIMIENTO')),
  activo            NUMBER(1) DEFAULT 1 CHECK (activo IN (0,1))
);

-- EQUIPOS MÉDICOS (inventario simple)
CREATE TABLE EQUIPOS (
  id_equipo         NUMBER PRIMARY KEY,
  nombre            VARCHAR2(100) NOT NULL,
  descripcion       VARCHAR2(200),
  cantidad_total    NUMBER DEFAULT 0,
  cantidad_disponible NUMBER DEFAULT 0,
  activo            NUMBER(1) DEFAULT 1 CHECK (activo IN (0,1))
);

-- PACIENTES
CREATE TABLE PACIENTES (
  id_paciente       NUMBER PRIMARY KEY,
  nombre            VARCHAR2(100) NOT NULL,
  apellido          VARCHAR2(100) NOT NULL,
  fecha_nacimiento  DATE,
  genero            VARCHAR2(10) CHECK (genero IN ('MASCULINO','FEMENINO','OTRO')),
  telefono          VARCHAR2(20),
  email             VARCHAR2(100) UNIQUE,
  direccion         VARCHAR2(200),
  tipo_sangre       VARCHAR2(5),
  alergias          VARCHAR2(300),
  password_hash     VARCHAR2(200),
  fecha_registro    DATE DEFAULT SYSDATE,
  activo            NUMBER(1) DEFAULT 1 CHECK (activo IN (0,1))
);

-- DIAGNÓSTICOS / ENFERMEDADES
CREATE TABLE DIAGNOSTICOS (
  id_diagnostico    NUMBER PRIMARY KEY,
  codigo_cie        VARCHAR2(10),
  nombre            VARCHAR2(200) NOT NULL,
  descripcion       VARCHAR2(500),
  activo            NUMBER(1) DEFAULT 1 CHECK (activo IN (0,1))
);

-- RESERVAS (particionada por año)
CREATE TABLE RESERVAS (
  id_reserva        NUMBER PRIMARY KEY,
  id_paciente       NUMBER REFERENCES PACIENTES(id_paciente),
  id_medico         NUMBER REFERENCES MEDICOS(id_medico),
  id_quirofano      NUMBER REFERENCES QUIROFANOS(id_quirofano),
  id_especialidad   NUMBER REFERENCES ESPECIALIDADES(id_especialidad),
  id_diagnostico    NUMBER REFERENCES DIAGNOSTICOS(id_diagnostico),
  tipo_cirugia      VARCHAR2(100),
  descripcion_necesidad VARCHAR2(500),
  fecha_reserva     DATE,
  hora_inicio       DATE,
  hora_fin          DATE,
  estado            VARCHAR2(20) DEFAULT 'SOLICITADA'
                    CHECK (estado IN ('SOLICITADA','APROBADA','EN_CURSO',
                                      'COMPLETADA','CANCELADA','REPROGRAMADA')),
  prioridad         VARCHAR2(20) DEFAULT 'NORMAL'
                    CHECK (prioridad IN ('NORMAL','URGENTE','EMERGENCIA')),
  fecha_creacion    DATE DEFAULT SYSDATE,
  creado_por        VARCHAR2(100),
  observaciones     VARCHAR2(500)
) PARTITION BY RANGE (fecha_reserva) (
  PARTITION reservas_2025 VALUES LESS THAN (DATE '2026-01-01'),
  PARTITION reservas_2026 VALUES LESS THAN (DATE '2027-01-01'),
  PARTITION reservas_futuro VALUES LESS THAN (MAXVALUE)
);

-- REPROGRAMACIONES
CREATE TABLE REPROGRAMACIONES (
  id_reprogramacion NUMBER PRIMARY KEY,
  id_reserva        NUMBER REFERENCES RESERVAS(id_reserva),
  fecha_anterior    DATE NOT NULL,
  hora_inicio_anterior DATE,
  hora_fin_anterior DATE,
  fecha_nueva       DATE NOT NULL,
  hora_inicio_nueva DATE,
  hora_fin_nueva    DATE,
  justificacion     VARCHAR2(300) NOT NULL,
  reprogramado_por  VARCHAR2(100),
  fecha_accion      DATE DEFAULT SYSDATE
);

-- EQUIPOS POR RESERVA
CREATE TABLE RESERVA_EQUIPOS (
  id_reserva_equipo NUMBER PRIMARY KEY,
  id_reserva        NUMBER REFERENCES RESERVAS(id_reserva),
  id_equipo         NUMBER REFERENCES EQUIPOS(id_equipo),
  cantidad          NUMBER DEFAULT 1
);

-- HISTORIAL MÉDICO DEL PACIENTE
CREATE TABLE HISTORIAL_PACIENTE (
  id_historial      NUMBER PRIMARY KEY,
  id_paciente       NUMBER REFERENCES PACIENTES(id_paciente),
  id_reserva        NUMBER REFERENCES RESERVAS(id_reserva),
  id_diagnostico    NUMBER REFERENCES DIAGNOSTICOS(id_diagnostico),
  notas             VARCHAR2(1000),
  fecha_registro    DATE DEFAULT SYSDATE,
  registrado_por    VARCHAR2(100)
);

-- EMERGENCIAS
CREATE TABLE EMERGENCIAS (
  id_emergencia     NUMBER PRIMARY KEY,
  id_medico         NUMBER REFERENCES MEDICOS(id_medico),
  id_quirofano      NUMBER REFERENCES QUIROFANOS(id_quirofano),
  id_paciente       NUMBER REFERENCES PACIENTES(id_paciente),
  nivel_prioridad   VARCHAR2(20) CHECK (nivel_prioridad IN ('CRITICA','ALTA','MEDIA')),
  descripcion       VARCHAR2(500),
  fecha_hora        DATE DEFAULT SYSDATE,
  estado            VARCHAR2(20) DEFAULT 'ACTIVA'
                    CHECK (estado IN ('ACTIVA','RESUELTA','CANCELADA')),
  reserva_cancelada NUMBER REFERENCES RESERVAS(id_reserva)
);

-- PERFILES DEL SISTEMA (roles de la app web)
CREATE TABLE PERFILES_SISTEMA (
  id_perfil         NUMBER PRIMARY KEY,
  nombre            VARCHAR2(50) NOT NULL UNIQUE,
  descripcion       VARCHAR2(200),
  privilegios       VARCHAR2(1000),
  activo            NUMBER(1) DEFAULT 1 CHECK (activo IN (0,1)),
  fecha_creacion    DATE DEFAULT SYSDATE
);

-- USUARIOS DEL SISTEMA (app web)
CREATE TABLE USUARIOS_SISTEMA (
  id_usuario        NUMBER PRIMARY KEY,
  nombre            VARCHAR2(100) NOT NULL,
  apellido          VARCHAR2(100) NOT NULL,
  username          VARCHAR2(50) NOT NULL UNIQUE,
  password_hash     VARCHAR2(200) NOT NULL,
  email             VARCHAR2(100) UNIQUE,
  id_perfil         NUMBER REFERENCES PERFILES_SISTEMA(id_perfil),
  id_medico         NUMBER REFERENCES MEDICOS(id_medico),
  activo            NUMBER(1) DEFAULT 1 CHECK (activo IN (0,1)),
  ultimo_acceso     DATE,
  fecha_creacion    DATE DEFAULT SYSDATE
);

-- AUDITORIA GENERAL
CREATE TABLE AUDITORIA_RESERVAS (
  id_auditoria      NUMBER PRIMARY KEY,
  tabla_afectada    VARCHAR2(50),
  operacion         VARCHAR2(10),
  id_registro       NUMBER,
  valor_anterior    VARCHAR2(1000),
  valor_nuevo       VARCHAR2(1000),
  usuario_oracle    VARCHAR2(100),
  usuario_sistema   VARCHAR2(100),
  fecha_hora        DATE DEFAULT SYSDATE,
  ip_cliente        VARCHAR2(50)
);

-- VALIDACIONES DE RESERVA
CREATE TABLE VALIDACIONES (
  id_validacion     NUMBER PRIMARY KEY,
  id_reserva        NUMBER REFERENCES RESERVAS(id_reserva),
  tipo_validacion   VARCHAR2(50),
  resultado         VARCHAR2(10),
  mensaje           VARCHAR2(200),
  fecha_hora        DATE DEFAULT SYSDATE
);

-- CONFIRMACIONES DE RESERVA
CREATE TABLE CONFIRMACIONES (
  id_confirmacion   NUMBER PRIMARY KEY,
  id_reserva        NUMBER REFERENCES RESERVAS(id_reserva),
  confirmado_por    VARCHAR2(100),
  fecha_confirmacion DATE DEFAULT SYSDATE,
  observaciones     VARCHAR2(300)
);

-- SECUENCIAS
CREATE SEQUENCE SEQ_ESPECIALIDADES START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_MEDICOS START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_QUIROFANOS START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_EQUIPOS START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_PACIENTES START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_DIAGNOSTICOS START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_RESERVAS START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_REPROGRAMACIONES START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_RESERVA_EQUIPOS START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_HISTORIAL START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_EMERGENCIAS START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_PERFILES START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_USUARIOS START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_AUDITORIA START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_VALIDACIONES START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_CONFIRMACIONES START WITH 1 INCREMENT BY 1;

COMMIT;
