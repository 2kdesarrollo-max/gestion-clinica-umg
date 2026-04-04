const express = require('express');
const router = express.Router();
const { getGrafanaConnection } = require('../config/db');
const { verificarGrafanaToken } = require('../middleware/grafanaAuth');

function clampInt(value, def, min, max) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

router.use(verificarGrafanaToken);

router.get('/reservas', async (req, res) => {
  let conn;
  try {
    const limit = clampInt(req.query.limit, 500, 1, 5000);
    const { estado, fecha, from, to } = req.query;

    conn = await getGrafanaConnection();

    let sql = `
      SELECT
        r.id_reserva,
        r.fecha_reserva,
        r.hora_inicio,
        r.hora_fin,
        r.estado,
        r.prioridad,
        p.nombre || ' ' || p.apellido paciente,
        m.nombre || ' ' || m.apellido medico,
        q.nombre quirofano,
        e.nombre especialidad,
        r.tipo_cirugia,
        r.descripcion_necesidad
      FROM RESERVAS r
      JOIN PACIENTES p ON r.id_paciente = p.id_paciente
      JOIN MEDICOS m ON r.id_medico = m.id_medico
      JOIN QUIROFANOS q ON r.id_quirofano = q.id_quirofano
      JOIN ESPECIALIDADES e ON r.id_especialidad = e.id_especialidad
      WHERE 1=1
    `;

    const params = {};

    if (estado) {
      sql += ` AND r.estado = :estado`;
      params.estado = estado;
    }

    if (fecha) {
      sql += ` AND TRUNC(r.fecha_reserva) = TO_DATE(:fecha, 'YYYY-MM-DD')`;
      params.fecha = fecha;
    } else if (from && to) {
      sql += ` AND r.fecha_reserva >= TO_DATE(:from, 'YYYY-MM-DD') AND r.fecha_reserva < TO_DATE(:to, 'YYYY-MM-DD') + 1`;
      params.from = from;
      params.to = to;
    }

    sql += ` ORDER BY r.fecha_reserva DESC, r.hora_inicio DESC FETCH FIRST ${limit} ROWS ONLY`;

    const result = await conn.execute(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.get('/mv/disponibilidad-quirofanos', async (req, res) => {
  let conn;
  try {
    conn = await getGrafanaConnection();
    const result = await conn.execute(`SELECT * FROM MV_DISPONIBILIDAD_QUIROFANOS ORDER BY id_quirofano`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.get('/mv/ocupacion-quirofanos', async (req, res) => {
  let conn;
  try {
    conn = await getGrafanaConnection();
    const result = await conn.execute(`SELECT * FROM MV_OCUPACION_QUIROFANOS ORDER BY porcentaje_ocupacion DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
