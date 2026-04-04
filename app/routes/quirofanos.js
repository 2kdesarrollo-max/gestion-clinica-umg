const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');
const { verificarToken, verificarPermiso } = require('../middleware/auth');

// Obtener todos los quirófanos
router.get('/', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT q.id_quirofano, q.nombre, q.piso, q.capacidad, q.equipamiento, q.activo,
                CASE
                  WHEN EXISTS (
                    SELECT 1 FROM QUIROFANO_BLOQUEOS b
                    WHERE b.id_quirofano = q.id_quirofano
                      AND b.activo = 1
                      AND b.tipo = 'MANTENIMIENTO'
                      AND SYSDATE BETWEEN b.inicio AND b.fin
                  ) THEN 'MANTENIMIENTO'
                  WHEN EXISTS (
                    SELECT 1 FROM RESERVAS r
                    WHERE r.id_quirofano = q.id_quirofano
                      AND r.estado IN ('APROBADA','EN_CURSO')
                      AND SYSDATE BETWEEN r.hora_inicio AND r.hora_fin
                  ) THEN 'OCUPADO'
                  ELSE q.estado
                END AS estado
         FROM QUIROFANOS q
         WHERE q.activo = 1
         ORDER BY q.piso, q.nombre`
      );
      return res.json(result.rows);
    } catch (err) {
      if (!String(err.message || '').includes('ORA-00942')) throw err;
      const result = await conn.execute(
        `SELECT q.id_quirofano, q.nombre, q.piso, q.capacidad, q.equipamiento, q.activo,
                CASE
                  WHEN EXISTS (
                    SELECT 1 FROM RESERVAS r
                    WHERE r.id_quirofano = q.id_quirofano
                      AND r.estado IN ('APROBADA','EN_CURSO')
                      AND SYSDATE BETWEEN r.hora_inicio AND r.hora_fin
                  ) THEN 'OCUPADO'
                  ELSE q.estado
                END AS estado
         FROM QUIROFANOS q
         WHERE q.activo = 1
         ORDER BY q.piso, q.nombre`
      );
      return res.json(result.rows);
    }
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
    try {
      const result = await conn.execute(
        `SELECT q.id_quirofano, q.nombre, q.piso, q.capacidad, q.equipamiento, q.activo,
                CASE
                  WHEN EXISTS (
                    SELECT 1 FROM QUIROFANO_BLOQUEOS b
                    WHERE b.id_quirofano = q.id_quirofano
                      AND b.activo = 1
                      AND b.tipo = 'MANTENIMIENTO'
                      AND SYSDATE BETWEEN b.inicio AND b.fin
                  ) THEN 'MANTENIMIENTO'
                  WHEN EXISTS (
                    SELECT 1 FROM RESERVAS r
                    WHERE r.id_quirofano = q.id_quirofano
                      AND r.estado IN ('APROBADA','EN_CURSO')
                      AND SYSDATE BETWEEN r.hora_inicio AND r.hora_fin
                  ) THEN 'OCUPADO'
                  ELSE q.estado
                END AS estado
         FROM QUIROFANOS q
         WHERE q.activo = 1
           AND NOT EXISTS (
             SELECT 1 FROM QUIROFANO_BLOQUEOS b
             WHERE b.id_quirofano = q.id_quirofano
               AND b.activo = 1
               AND b.tipo = 'MANTENIMIENTO'
               AND SYSDATE BETWEEN b.inicio AND b.fin
           )
           AND NOT EXISTS (
             SELECT 1 FROM RESERVAS r
             WHERE r.id_quirofano = q.id_quirofano
               AND r.estado IN ('APROBADA','EN_CURSO')
               AND SYSDATE BETWEEN r.hora_inicio AND r.hora_fin
           )
         ORDER BY q.piso, q.nombre`
      );
      return res.json(result.rows);
    } catch (err) {
      if (!String(err.message || '').includes('ORA-00942')) throw err;
      const result = await conn.execute(
        `SELECT q.id_quirofano, q.nombre, q.piso, q.capacidad, q.equipamiento, q.activo,
                CASE
                  WHEN EXISTS (
                    SELECT 1 FROM RESERVAS r
                    WHERE r.id_quirofano = q.id_quirofano
                      AND r.estado IN ('APROBADA','EN_CURSO')
                      AND SYSDATE BETWEEN r.hora_inicio AND r.hora_fin
                  ) THEN 'OCUPADO'
                  ELSE q.estado
                END AS estado
         FROM QUIROFANOS q
         WHERE q.activo = 1
           AND NOT EXISTS (
             SELECT 1 FROM RESERVAS r
             WHERE r.id_quirofano = q.id_quirofano
               AND r.estado IN ('APROBADA','EN_CURSO')
               AND SYSDATE BETWEEN r.hora_inicio AND r.hora_fin
           )
         ORDER BY q.piso, q.nombre`
      );
      return res.json(result.rows);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Ventanas de mantenimiento/bloqueo por fecha
router.get('/bloqueos', verificarToken, async (req, res) => {
  const { fecha } = req.query;
  let conn;
  try {
    conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT b.id_bloqueo, b.id_quirofano, b.tipo, b.inicio, b.fin, b.motivo, b.activo
         FROM QUIROFANO_BLOQUEOS b
         WHERE b.activo = 1
           AND (:fecha IS NULL OR TRUNC(b.inicio) = TO_DATE(:fecha, 'YYYY-MM-DD') OR TRUNC(b.fin) = TO_DATE(:fecha, 'YYYY-MM-DD'))
         ORDER BY b.inicio ASC`,
        { fecha: fecha || null }
      );
      return res.json(result.rows);
    } catch (err) {
      if (String(err.message || '').includes('ORA-00942')) return res.json([]);
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Crear ventana de mantenimiento/bloqueo
router.post('/bloqueos', verificarToken, verificarPermiso('quirofanos', 'write'), async (req, res) => {
  const { id_quirofano, tipo, inicio, fin, motivo } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO QUIROFANO_BLOQUEOS (id_bloqueo, id_quirofano, tipo, inicio, fin, motivo, activo, creado_por)
       VALUES (SEQ_QUIROFANO_BLOQUEOS.NEXTVAL, :id_quirofano, :tipo, TO_DATE(:inicio, 'YYYY-MM-DD HH24:MI'), TO_DATE(:fin, 'YYYY-MM-DD HH24:MI'), :motivo, 1, :creado_por)`,
      {
        id_quirofano,
        tipo: tipo || 'MANTENIMIENTO',
        inicio,
        fin,
        motivo: motivo || null,
        creado_por: req.usuario?.username || req.usuario?.nombre || null
      }
    );
    await conn.commit();
    res.json({ mensaje: 'Bloqueo creado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Eliminar ventana de mantenimiento/bloqueo
router.delete('/bloqueos/:id', verificarToken, verificarPermiso('quirofanos', 'write'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE QUIROFANO_BLOQUEOS SET activo = 0 WHERE id_bloqueo = :id`,
      { id: req.params.id }
    );
    await conn.commit();
    res.json({ mensaje: 'Bloqueo eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Disponibilidad por rango horario (devuelve ocupados y bloqueados)
router.get('/disponibilidad', verificarToken, async (req, res) => {
  const { fecha, hora_inicio, hora_fin } = req.query;
  if (!fecha || !hora_inicio || !hora_fin) {
    return res.status(400).json({ error: 'fecha, hora_inicio y hora_fin son requeridos' });
  }
  let conn;
  try {
    conn = await getConnection();
    const inicioTs = `${fecha} ${hora_inicio}`;
    const finTs = `${fecha} ${hora_fin}`;

    const reservas = await conn.execute(
      `SELECT r.id_quirofano, COUNT(*) cantidad
       FROM RESERVAS r
       WHERE r.estado IN ('APROBADA','EN_CURSO')
         AND TRUNC(r.fecha_reserva) = TO_DATE(:fecha, 'YYYY-MM-DD')
         AND r.hora_inicio < TO_DATE(:fin_ts, 'YYYY-MM-DD HH24:MI')
         AND r.hora_fin > TO_DATE(:inicio_ts, 'YYYY-MM-DD HH24:MI')
       GROUP BY r.id_quirofano`,
      { fecha, inicio_ts: inicioTs, fin_ts: finTs }
    );

    let bloqueosRows = [];
    try {
      const bloqueos = await conn.execute(
        `SELECT b.id_quirofano, COUNT(*) cantidad
         FROM QUIROFANO_BLOQUEOS b
         WHERE b.activo = 1
           AND b.inicio < TO_DATE(:fin_ts, 'YYYY-MM-DD HH24:MI')
           AND b.fin > TO_DATE(:inicio_ts, 'YYYY-MM-DD HH24:MI')
         GROUP BY b.id_quirofano`,
        { inicio_ts: inicioTs, fin_ts: finTs }
      );
      bloqueosRows = bloqueos.rows || [];
    } catch (err) {
      if (!String(err.message || '').includes('ORA-00942')) throw err;
    }

    res.json({
      rango: { fecha, hora_inicio, hora_fin },
      ocupados_por_reserva: reservas.rows || [],
      bloqueados_por_mantenimiento: bloqueosRows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Cambiar estado de quirófano
router.put('/estado/:id', verificarToken, verificarPermiso('quirofanos', 'write'), async (req, res) => {
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
