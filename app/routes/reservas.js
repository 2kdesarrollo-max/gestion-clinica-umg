const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getConnection } = require('../config/db');
const { verificarToken } = require('../middleware/auth');

function obtenerActor(usuario) {
  if (!usuario) return 'sistema';
  if (usuario.username) return usuario.username;
  if (usuario.tipo && usuario.id) return `${usuario.tipo}_${usuario.id}`;
  if (usuario.nombre) return usuario.nombre;
  if (usuario.id) return `USR_${usuario.id}`;
  return 'sistema';
}

// Obtener todas las reservas con filtros
router.get('/', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    let sql = `
      SELECT r.*,
             NVL(p.nombre || ' ' || p.apellido, '--') paciente,
             NVL(m.nombre || ' ' || m.apellido, '--') medico,
             NVL(q.nombre, '--') quirofano,
             NVL(e.nombre, '--') especialidad
      FROM RESERVAS r
      LEFT JOIN PACIENTES p ON r.id_paciente = p.id_paciente
      LEFT JOIN MEDICOS m ON r.id_medico = m.id_medico
      LEFT JOIN QUIROFANOS q ON r.id_quirofano = q.id_quirofano
      LEFT JOIN ESPECIALIDADES e ON r.id_especialidad = e.id_especialidad
      WHERE 1=1
    `;
    const params = {};
    if (req.query.estado) {
      sql += ` AND r.estado = :estado`;
      params.estado = req.query.estado;
    }
    if (req.query.fecha) {
      sql += ` AND TRUNC(r.fecha_reserva) = TO_DATE(:fecha, 'YYYY-MM-DD')`;
      params.fecha = req.query.fecha;
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
  if (req.usuario?.tipo === 'PACIENTE' && String(req.usuario.id) !== String(req.params.id)) {
    return res.status(403).json({ error: 'No tienes permisos para ver las reservas de otro paciente' });
  }
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

// Seguimiento de una reserva (timeline)
router.get('/:id/tracker', verificarToken, async (req, res) => {
  const idReserva = req.params.id;
  let conn;
  try {
    conn = await getConnection();

    const base = await conn.execute(
      `SELECT id_reserva, id_paciente, estado, fecha_creacion
       FROM RESERVAS
       WHERE id_reserva = :id`,
      { id: idReserva }
    );
    if (!base.rows || base.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    const row = base.rows[0];
    if (req.usuario?.tipo === 'PACIENTE' && String(row.ID_PACIENTE) !== String(req.usuario.id)) {
      return res.status(403).json({ error: 'No tienes permisos para ver esta reserva' });
    }

    const [validaciones, confirmaciones, auditoria] = await Promise.all([
      conn.execute(
        `SELECT tipo_validacion, resultado, mensaje, fecha_hora
         FROM VALIDACIONES
         WHERE id_reserva = :id
         ORDER BY fecha_hora ASC`,
        { id: idReserva }
      ),
      conn.execute(
        `SELECT confirmado_por, fecha_confirmacion, observaciones
         FROM CONFIRMACIONES
         WHERE id_reserva = :id
         ORDER BY fecha_confirmacion ASC`,
        { id: idReserva }
      ),
      conn.execute(
        `SELECT operacion, valor_anterior, valor_nuevo, usuario_sistema, fecha_hora
         FROM AUDITORIA_RESERVAS
         WHERE tabla_afectada = 'RESERVAS'
           AND id_registro = :id
         ORDER BY fecha_hora ASC`,
        { id: idReserva }
      )
    ]);

    const events = [];
    events.push({
      tipo: 'CREADA',
      mensaje: 'Solicitud enviada',
      fecha_hora: row.FECHA_CREACION,
      origen: 'Sistema'
    });

    (validaciones.rows || []).forEach(v => {
      events.push({
        tipo: `VALIDACION_${v.TIPO_VALIDACION}`,
        mensaje: `${v.TIPO_VALIDACION}: ${v.RESULTADO} · ${v.MENSAJE}`,
        fecha_hora: v.FECHA_HORA,
        origen: 'Validación'
      });
    });

    (confirmaciones.rows || []).forEach(c => {
      events.push({
        tipo: 'CONFIRMACION',
        mensaje: c.OBSERVACIONES,
        fecha_hora: c.FECHA_CONFIRMACION,
        origen: c.CONFIRMADO_POR || 'Sistema'
      });
    });

    (auditoria.rows || []).forEach(a => {
      if (String(a.OPERACION || '').toUpperCase() !== 'UPDATE') return;
      events.push({
        tipo: 'ACTUALIZACION',
        mensaje: a.VALOR_NUEVO || 'Actualización',
        fecha_hora: a.FECHA_HORA,
        origen: a.USUARIO_SISTEMA || 'Sistema'
      });
    });

    const norm = events
      .filter(e => e && e.fecha_hora)
      .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())
      .map(e => ({
        ...e,
        fecha_hora: new Date(e.fecha_hora).toLocaleString('es-GT')
      }));

    res.json({
      id_reserva: row.ID_RESERVA,
      estado: row.ESTADO,
      events: norm
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Crear reserva (llama SP_RESERVAR_QUIROFANO)
router.post('/', verificarToken, async (req, res) => {
  const { id_paciente, id_medico, id_quirofano, id_especialidad, tipo_cirugia, descripcion, fecha, hora_inicio, hora_fin, prioridad } = req.body;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `BEGIN 
         SP_RESERVAR_QUIROFANO(
           :id_paciente, :id_medico, :id_quirofano, :id_especialidad, 
           :tipo_cirugia, :descripcion, TO_DATE(:fecha, 'YYYY-MM-DD'), 
           TO_DATE(:inicio, 'YYYY-MM-DD HH24:MI'), TO_DATE(:fin, 'YYYY-MM-DD HH24:MI'), 
           :prioridad, :creado_por, :id_reserva
         ); 
       END;`,
      {
        id_paciente, id_medico, id_quirofano, id_especialidad, tipo_cirugia, descripcion,
        fecha, inicio: `${fecha} ${hora_inicio}`, fin: `${fecha} ${hora_fin}`,
        prioridad: prioridad || 'NORMAL',
        creado_por: obtenerActor(req.usuario),
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
    const msg = String(err.message || '');
    if (msg.includes('ORA-20001') || msg.includes('ORA-20003') || msg.includes('ORA-20004')) {
      return res.status(409).json({
        error: 'Conflicto: el quirófano o el médico no están disponibles en ese horario. Reprograma o asigna otro.'
      });
    }
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
        justificacion, reprogramado_por: obtenerActor(req.usuario)
      }
    );
    res.json({ mensaje: 'Reserva reprogramada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Asignar/Programar reserva (cambia médico/quirofano/horario)
router.put('/asignar/:id', verificarToken, async (req, res) => {
  const { id_medico, id_quirofano, id_especialidad, tipo_cirugia, descripcion, fecha, hora_inicio, hora_fin, prioridad } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE RESERVAS SET
         id_medico = :id_medico,
         id_quirofano = :id_quirofano,
         id_especialidad = :id_especialidad,
         tipo_cirugia = :tipo_cirugia,
         descripcion_necesidad = :descripcion,
         fecha_reserva = TO_DATE(:fecha, 'YYYY-MM-DD'),
         hora_inicio = TO_DATE(:inicio, 'YYYY-MM-DD HH24:MI'),
         hora_fin = TO_DATE(:fin, 'YYYY-MM-DD HH24:MI'),
         prioridad = :prioridad,
         estado = 'APROBADA'
       WHERE id_reserva = :id`,
      {
        id_medico,
        id_quirofano,
        id_especialidad,
        tipo_cirugia,
        descripcion,
        fecha,
        inicio: `${fecha} ${hora_inicio}`,
        fin: `${fecha} ${hora_fin}`,
        prioridad: prioridad || 'NORMAL',
        id: req.params.id
      }
    );
    await conn.commit();
    res.json({ mensaje: 'Reserva programada' });
  } catch (err) {
    const msg = String(err.message || '');
    if (msg.includes('ORA-20001') || msg.includes('ORA-20003') || msg.includes('ORA-20004')) {
      return res.status(409).json({
        error: 'Conflicto: el quirófano o el médico no están disponibles en ese horario. Ajusta horario o asigna otro.'
      });
    }
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
    if (req.usuario?.tipo === 'PACIENTE') {
      const check = await conn.execute(
        `SELECT id_paciente, estado
         FROM RESERVAS
         WHERE id_reserva = :id`,
        { id: req.params.id }
      );
      if (!check.rows || check.rows.length === 0) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }
      const row = check.rows[0];
      if (String(row.ID_PACIENTE) !== String(req.usuario.id)) {
        return res.status(403).json({ error: 'No puedes cancelar una reserva de otro paciente' });
      }
      const estado = String(row.ESTADO || '').toUpperCase();
      if (estado !== 'SOLICITADA' && estado !== 'APROBADA') {
        return res.status(409).json({ error: 'Esta reserva ya no se puede cancelar' });
      }
    }
    await conn.execute(
      `BEGIN SP_CANCELAR_RESERVA(:id, :motivo, :cancelado_por); END;`,
      { id: req.params.id, motivo: motivo || 'Cancelado por usuario', cancelado_por: obtenerActor(req.usuario) }
    );
    res.json({ mensaje: 'Reserva cancelada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
