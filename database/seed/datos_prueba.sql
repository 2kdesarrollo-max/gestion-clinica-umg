-- ============================================================
-- Script: datos_prueba.sql
-- Usuario: admin_reservas / Reservas123
-- Base de datos: XEPDB1
-- ============================================================

-- TRUNCAR TABLAS PARA REINICIAR
DELETE FROM SUPERADMIN.EMERGENCIAS;
DELETE FROM SUPERADMIN.RESERVA_EQUIPOS;
DELETE FROM SUPERADMIN.REPROGRAMACIONES;
DELETE FROM SUPERADMIN.CONFIRMACIONES;
DELETE FROM SUPERADMIN.VALIDACIONES;
DELETE FROM SUPERADMIN.AUDITORIA_RESERVAS;
DELETE FROM SUPERADMIN.RESERVAS;
DELETE FROM SUPERADMIN.USUARIOS_SISTEMA;
DELETE FROM SUPERADMIN.PERFILES_SISTEMA;
DELETE FROM SUPERADMIN.DIAGNOSTICOS;
DELETE FROM SUPERADMIN.PACIENTES;
DELETE FROM SUPERADMIN.EQUIPOS;
DELETE FROM SUPERADMIN.MEDICOS;
DELETE FROM SUPERADMIN.QUIROFANOS;
DELETE FROM SUPERADMIN.ESPECIALIDADES;
COMMIT;

-- REINICIAR SECUENCIAS
ALTER SEQUENCE SUPERADMIN.SEQ_ESPECIALIDADES RESTART START WITH 1;
ALTER SEQUENCE SUPERADMIN.SEQ_QUIROFANOS RESTART START WITH 1;
ALTER SEQUENCE SUPERADMIN.SEQ_EQUIPOS RESTART START WITH 1;
ALTER SEQUENCE SUPERADMIN.SEQ_MEDICOS RESTART START WITH 1;
ALTER SEQUENCE SUPERADMIN.SEQ_DIAGNOSTICOS RESTART START WITH 1;
ALTER SEQUENCE SUPERADMIN.SEQ_PACIENTES RESTART START WITH 1;
ALTER SEQUENCE SUPERADMIN.SEQ_PERFILES RESTART START WITH 1;
ALTER SEQUENCE SUPERADMIN.SEQ_USUARIOS RESTART START WITH 1;
ALTER SEQUENCE SUPERADMIN.SEQ_RESERVAS RESTART START WITH 1;
ALTER SEQUENCE SUPERADMIN.SEQ_EMERGENCIAS RESTART START WITH 1;
COMMIT;

-- ESPECIALIDADES (10)
INSERT INTO SUPERADMIN.ESPECIALIDADES (id_especialidad, nombre, descripcion, activo, fecha_creacion) VALUES (SUPERADMIN.SEQ_ESPECIALIDADES.NEXTVAL,'Cirugía General','Procedimientos quirúrgicos generales',1,SYSDATE);
INSERT INTO SUPERADMIN.ESPECIALIDADES (id_especialidad, nombre, descripcion, activo, fecha_creacion) VALUES (SUPERADMIN.SEQ_ESPECIALIDADES.NEXTVAL,'Ortopedia','Huesos, articulaciones y tejidos',1,SYSDATE);
INSERT INTO SUPERADMIN.ESPECIALIDADES (id_especialidad, nombre, descripcion, activo, fecha_creacion) VALUES (SUPERADMIN.SEQ_ESPECIALIDADES.NEXTVAL,'Cardiología','Corazón y sistema cardiovascular',1,SYSDATE);
INSERT INTO SUPERADMIN.ESPECIALIDADES (id_especialidad, nombre, descripcion, activo, fecha_creacion) VALUES (SUPERADMIN.SEQ_ESPECIALIDADES.NEXTVAL,'Neurología','Sistema nervioso central y periférico',1,SYSDATE);
INSERT INTO SUPERADMIN.ESPECIALIDADES (id_especialidad, nombre, descripcion, activo, fecha_creacion) VALUES (SUPERADMIN.SEQ_ESPECIALIDADES.NEXTVAL,'Ginecología','Salud reproductiva femenina',1,SYSDATE);
INSERT INTO SUPERADMIN.ESPECIALIDADES (id_especialidad, nombre, descripcion, activo, fecha_creacion) VALUES (SUPERADMIN.SEQ_ESPECIALIDADES.NEXTVAL,'Pediatría','Salud infantil',1,SYSDATE);
INSERT INTO SUPERADMIN.ESPECIALIDADES (id_especialidad, nombre, descripcion, activo, fecha_creacion) VALUES (SUPERADMIN.SEQ_ESPECIALIDADES.NEXTVAL,'Oftalmología','Ojos y visión',1,SYSDATE);
INSERT INTO SUPERADMIN.ESPECIALIDADES (id_especialidad, nombre, descripcion, activo, fecha_creacion) VALUES (SUPERADMIN.SEQ_ESPECIALIDADES.NEXTVAL,'Oncología','Diagnóstico y tratamiento del cáncer',1,SYSDATE);
INSERT INTO SUPERADMIN.ESPECIALIDADES (id_especialidad, nombre, descripcion, activo, fecha_creacion) VALUES (SUPERADMIN.SEQ_ESPECIALIDADES.NEXTVAL,'Traumatología','Lesiones y traumatismos',1,SYSDATE);
INSERT INTO SUPERADMIN.ESPECIALIDADES (id_especialidad, nombre, descripcion, activo, fecha_creacion) VALUES (SUPERADMIN.SEQ_ESPECIALIDADES.NEXTVAL,'Urología','Sistema urinario',1,SYSDATE);
COMMIT;

