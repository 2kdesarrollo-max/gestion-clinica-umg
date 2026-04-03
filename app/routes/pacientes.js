const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');
const { verificarToken } = require('../middleware/auth');

// Obtener todos los pacientes
router.get('/', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`SELECT * FROM PACIENTES WHERE activo = 1 ORDER BY id_paciente DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Obtener paciente por ID
router.get('/:id', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT * FROM PACIENTES WHERE id_paciente = :id`,
      { id: req.params.id }
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Crear paciente
router.post('/', verificarToken, async (req, res) => {
  const { nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO PACIENTES (id_paciente, nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias, activo)
       VALUES (SEQ_PACIENTES.NEXTVAL, :nombre, :apellido, TO_DATE(:fecha, 'YYYY-MM-DD'), :genero, :telefono, :email, :direccion, :sangre, :alergias, 1)`,
      { nombre, apellido, fecha: fecha_nacimiento, genero, telefono, email, direccion, sangre: tipo_sangre, alergias }
    );
    await conn.commit();
    res.json({ mensaje: 'Paciente creado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Actualizar paciente
router.put('/:id', verificarToken, async (req, res) => {
  const { nombre, apellido, fecha_nacimiento, genero, telefono, email, direccion, tipo_sangre, alergias } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE PACIENTES SET 
        nombre = :nombre, apellido = :apellido, fecha_nacimiento = TO_DATE(:fecha, 'YYYY-MM-DD'),
        genero = :genero, telefono = :telefono, email = :email, direccion = :direccion,
        tipo_sangre = :sangre, alergias = :alergias
       WHERE id_paciente = :id`,
      { nombre, apellido, fecha: fecha_nacimiento, genero, telefono, email, direccion, sangre: tipo_sangre, alergias, id: req.params.id }
    );
    await conn.commit();
    res.json({ mensaje: 'Paciente actualizado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Baja lógica de paciente
router.delete('/:id', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE PACIENTES SET activo = 0 WHERE id_paciente = :id`,
      { id: req.params.id }
    );
    await conn.commit();
    res.json({ mensaje: 'Paciente dado de baja' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
