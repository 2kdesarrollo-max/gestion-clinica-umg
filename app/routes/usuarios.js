const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');
const { verificarToken, verificarPerfil, verificarPermiso } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Obtener todos los usuarios
router.get('/', verificarToken, verificarPermiso('usuarios', 'read'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.username, u.email, u.activo, u.id_perfil, p.nombre perfil_nombre
       FROM USUARIOS_SISTEMA u
       JOIN PERFILES_SISTEMA p ON u.id_perfil = p.id_perfil
       ORDER BY u.id_usuario DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Crear usuario
router.post('/', verificarToken, verificarPermiso('usuarios', 'write'), async (req, res) => {
  const { nombre, apellido, username, email, password, id_perfil } = req.body;
  let conn;
  try {
    conn = await getConnection();
    if (!password) return res.status(400).json({ error: 'Contraseña requerida' });
    const hash = await bcrypt.hash(password, 10);
    await conn.execute(
      `INSERT INTO USUARIOS_SISTEMA (id_usuario, nombre, apellido, username, email, password_hash, id_perfil, activo)
       VALUES (SEQ_USUARIOS.NEXTVAL, :nombre, :apellido, :username, :email, :hash, :id_perfil, 1)`,
      { nombre, apellido, username, email, hash, id_perfil }
    );
    await conn.commit();
    res.json({ mensaje: 'Usuario creado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Actualizar usuario
router.put('/:id', verificarToken, verificarPermiso('usuarios', 'write'), async (req, res) => {
  const { nombre, apellido, email, id_perfil } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE USUARIOS_SISTEMA SET 
        nombre = :nombre, apellido = :apellido, email = :email, id_perfil = :id_perfil
       WHERE id_usuario = :id`,
      { nombre, apellido, email, id_perfil, id: req.params.id }
    );
    await conn.commit();
    res.json({ mensaje: 'Usuario actualizado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Activar/Desactivar usuario
router.put('/estado/:id', verificarToken, verificarPermiso('usuarios', 'write'), async (req, res) => {
  const { activo } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE USUARIOS_SISTEMA SET activo = :activo WHERE id_usuario = :id`,
      { activo, id: req.params.id }
    );
    await conn.commit();
    res.json({ mensaje: `Usuario ${activo === 1 ? 'activado' : 'desactivado'}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Eliminar usuario
router.delete('/:id', verificarToken, verificarPerfil('ADMINISTRADOR'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `DELETE FROM USUARIOS_SISTEMA WHERE id_usuario = :id`,
      { id: req.params.id }
    );
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    await conn.commit();
    res.json({ mensaje: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