-- QUIROFANOS (10)
INSERT INTO SUPERADMIN.QUIROFANOS (id_quirofano, nombre, piso, capacidad, equipamiento, estado, activo) VALUES (SUPERADMIN.SEQ_QUIROFANOS.NEXTVAL,'Quirófano A-101',1,2,'Monitor cardíaco, ventilador','DISPONIBLE',1);
INSERT INTO SUPERADMIN.QUIROFANOS (id_quirofano, nombre, piso, capacidad, equipamiento, estado, activo) VALUES (SUPERADMIN.SEQ_QUIROFANOS.NEXTVAL,'Quirófano A-102',1,2,'Láser quirúrgico, monitor','DISPONIBLE',1);
INSERT INTO SUPERADMIN.QUIROFANOS (id_quirofano, nombre, piso, capacidad, equipamiento, estado, activo) VALUES (SUPERADMIN.SEQ_QUIROFANOS.NEXTVAL,'Quirófano B-201',2,3,'Equipo de neurocirugía','DISPONIBLE',1);
INSERT INTO SUPERADMIN.QUIROFANOS (id_quirofano, nombre, piso, capacidad, equipamiento, estado, activo) VALUES (SUPERADMIN.SEQ_QUIROFANOS.NEXTVAL,'Quirófano B-202',2,2,'Equipo ortopédico completo','DISPONIBLE',1);
INSERT INTO SUPERADMIN.QUIROFANOS (id_quirofano, nombre, piso, capacidad, equipamiento, estado, activo) VALUES (SUPERADMIN.SEQ_QUIROFANOS.NEXTVAL,'Quirófano C-301',3,2,'Equipo cardiovascular','DISPONIBLE',1);
INSERT INTO SUPERADMIN.QUIROFANOS (id_quirofano, nombre, piso, capacidad, equipamiento, estado, activo) VALUES (SUPERADMIN.SEQ_QUIROFANOS.NEXTVAL,'Quirófano C-302',3,3,'Equipo oncológico','DISPONIBLE',1);
INSERT INTO SUPERADMIN.QUIROFANOS (id_quirofano, nombre, piso, capacidad, equipamiento, estado, activo) VALUES (SUPERADMIN.SEQ_QUIROFANOS.NEXTVAL,'Quirófano D-401',4,2,'Equipo pediátrico','DISPONIBLE',1);
INSERT INTO SUPERADMIN.QUIROFANOS (id_quirofano, nombre, piso, capacidad, equipamiento, estado, activo) VALUES (SUPERADMIN.SEQ_QUIROFANOS.NEXTVAL,'Quirófano D-402',4,2,'Equipo oftalmológico','DISPONIBLE',1);
INSERT INTO SUPERADMIN.QUIROFANOS (id_quirofano, nombre, piso, capacidad, equipamiento, estado, activo) VALUES (SUPERADMIN.SEQ_QUIROFANOS.NEXTVAL,'Quirófano E-501',5,3,'Equipo trauma y urgencias','DISPONIBLE',1);
INSERT INTO SUPERADMIN.QUIROFANOS (id_quirofano, nombre, piso, capacidad, equipamiento, estado, activo) VALUES (SUPERADMIN.SEQ_QUIROFANOS.NEXTVAL,'Quirófano E-502',5,2,'Equipo ginecológico','DISPONIBLE',1);
COMMIT;

