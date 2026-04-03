const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../config/db');
const { verificarToken } = require('../middleware/auth');

// Obtener todas las reservas con filtros
router.get('/', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    let sql = `
      SELECT r.*, p.nombre || ' ' || p.apellido paciente,
             m.nombre || ' ' || m.apellido medico,
             q.nombre quirofano, e.nombre especialidad
      FROM RESERVAS r
      JOIN PACIENTES p ON r.id_paciente = p.id_paciente
      JOIN MEDICOS m ON r.id_medico = m.id_medico
      JOIN QUIROFANOS q ON r.id_quirofano = q.id_quirofano
      JOIN ESPECIALIDADES e ON r.id_especialidad = e.id_especialidad
      WHERE 1=1
    `;
    const params = {};
    if (req.query.estado) {
      sql += ` AND r.estado = :estado`;
      params.estado = req.query.estado;
    }
    sql += ` ORDER BY r.fecha_reserva DESC, r.hora_inicio DESC`;
    const result = await conn.execute(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Obtener reservas por paciente
router.get('/paciente/:id', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT r.*, m.nombre || ' ' || m.apellido medico, q.nombre quirofano
       FROM RESERVAS r
       JOIN MEDICOS m ON r.id_medico = m.id_medico
       JOIN QUIROFANOS q ON r.id_quirofano = q.id_quirofano
       WHERE r.id_paciente = :id ORDER BY r.fecha_reserva DESC`,
      { id: req.params.id }
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Crear reserva (llama SP_RESERVAR_QUIROFANO)
router.post('/', verificarToken, async (req, res) => {
  const { id_paciente, id_medico, id_quirofano, id_especialidad, tipo_cirugia, descripcion, fecha, hora_inicio, hora_fin } = req.body;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `BEGIN 
         SP_RESERVAR_QUIROFANO(
           :id_paciente, :id_medico, :id_quirofano, :id_especialidad, 
           :tipo_cirugia, :descripcion, TO_DATE(:fecha, 'YYYY-MM-DD'), 
           TO_DATE(:inicio, 'YYYY-MM-DD HH24:MI'), TO_DATE(:fin, 'YYYY-MM-DD HH24:MI'), 
           :creado_por, :id_reserva
         ); 
       END;`,
      {
        id_paciente, id_medico, id_quirofano, id_especialidad, tipo_cirugia, descripcion,
        fecha, inicio: `${fecha} ${hora_inicio}`, fin: `${fecha} ${hora_fin}`,
        creado_por: req.usuario.username,
        id_reserva: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      }
    );
    res.json({ mensaje: 'Reserva creada exitosamente', id: result.outBinds.id_reserva });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Cambiar estado de reserva
router.put('/estado/:id', verificarToken, async (req, res) => {
  const { estado } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE RESERVAS SET estado = :estado WHERE id_reserva = :id`,
      { estado, id: req.params.id }
    );
    await conn.commit();
    res.json({ mensaje: 'Estado de reserva actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Reprogramar reserva (llama SP_REPROGRAMAR_RESERVA)
router.put('/reprogramar/:id', verificarToken, async (req, res) => {
  const { fecha_nueva, hora_inicio_nueva, hora_fin_nueva, justificacion } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `BEGIN 
         SP_REPROGRAMAR_RESERVA(
           :id, TO_DATE(:fecha, 'YYYY-MM-DD'), 
           TO_DATE(:inicio, 'YYYY-MM-DD HH24:MI'), TO_DATE(:fin, 'YYYY-MM-DD HH24:MI'), 
           :justificacion, :reprogramado_por
         ); 
       END;`,
      {
        id: req.params.id, fecha: fecha_nueva,
        inicio: `${fecha_nueva} ${hora_inicio_nueva}`, fin: `${fecha_nueva} ${hora_fin_nueva}`,
        justificacion, reprogramado_por: req.usuario.username
      }
    );
    res.json({ mensaje: 'Reserva reprogramada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Cancelar reserva (llama SP_CANCELAR_RESERVA)
router.delete('/:id', verificarToken, async (req, res) => {
  const { motivo } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `BEGIN SP_CANCELAR_RESERVA(:id, :motivo, :cancelado_por); END;`,
      { id: req.params.id, motivo: motivo || 'Cancelado por usuario', cancelado_por: req.usuario.username }
    );
    res.json({ mensaje: 'Reserva cancelada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
