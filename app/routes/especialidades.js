const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');
const { verificarToken } = require('../middleware/auth');

// Obtener todas las especialidades
router.get('/', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`SELECT * FROM ESPECIALIDADES WHERE activo = 1 ORDER BY nombre ASC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Crear especialidad
router.post('/', verificarToken, async (req, res) => {
  const { nombre, descripcion } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO ESPECIALIDADES (id_especialidad, nombre, descripcion, activo)
       VALUES (SEQ_ESPECIALIDADES.NEXTVAL, :nombre, :descripcion, 1)`,
      { nombre, descripcion }
    );
    await conn.commit();
    res.json({ mensaje: 'Especialidad creada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Actualizar especialidad
router.put('/:id', verificarToken, async (req, res) => {
  const { nombre, descripcion } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE ESPECIALIDADES SET nombre = :nombre, descripcion = :descripcion
       WHERE id_especialidad = :id`,
      { nombre, descripcion, id: req.params.id }
    );
    await conn.commit();
    res.json({ mensaje: 'Especialidad actualizada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Dar de baja especialidad
router.put('/baja/:id', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE ESPECIALIDADES SET activo = 0 WHERE id_especialidad = :id`,
      { id: req.params.id }
    );
    await conn.commit();
    res.json({ mensaje: 'Especialidad dada de baja' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