-- EQUIPOS MÉDICOS (10)
INSERT INTO SUPERADMIN.EQUIPOS (id_equipo, nombre, descripcion, cantidad_total, cantidad_disponible, activo) VALUES (SUPERADMIN.SEQ_EQUIPOS.NEXTVAL,'Monitor de presión arterial','Medición continua de presión',8,8,1);
INSERT INTO SUPERADMIN.EQUIPOS (id_equipo, nombre, descripcion, cantidad_total, cantidad_disponible, activo) VALUES (SUPERADMIN.SEQ_EQUIPOS.NEXTVAL,'Monitor de ritmo cardíaco','ECG en tiempo real',6,6,1);
INSERT INTO SUPERADMIN.EQUIPOS (id_equipo, nombre, descripcion, cantidad_total, cantidad_disponible, activo) VALUES (SUPERADMIN.SEQ_EQUIPOS.NEXTVAL,'Oxímetro de pulso','Medición de saturación de oxígeno',12,12,1);
INSERT INTO SUPERADMIN.EQUIPOS (id_equipo, nombre, descripcion, cantidad_total, cantidad_disponible, activo) VALUES (SUPERADMIN.SEQ_EQUIPOS.NEXTVAL,'Desfibrilador','Restauración del ritmo cardíaco',4,4,1);
INSERT INTO SUPERADMIN.EQUIPOS (id_equipo, nombre, descripcion, cantidad_total, cantidad_disponible, activo) VALUES (SUPERADMIN.SEQ_EQUIPOS.NEXTVAL,'Ventilador mecánico','Soporte respiratorio',5,5,1);
INSERT INTO SUPERADMIN.EQUIPOS (id_equipo, nombre, descripcion, cantidad_total, cantidad_disponible, activo) VALUES (SUPERADMIN.SEQ_EQUIPOS.NEXTVAL,'Bomba de infusión','Administración controlada de medicamentos',10,10,1);
INSERT INTO SUPERADMIN.EQUIPOS (id_equipo, nombre, descripcion, cantidad_total, cantidad_disponible, activo) VALUES (SUPERADMIN.SEQ_EQUIPOS.NEXTVAL,'Electrocauterio','Coagulación y corte de tejidos',6,6,1);
INSERT INTO SUPERADMIN.EQUIPOS (id_equipo, nombre, descripcion, cantidad_total, cantidad_disponible, activo) VALUES (SUPERADMIN.SEQ_EQUIPOS.NEXTVAL,'Laparoscopio','Cirugía mínimamente invasiva',3,3,1);
INSERT INTO SUPERADMIN.EQUIPOS (id_equipo, nombre, descripcion, cantidad_total, cantidad_disponible, activo) VALUES (SUPERADMIN.SEQ_EQUIPOS.NEXTVAL,'Arco en C','Rayos X intraoperatorio',2,2,1);
INSERT INTO SUPERADMIN.EQUIPOS (id_equipo, nombre, descripcion, cantidad_total, cantidad_disponible, activo) VALUES (SUPERADMIN.SEQ_EQUIPOS.NEXTVAL,'Aspirador quirúrgico','Succión de fluidos',8,8,1);
COMMIT;

-- MÉDICOS (20)
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'Carlos','Mendoza Pérez',1,'LIC-001','5551-0001','cmendoza@hospital.gt',1,SYSDATE);
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'Ana','García López',1,'LIC-002','5551-0002','agarcia@hospital.gt',1,SYSDATE);
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'Roberto','Ajú Tzi',1,'LIC-003','5551-0003','raju@hospital.gt',1,SYSDATE);
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'María','Xitumul Batz',2,'LIC-004','5551-0004','mxitumul@hospital.gt',1,SYSDATE);
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'José','Caal Tun',2,'LIC-005','5551-0005','jcaal@hospital.gt',1,SYSDATE);
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'Pedro','Choc Ixim',3,'LIC-006','5551-0006','pchoc@hospital.gt',1,SYSDATE);
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'Luisa','Tzul Pop',3,'LIC-007','5551-0007','ltzul@hospital.gt',1,SYSDATE);
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'Miguel','Cux Yat',4,'LIC-008','5551-0008','mcux@hospital.gt',1,SYSDATE);
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'Sandra','Ixchel Noh',4,'LIC-009','5551-0009','sixchel@hospital.gt',1,SYSDATE);
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'Diego','Toj Mam',5,'LIC-010','5551-0010','dtoj@hospital.gt',1,SYSDATE);
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'Carmen','Balam Chi',5,'LIC-011','5551-0011','cbalam@hospital.gt',1,SYSDATE);
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'Raúl','Ajcip Yat',6,'LIC-012','5551-0012','rajcip@hospital.gt',1,SYSDATE);
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'Elena','Coy Xol',6,'LIC-013','5551-0013','ecoy@hospital.gt',1,SYSDATE);
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'Francisco','Sipac Noj',7,'LIC-014','5551-0014','fsipac@hospital.gt',1,SYSDATE);
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'Gloria','Tuj Batz',7,'LIC-015','5551-0015','gtuj@hospital.gt',1,SYSDATE);
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'Héctor','Caal Xim',8,'LIC-016','5551-0016','hcaal@hospital.gt',1,SYSDATE);
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'Isabel','Ajú Pop',8,'LIC-017','5551-0017','iaju@hospital.gt',1,SYSDATE);
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'Jorge','Cux Tzep',9,'LIC-018','5551-0018','jcux@hospital.gt',1,SYSDATE);
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'Karina','Noj Ixim',9,'LIC-019','5551-0019','knoj@hospital.gt',1,SYSDATE);
INSERT INTO SUPERADMIN.MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_MEDICOS.NEXTVAL,'Luis','Tzi Balam',10,'LIC-020','5551-0020','ltzi@hospital.gt',1,SYSDATE);
COMMIT;

