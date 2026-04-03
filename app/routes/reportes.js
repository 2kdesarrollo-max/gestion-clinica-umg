const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');
const { verificarToken } = require('../middleware/auth');

// Ocupación de quirófanos por mes (usando MV_OCUPACION_QUIROFANOS)
router.get('/ocupacion-quirofanos', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`SELECT * FROM MV_OCUPACION_QUIROFANOS`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Reservas por especialidad
router.get('/reservas-especialidad', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT e.nombre, COUNT(r.id_reserva) total
       FROM ESPECIALIDADES e
       LEFT JOIN RESERVAS r ON e.id_especialidad = r.id_especialidad
       GROUP BY e.nombre ORDER BY total DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Estadísticas por médico (usando MV_ESTADISTICAS_MEDICOS)
router.get('/estadisticas-medicos', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`SELECT * FROM MV_ESTADISTICAS_MEDICOS`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Log de auditoría
router.get('/log-auditoria', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT * FROM AUDITORIA_RESERVAS ORDER BY fecha_hora DESC FETCH FIRST 100 ROWS ONLY`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Equipos más utilizados
router.get('/equipos-usados', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT e.nombre, COUNT(re.id_reserva) total_usos
       FROM EQUIPOS e
       LEFT JOIN RESERVA_EQUIPOS re ON e.id_equipo = re.id_equipo
       GROUP BY e.nombre ORDER BY total_usos DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
