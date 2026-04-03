const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');
const { verificarToken } = require('../middleware/auth');

// Obtener todas las emergencias activas
router.get('/', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT e.*, m.nombre || ' ' || m.apellido medico, q.nombre quirofano, p.nombre || ' ' || p.apellido paciente
       FROM EMERGENCIAS e
       JOIN MEDICOS m ON e.id_medico = m.id_medico
       JOIN QUIROFANOS q ON e.id_quirofano = q.id_quirofano
       JOIN PACIENTES p ON e.id_paciente = p.id_paciente
       WHERE e.estado = 'ACTIVA' ORDER BY e.fecha_hora DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Crear emergencia (llama SP_PROCESAR_EMERGENCIA)
router.post('/', verificarToken, async (req, res) => {
  const { id_medico, id_quirofano, id_paciente, nivel, descripcion } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `BEGIN SP_PROCESAR_EMERGENCIA(:medico, :quirofano, :paciente, :nivel, :descripcion); END;`,
      { medico: id_medico, quirofano: id_quirofano, paciente: id_paciente, nivel, descripcion }
    );
    res.json({ mensaje: 'Emergencia procesada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Marcar emergencia como resuelta
router.put('/resolver/:id', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE EMERGENCIAS SET estado = 'RESUELTA' WHERE id_emergencia = :id`,
      { id: req.params.id }
    );
    await conn.commit();
    res.json({ mensaje: 'Emergencia marcada como resuelta' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