-- DIAGNÓSTICOS (10)
INSERT INTO SUPERADMIN.DIAGNOSTICOS (id_diagnostico, codigo_cie, nombre, descripcion, activo) VALUES (SUPERADMIN.SEQ_DIAGNOSTICOS.NEXTVAL,'K35','Apendicitis aguda','Inflamación del apéndice',1);
INSERT INTO SUPERADMIN.DIAGNOSTICOS (id_diagnostico, codigo_cie, nombre, descripcion, activo) VALUES (SUPERADMIN.SEQ_DIAGNOSTICOS.NEXTVAL,'I21','Infarto agudo de miocardio','Obstrucción coronaria',1);
INSERT INTO SUPERADMIN.DIAGNOSTICOS (id_diagnostico, codigo_cie, nombre, descripcion, activo) VALUES (SUPERADMIN.SEQ_DIAGNOSTICOS.NEXTVAL,'S72','Fractura de cadera','Fractura del fémur proximal',1);
INSERT INTO SUPERADMIN.DIAGNOSTICOS (id_diagnostico, codigo_cie, nombre, descripcion, activo) VALUES (SUPERADMIN.SEQ_DIAGNOSTICOS.NEXTVAL,'G35','Esclerosis múltiple','Enfermedad neurológica crónica',1);
INSERT INTO SUPERADMIN.DIAGNOSTICOS (id_diagnostico, codigo_cie, nombre, descripcion, activo) VALUES (SUPERADMIN.SEQ_DIAGNOSTICOS.NEXTVAL,'C18','Cáncer de colon','Neoplasia maligna del colon',1);
INSERT INTO SUPERADMIN.DIAGNOSTICOS (id_diagnostico, codigo_cie, nombre, descripcion, activo) VALUES (SUPERADMIN.SEQ_DIAGNOSTICOS.NEXTVAL,'N20','Cálculo renal','Litiasis urinaria',1);
INSERT INTO SUPERADMIN.DIAGNOSTICOS (id_diagnostico, codigo_cie, nombre, descripcion, activo) VALUES (SUPERADMIN.SEQ_DIAGNOSTICOS.NEXTVAL,'H26','Cataratas','Opacidad del cristalino',1);
INSERT INTO SUPERADMIN.DIAGNOSTICOS (id_diagnostico, codigo_cie, nombre, descripcion, activo) VALUES (SUPERADMIN.SEQ_DIAGNOSTICOS.NEXTVAL,'O82','Parto por cesárea','Extracción quirúrgica del feto',1);
INSERT INTO SUPERADMIN.DIAGNOSTICOS (id_diagnostico, codigo_cie, nombre, descripcion, activo) VALUES (SUPERADMIN.SEQ_DIAGNOSTICOS.NEXTVAL,'M16','Artrosis de cadera','Degeneración articular',1);
INSERT INTO SUPERADMIN.DIAGNOSTICOS (id_diagnostico, codigo_cie, nombre, descripcion, activo) VALUES (SUPERADMIN.SEQ_DIAGNOSTICOS.NEXTVAL,'J18','Neumonía','Infección pulmonar aguda',1);
COMMIT;

