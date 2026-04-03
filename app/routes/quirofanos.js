const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');
const { verificarToken } = require('../middleware/auth');

// Obtener todos los quirófanos
router.get('/', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`SELECT * FROM QUIROFANOS WHERE activo = 1 ORDER BY piso, nombre`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Obtener quirófanos disponibles
router.get('/disponibles', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`SELECT * FROM QUIROFANOS WHERE estado = 'DISPONIBLE' AND activo = 1`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Cambiar estado de quirófano
router.put('/estado/:id', verificarToken, async (req, res) => {
  const { estado } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE QUIROFANOS SET estado = :estado WHERE id_quirofano = :id`,
      { estado, id: req.params.id }
    );
    await conn.commit();
    res.json({ mensaje: 'Estado de quirófano actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
