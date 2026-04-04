const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const DEFAULT_PRIVILEGIOS = 'dashboard,pacientes,medicos,especialidades,quirofanos,equipos,reservas,emergencias,reportes,usuarios,perfiles,monitoreo';

// Login portal hospital
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.username,
              u.password_hash, u.activo, u.id_perfil,
              p.nombre perfil, p.privilegios
       FROM USUARIOS_SISTEMA u
       JOIN PERFILES_SISTEMA p ON u.id_perfil = p.id_perfil
       WHERE u.username = :username AND u.activo = 1`,
      { username }
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const usuario = result.rows[0];
    const passwordValida = await bcrypt.compare(password, usuario.PASSWORD_HASH);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    await conn.execute(
      `UPDATE USUARIOS_SISTEMA SET ultimo_acceso = SYSDATE WHERE id_usuario = :id`,
      { id: usuario.ID_USUARIO }
    );
    await conn.commit();
    const privilegios = usuario.PRIVILEGIOS || DEFAULT_PRIVILEGIOS;
    const token = jwt.sign(
      {
        id: usuario.ID_USUARIO,
        username: usuario.USERNAME,
        nombre: usuario.NOMBRE + ' ' + usuario.APELLIDO,
        perfil: usuario.PERFIL,
        privilegios
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES }
    );
    res.json({
      token,
      usuario: {
        id: usuario.ID_USUARIO,
        nombre: usuario.NOMBRE + ' ' + usuario.APELLIDO,
        username: usuario.USERNAME,
        perfil: usuario.PERFIL,
        privilegios: privilegios ? String(privilegios).split(',').map(s => s.trim()).filter(Boolean) : []
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Login portal paciente
router.post('/login-paciente', async (req, res) => {
  const { email, password } = req.body;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT id_paciente, nombre, apellido, email, password_hash
       FROM PACIENTES WHERE email = :email AND activo = 1`,
      { email }
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    const paciente = result.rows[0];
    const valida = await bcrypt.compare(password, paciente.PASSWORD_HASH || '');
    if (!valida) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    const token = jwt.sign(
      { id: paciente.ID_PACIENTE, tipo: 'PACIENTE',
        nombre: paciente.NOMBRE + ' ' + paciente.APELLIDO },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES }
    );
    res.json({ token, paciente: {
      id: paciente.ID_PACIENTE,
      nombre: paciente.NOMBRE + ' ' + paciente.APELLIDO
    }});
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Registro de paciente
router.post('/registro-paciente', async (req, res) => {
  const { nombre, apellido, email, password, telefono,
          fecha_nacimiento, genero } = req.body;
  let conn;
  try {
    conn = await getConnection();
    const hash = await bcrypt.hash(password, 10);
    await conn.execute(
      `INSERT INTO PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, password_hash, activo) 
       VALUES (SEQ_PACIENTES.NEXTVAL, :nombre, :apellido, TO_DATE(:fecha,'YYYY-MM-DD'), :genero, :telefono, :email, :hash, 1)`,
      { nombre, apellido, fecha: fecha_nacimiento, genero, telefono, email, hash }
    );
    await conn.commit();
    res.json({ mensaje: 'Paciente registrado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