-- PACIENTES (20)
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'Juan','Pérez García',DATE '1985-03-15','MASCULINO','5552-0001','jperez@gmail.com','Zona 1, Guatemala','O+','Ninguna',1,SYSDATE);
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'María','López Tzul',DATE '1990-07-22','FEMENINO','5552-0002','mlopez@gmail.com','Zona 5, Guatemala','A+','Penicilina',1,SYSDATE);
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'Carlos','Ajú Batz',DATE '1978-11-30','MASCULINO','5552-0003','caju@gmail.com','Mixco, Guatemala','B+','Ninguna',1,SYSDATE);
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'Ana','Xitumul Pop',DATE '1995-04-10','FEMENINO','5552-0004','axitumul@gmail.com','Villa Nueva, Guatemala','AB+','Ibuprofeno',1,SYSDATE);
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'Roberto','Caal Tun',DATE '1982-09-05','MASCULINO','5552-0005','rcaal@gmail.com','Zona 12, Guatemala','O-','Ninguna',1,SYSDATE);
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'Sandra','Choc Ixim',DATE '1988-12-18','FEMENINO','5552-0006','schoc@gmail.com','Zona 7, Guatemala','A-','Sulfa',1,SYSDATE);
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'Miguel','Toj Mam',DATE '1975-06-25','MASCULINO','5552-0007','mtoj@gmail.com','Quetzaltenango','B-','Ninguna',1,SYSDATE);
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'Luisa','Balam Chi',DATE '1992-02-14','FEMENINO','5552-0008','lbalam@gmail.com','Antigua Guatemala','AB-','Aspirina',1,SYSDATE);
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'Pedro','Sipac Noj',DATE '1980-08-03','MASCULINO','5552-0009','psipac@gmail.com','Escuintla','O+','Ninguna',1,SYSDATE);
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'Gloria','Cux Yat',DATE '1993-05-20','FEMENINO','5552-0010','gcux@gmail.com','Cobán','A+','Ninguna',1,SYSDATE);
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'Diego','Ajcip Tzi',DATE '1987-10-11','MASCULINO','5552-0011','dajcip@gmail.com','Huehuetenango','B+','Morfina',1,SYSDATE);
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'Carmen','Tzul Xol',DATE '1991-03-28','FEMENINO','5552-0012','ctzul@gmail.com','San Marcos','O+','Ninguna',1,SYSDATE);
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'Héctor','Coy Noh',DATE '1976-07-16','MASCULINO','5552-0013','hcoy@gmail.com','Chiquimula','A+','Penicilina',1,SYSDATE);
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'Isabel','Pop Ixim',DATE '1984-01-09','FEMENINO','5552-0014','ipop@gmail.com','Jalapa','B+','Ninguna',1,SYSDATE);
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'Jorge','Tuj Batz',DATE '1979-11-22','MASCULINO','5552-0015','jtuj@gmail.com','Zacapa','AB+','Ninguna',1,SYSDATE);
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'Karina','Noj Yat',DATE '1996-06-07','FEMENINO','5552-0016','knoj@gmail.com','Petén','O-','Latex',1,SYSDATE);
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'Luis','Caal Xim',DATE '1983-04-19','MASCULINO','5552-0017','lcaal@gmail.com','Izabal','A+','Ninguna',1,SYSDATE);
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'Elena','Ajú Chi',DATE '1989-09-30','FEMENINO','5552-0018','eaju@gmail.com','Sololá','B-','Ninguna',1,SYSDATE);
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'Francisco','Tzep Pop',DATE '1977-12-05','MASCULINO','5552-0019','ftzep@gmail.com','Totonicapán','O+','Ibuprofeno',1,SYSDATE);
INSERT INTO SUPERADMIN.PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo, fecha_registro) VALUES (SUPERADMIN.SEQ_PACIENTES.NEXTVAL,'Rosa','Ixchel Tun',DATE '1994-08-14','FEMENINO','5552-0020','rixchel@gmail.com','Retalhuleu','A+','Ninguna',1,SYSDATE);
COMMIT;

-- PERFILES DEL SISTEMA (5)
INSERT INTO SUPERADMIN.PERFILES_SISTEMA (id_perfil, nombre, descripcion, privilegios, activo, fecha_creacion) VALUES (
  SUPERADMIN.SEQ_PERFILES.NEXTVAL,
  'ADMINISTRADOR',
  'Control total del sistema',
  'dashboard,pacientes,medicos,especialidades,quirofanos,equipos,reservas,emergencias,reportes,usuarios,perfiles,monitoreo',
  1, SYSDATE
);
INSERT INTO SUPERADMIN.PERFILES_SISTEMA (id_perfil, nombre, descripcion, privilegios, activo, fecha_creacion) VALUES (
  SUPERADMIN.SEQ_PERFILES.NEXTVAL,
  'JEFE_QUIROFANOS',
  'Gestión de quirófanos y aprobación de reservas',
  'dashboard,quirofanos,reservas,emergencias,reportes',
  1, SYSDATE
);
INSERT INTO SUPERADMIN.PERFILES_SISTEMA (id_perfil, nombre, descripcion, privilegios, activo, fecha_creacion) VALUES (
  SUPERADMIN.SEQ_PERFILES.NEXTVAL,
  'RECEPCIONISTA',
  'Gestión de pacientes y reservas',
  'dashboard,pacientes,medicos,reservas',
  1, SYSDATE
);
INSERT INTO SUPERADMIN.PERFILES_SISTEMA (id_perfil, nombre, descripcion, privilegios, activo, fecha_creacion) VALUES (
  SUPERADMIN.SEQ_PERFILES.NEXTVAL,
  'MEDICO',
  'Ver propias reservas y pacientes asignados',
  'dashboard,reservas,pacientes',
  1, SYSDATE
);
INSERT INTO SUPERADMIN.PERFILES_SISTEMA (id_perfil, nombre, descripcion, privilegios, activo, fecha_creacion) VALUES (
  SUPERADMIN.SEQ_PERFILES.NEXTVAL,
  'AUDITOR',
  'Solo lectura de reportes y logs',
  'dashboard,reportes,monitoreo',
  1, SYSDATE
);
COMMIT;

