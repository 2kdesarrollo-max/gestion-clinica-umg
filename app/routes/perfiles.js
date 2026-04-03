const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');
const { verificarToken } = require('../middleware/auth');

// Obtener todos los perfiles
router.get('/', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`SELECT * FROM PERFILES_SISTEMA WHERE activo = 1 ORDER BY nombre ASC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Crear perfil
router.post('/', verificarToken, async (req, res) => {
  const { nombre, descripcion, privilegios } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO PERFILES_SISTEMA (id_perfil, nombre, descripcion, privilegios, activo)
       VALUES (SEQ_PERFILES.NEXTVAL, :nombre, :descripcion, :privilegios, 1)`,
      { nombre, descripcion, privilegios }
    );
    await conn.commit();
    res.json({ mensaje: 'Perfil creado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Actualizar privilegios
router.put('/:id', verificarToken, async (req, res) => {
  const { nombre, descripcion, privilegios } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE PERFILES_SISTEMA SET 
        nombre = :nombre, descripcion = :descripcion, privilegios = :privilegios
       WHERE id_perfil = :id`,
      { nombre, descripcion, privilegios, id: req.params.id }
    );
    await conn.commit();
    res.json({ mensaje: 'Perfil actualizado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
