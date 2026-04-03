const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');
const { verificarToken } = require('../middleware/auth');

// Sesiones activas (V$SESSION)
router.get('/sesiones', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT sid, serial#, username, status, osuser, machine, program, type, event 
       FROM V$SESSION WHERE username IS NOT NULL`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Bloqueos activos (V$LOCK)
router.get('/bloqueos', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT l.sid, s.username, l.type, l.lmode, l.request, l.block
       FROM V$LOCK l JOIN V$SESSION s ON l.sid = s.sid
       WHERE s.username IS NOT NULL`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Transacciones activas (V$TRANSACTION)
router.get('/transacciones', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT t.addr, t.ses_addr, t.start_time, t.status, s.username
       FROM V$TRANSACTION t JOIN V$SESSION s ON t.ses_addr = s.saddr`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Top consultas lentas (V$SQL)
router.get('/top-sql', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT sql_text, elapsed_time, cpu_time, executions, rows_processed
       FROM V$SQL WHERE parsing_schema_name = 'SUPERADMIN'
       ORDER BY elapsed_time DESC FETCH FIRST 10 ROWS ONLY`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