-- USUARIOS DEL SISTEMA (15 usuarios)
-- Contraseña: Hospital2026
INSERT INTO SUPERADMIN.USUARIOS_SISTEMA (id_usuario, nombre, apellido, username, password_hash, email, id_perfil, id_medico, activo, ultimo_acceso, fecha_creacion) VALUES (SUPERADMIN.SEQ_USUARIOS.NEXTVAL,'Marvin','Pérez','mperez','$2b$10$ka4JGK3F.VDMALOC3wX75.mdVWpKI9tmIe8LLrOdKg8ul177CXB8G','mperez@hospital.gt',1,NULL,1,NULL,SYSDATE);
INSERT INTO SUPERADMIN.USUARIOS_SISTEMA (id_usuario, nombre, apellido, username, password_hash, email, id_perfil, id_medico, activo, ultimo_acceso, fecha_creacion) VALUES (SUPERADMIN.SEQ_USUARIOS.NEXTVAL,'Carlo','Sosa','csosa','$2b$10$ka4JGK3F.VDMALOC3wX75.mdVWpKI9tmIe8LLrOdKg8ul177CXB8G','csosa@hospital.gt',1,NULL,1,NULL,SYSDATE);
INSERT INTO SUPERADMIN.USUARIOS_SISTEMA (id_usuario, nombre, apellido, username, password_hash, email, id_perfil, id_medico, activo, ultimo_acceso, fecha_creacion) VALUES (SUPERADMIN.SEQ_USUARIOS.NEXTVAL,'Karla','Xitumul','kxitumul','$2b$10$ka4JGK3F.VDMALOC3wX75.mdVWpKI9tmIe8LLrOdKg8ul177CXB8G','kxitumul@hospital.gt',1,NULL,1,NULL,SYSDATE);
INSERT INTO SUPERADMIN.USUARIOS_SISTEMA (id_usuario, nombre, apellido, username, password_hash, email, id_perfil, id_medico, activo, ultimo_acceso, fecha_creacion) VALUES (SUPERADMIN.SEQ_USUARIOS.NEXTVAL,'Edgar','Guzmán','eguzman','$2b$10$ka4JGK3F.VDMALOC3wX75.mdVWpKI9tmIe8LLrOdKg8ul177CXB8G','eguzman@hospital.gt',2,NULL,1,NULL,SYSDATE);
INSERT INTO SUPERADMIN.USUARIOS_SISTEMA (id_usuario, nombre, apellido, username, password_hash, email, id_perfil, id_medico, activo, ultimo_acceso, fecha_creacion) VALUES (SUPERADMIN.SEQ_USUARIOS.NEXTVAL,'José','Laynez','jlaynez','$2b$10$ka4JGK3F.VDMALOC3wX75.mdVWpKI9tmIe8LLrOdKg8ul177CXB8G','jlaynez@hospital.gt',2,NULL,1,NULL,SYSDATE);
INSERT INTO SUPERADMIN.USUARIOS_SISTEMA (id_usuario, nombre, apellido, username, password_hash, email, id_perfil, id_medico, activo, ultimo_acceso, fecha_creacion) VALUES (SUPERADMIN.SEQ_USUARIOS.NEXTVAL,'Noel','Guzmán','nguzman','$2b$10$ka4JGK3F.VDMALOC3wX75.mdVWpKI9tmIe8LLrOdKg8ul177CXB8G','nguzman@hospital.gt',2,NULL,1,NULL,SYSDATE);
INSERT INTO SUPERADMIN.USUARIOS_SISTEMA (id_usuario, nombre, apellido, username, password_hash, email, id_perfil, id_medico, activo, ultimo_acceso, fecha_creacion) VALUES (SUPERADMIN.SEQ_USUARIOS.NEXTVAL,'Rosa','Mendoza','rmendoza','$2b$10$ka4JGK3F.VDMALOC3wX75.mdVWpKI9tmIe8LLrOdKg8ul177CXB8G','rmendoza@hospital.gt',3,NULL,1,NULL,SYSDATE);
INSERT INTO SUPERADMIN.USUARIOS_SISTEMA (id_usuario, nombre, apellido, username, password_hash, email, id_perfil, id_medico, activo, ultimo_acceso, fecha_creacion) VALUES (SUPERADMIN.SEQ_USUARIOS.NEXTVAL,'Laura','García','lgarcia','$2b$10$ka4JGK3F.VDMALOC3wX75.mdVWpKI9tmIe8LLrOdKg8ul177CXB8G','lgarcia@hospital.gt',3,NULL,1,NULL,SYSDATE);
INSERT INTO SUPERADMIN.USUARIOS_SISTEMA (id_usuario, nombre, apellido, username, password_hash, email, id_perfil, id_medico, activo, ultimo_acceso, fecha_creacion) VALUES (SUPERADMIN.SEQ_USUARIOS.NEXTVAL,'Patricia','López','plopez','$2b$10$ka4JGK3F.VDMALOC3wX75.mdVWpKI9tmIe8LLrOdKg8ul177CXB8G','plopez@hospital.gt',3,NULL,1,NULL,SYSDATE);
INSERT INTO SUPERADMIN.USUARIOS_SISTEMA (id_usuario, nombre, apellido, username, password_hash, email, id_perfil, id_medico, activo, ultimo_acceso, fecha_creacion) VALUES (SUPERADMIN.SEQ_USUARIOS.NEXTVAL,'Carlos','Mendoza','doc_cmendoza','$2b$10$ka4JGK3F.VDMALOC3wX75.mdVWpKI9tmIe8LLrOdKg8ul177CXB8G','doc_cmendoza@hospital.gt',4,1,1,NULL,SYSDATE);
INSERT INTO SUPERADMIN.USUARIOS_SISTEMA (id_usuario, nombre, apellido, username, password_hash, email, id_perfil, id_medico, activo, ultimo_acceso, fecha_creacion) VALUES (SUPERADMIN.SEQ_USUARIOS.NEXTVAL,'Ana','García','doc_agarcia','$2b$10$ka4JGK3F.VDMALOC3wX75.mdVWpKI9tmIe8LLrOdKg8ul177CXB8G','doc_agarcia@hospital.gt',4,2,1,NULL,SYSDATE);
INSERT INTO SUPERADMIN.USUARIOS_SISTEMA (id_usuario, nombre, apellido, username, password_hash, email, id_perfil, id_medico, activo, ultimo_acceso, fecha_creacion) VALUES (SUPERADMIN.SEQ_USUARIOS.NEXTVAL,'Roberto','Ajú','doc_raju','$2b$10$ka4JGK3F.VDMALOC3wX75.mdVWpKI9tmIe8LLrOdKg8ul177CXB8G','doc_raju@hospital.gt',4,3,1,NULL,SYSDATE);
INSERT INTO SUPERADMIN.USUARIOS_SISTEMA (id_usuario, nombre, apellido, username, password_hash, email, id_perfil, id_medico, activo, ultimo_acceso, fecha_creacion) VALUES (SUPERADMIN.SEQ_USUARIOS.NEXTVAL,'Miguel','Auditor','mauditor','$2b$10$ka4JGK3F.VDMALOC3wX75.mdVWpKI9tmIe8LLrOdKg8ul177CXB8G','mauditor@hospital.gt',5,NULL,1,NULL,SYSDATE);
INSERT INTO SUPERADMIN.USUARIOS_SISTEMA (id_usuario, nombre, apellido, username, password_hash, email, id_perfil, id_medico, activo, ultimo_acceso, fecha_creacion) VALUES (SUPERADMIN.SEQ_USUARIOS.NEXTVAL,'Sara','Auditora','sauditora','$2b$10$ka4JGK3F.VDMALOC3wX75.mdVWpKI9tmIe8LLrOdKg8ul177CXB8G','sauditora@hospital.gt',5,NULL,1,NULL,SYSDATE);
INSERT INTO SUPERADMIN.USUARIOS_SISTEMA (id_usuario, nombre, apellido, username, password_hash, email, id_perfil, id_medico, activo, ultimo_acceso, fecha_creacion) VALUES (SUPERADMIN.SEQ_USUARIOS.NEXTVAL,'Tomas','Revisor','trevisor','$2b$10$ka4JGK3F.VDMALOC3wX75.mdVWpKI9tmIe8LLrOdKg8ul177CXB8G','trevisor@hospital.gt',5,NULL,1,NULL,SYSDATE);
COMMIT;

