const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');
const { verificarToken } = require('../middleware/auth');

// Obtener todos los equipos
router.get('/', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`SELECT * FROM EQUIPOS WHERE activo = 1 ORDER BY nombre ASC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Crear equipo
router.post('/', verificarToken, async (req, res) => {
  const { nombre, descripcion, cantidad_total } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO EQUIPOS (id_equipo, nombre, descripcion, cantidad_total, cantidad_disponible, activo)
       VALUES (SEQ_EQUIPOS.NEXTVAL, :nombre, :descripcion, :total, :total, 1)`,
      { nombre, descripcion, total: cantidad_total }
    );
    await conn.commit();
    res.json({ mensaje: 'Equipo registrado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Actualizar stock
router.put('/stock/:id', verificarToken, async (req, res) => {
  const { cantidad_total, cantidad_disponible } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE EQUIPOS SET 
        cantidad_total = :total, 
        cantidad_disponible = :disponible
       WHERE id_equipo = :id`,
      { total: cantidad_total, disponible: cantidad_disponible, id: req.params.id }
    );
    await conn.commit();
    res.json({ mensaje: 'Stock de equipo actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
