const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');
const { verificarToken } = require('../middleware/auth');

// Disponibilidad por rango horario (devuelve médicos ocupados)
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
    const result = await conn.execute(
      `SELECT r.id_medico, COUNT(*) cantidad
       FROM RESERVAS r
       WHERE r.estado IN ('APROBADA','EN_CURSO')
         AND TRUNC(r.fecha_reserva) = TO_DATE(:fecha, 'YYYY-MM-DD')
         AND r.hora_inicio < TO_DATE(:fin_ts, 'YYYY-MM-DD HH24:MI')
         AND r.hora_fin > TO_DATE(:inicio_ts, 'YYYY-MM-DD HH24:MI')
       GROUP BY r.id_medico`,
      { fecha, inicio_ts: inicioTs, fin_ts: finTs }
    );
    res.json({
      rango: { fecha, hora_inicio, hora_fin },
      ocupados_por_reserva: result.rows || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Obtener todos los médicos
router.get('/', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT m.*, e.nombre especialidad_nombre
       FROM MEDICOS m
       JOIN ESPECIALIDADES e ON m.id_especialidad = e.id_especialidad
       WHERE m.activo = 1 ORDER BY m.id_medico DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Obtener médico por ID
router.get('/:id', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT m.*, e.nombre especialidad_nombre
       FROM MEDICOS m
       JOIN ESPECIALIDADES e ON m.id_especialidad = e.id_especialidad
       WHERE m.id_medico = :id`,
      { id: req.params.id }
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Médico no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Crear médico
router.post('/', verificarToken, async (req, res) => {
  const { nombre, apellido, id_especialidad, licencia, telefono, email } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `INSERT INTO MEDICOS (id_medico, nombre, apellido, id_especialidad, licencia, telefono, email, activo)
       VALUES (SEQ_MEDICOS.NEXTVAL, :nombre, :apellido, :id_especialidad, :licencia, :telefono, :email, 1)`,
      { nombre, apellido, id_especialidad, licencia, telefono, email }
    );
    await conn.commit();
    res.json({ mensaje: 'Médico creado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Actualizar médico
router.put('/:id', verificarToken, async (req, res) => {
  const { nombre, apellido, id_especialidad, licencia, telefono, email } = req.body;
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE MEDICOS SET 
        nombre = :nombre, apellido = :apellido, id_especialidad = :id_especialidad,
        licencia = :licencia, telefono = :telefono, email = :email
       WHERE id_medico = :id`,
      { nombre, apellido, id_especialidad, licencia, telefono, email, id: req.params.id }
    );
    await conn.commit();
    res.json({ mensaje: 'Médico actualizado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Dar de baja médico
router.put('/baja/:id', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE MEDICOS SET activo = 0 WHERE id_medico = :id`,
      { id: req.params.id }
    );
    await conn.commit();
    res.json({ mensaje: 'Médico dado de baja' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