-- RESERVAS (5)
INSERT INTO SUPERADMIN.RESERVAS (id_reserva, id_paciente, id_medico, id_quirofano, id_especialidad, id_diagnostico, tipo_cirugia, descripcion_necesidad, fecha_reserva, hora_inicio, hora_fin, estado, prioridad, fecha_creacion, creado_por, observaciones) VALUES (SUPERADMIN.SEQ_RESERVAS.NEXTVAL,1,1,1,1,1,'Apendicectomía','Dolor abdominal agudo lado derecho',DATE '2026-04-05',TO_DATE('2026-04-05 08:00','YYYY-MM-DD HH24:MI'),TO_DATE('2026-04-05 10:00','YYYY-MM-DD HH24:MI'),'APROBADA','NORMAL',SYSDATE,'rmendoza',NULL);
INSERT INTO SUPERADMIN.RESERVAS (id_reserva, id_paciente, id_medico, id_quirofano, id_especialidad, id_diagnostico, tipo_cirugia, descripcion_necesidad, fecha_reserva, hora_inicio, hora_fin, estado, prioridad, fecha_creacion, creado_por, observaciones) VALUES (SUPERADMIN.SEQ_RESERVAS.NEXTVAL,2,6,5,3,2,'Cateterismo','Dolor pecho, posible infarto',DATE '2026-04-06',TO_DATE('2026-04-06 09:00','YYYY-MM-DD HH24:MI'),TO_DATE('2026-04-06 11:00','YYYY-MM-DD HH24:MI'),'APROBADA','URGENTE',SYSDATE,'rmendoza',NULL);
INSERT INTO SUPERADMIN.RESERVAS (id_reserva, id_paciente, id_medico, id_quirofano, id_especialidad, id_diagnostico, tipo_cirugia, descripcion_necesidad, fecha_reserva, hora_inicio, hora_fin, estado, prioridad, fecha_creacion, creado_por, observaciones) VALUES (SUPERADMIN.SEQ_RESERVAS.NEXTVAL,3,4,4,2,3,'Reemplazo de cadera','Fractura de cadera tras caída',DATE '2026-04-07',TO_DATE('2026-04-07 07:00','YYYY-MM-DD HH24:MI'),TO_DATE('2026-04-07 10:00','YYYY-MM-DD HH24:MI'),'SOLICITADA','NORMAL',SYSDATE,'lgarcia',NULL);
INSERT INTO SUPERADMIN.RESERVAS (id_reserva, id_paciente, id_medico, id_quirofano, id_especialidad, id_diagnostico, tipo_cirugia, descripcion_necesidad, fecha_reserva, hora_inicio, hora_fin, estado, prioridad, fecha_creacion, creado_por, observaciones) VALUES (SUPERADMIN.SEQ_RESERVAS.NEXTVAL,4,8,3,4,4,'Craneotomía','Tumor cerebral diagnosticado',DATE '2026-04-08',TO_DATE('2026-04-08 06:00','YYYY-MM-DD HH24:MI'),TO_DATE('2026-04-08 12:00','YYYY-MM-DD HH24:MI'),'APROBADA','URGENTE',SYSDATE,'rmendoza',NULL);
INSERT INTO SUPERADMIN.RESERVAS (id_reserva, id_paciente, id_medico, id_quirofano, id_especialidad, id_diagnostico, tipo_cirugia, descripcion_necesidad, fecha_reserva, hora_inicio, hora_fin, estado, prioridad, fecha_creacion, creado_por, observaciones) VALUES (SUPERADMIN.SEQ_RESERVAS.NEXTVAL,5,10,10,5,8,'Cesárea programada','Embarazo de alto riesgo',DATE '2026-04-09',TO_DATE('2026-04-09 08:00','YYYY-MM-DD HH24:MI'),TO_DATE('2026-04-09 10:00','YYYY-MM-DD HH24:MI'),'APROBADA','NORMAL',SYSDATE,'plopez',NULL);
COMMIT;

-- EMERGENCIAS (5)
INSERT INTO SUPERADMIN.EMERGENCIAS (id_emergencia, id_medico, id_quirofano, id_paciente, nivel_prioridad, descripcion, fecha_hora, estado, reserva_cancelada) VALUES (SUPERADMIN.SEQ_EMERGENCIAS.NEXTVAL,6,5,6,'CRITICA','Paro cardíaco en urgencias',SYSDATE,'ACTIVA',NULL);
INSERT INTO SUPERADMIN.EMERGENCIAS (id_emergencia, id_medico, id_quirofano, id_paciente, nivel_prioridad, descripcion, fecha_hora, estado, reserva_cancelada) VALUES (SUPERADMIN.SEQ_EMERGENCIAS.NEXTVAL,1,9,7,'ALTA','Trauma severo por accidente',SYSDATE,'ACTIVA',NULL);
INSERT INTO SUPERADMIN.EMERGENCIAS (id_emergencia, id_medico, id_quirofano, id_paciente, nivel_prioridad, descripcion, fecha_hora, estado, reserva_cancelada) VALUES (SUPERADMIN.SEQ_EMERGENCIAS.NEXTVAL,8,3,8,'MEDIA','Crisis neurológica aguda',SYSDATE,'RESUELTA',NULL);
INSERT INTO SUPERADMIN.EMERGENCIAS (id_emergencia, id_medico, id_quirofano, id_paciente, nivel_prioridad, descripcion, fecha_hora, estado, reserva_cancelada) VALUES (SUPERADMIN.SEQ_EMERGENCIAS.NEXTVAL,4,4,9,'ALTA','Fractura múltiple urgente',SYSDATE,'ACTIVA',NULL);
INSERT INTO SUPERADMIN.EMERGENCIAS (id_emergencia, id_medico, id_quirofano, id_paciente, nivel_prioridad, descripcion, fecha_hora, estado, reserva_cancelada) VALUES (SUPERADMIN.SEQ_EMERGENCIAS.NEXTVAL,7,2,10,'CRITICA','Hemorragia interna grave',SYSDATE,'ACTIVA',NULL);
COMMIT;
