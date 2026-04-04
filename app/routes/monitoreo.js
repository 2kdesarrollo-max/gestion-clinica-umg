const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');
const { verificarToken } = require('../middleware/auth');

async function safeExecute(conn, sql, params = {}) {
  try {
    const result = await conn.execute(sql, params);
    return result.rows;
  } catch (err) {
    return { __error: err.message };
  }
}

// Resumen ejecutivo (KPIs)
router.get('/overview', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();

    const [
      sesiones,
      sesionesActivas,
      sesionesBloqueadas,
      bloqueos,
      waits,
      sysmetrics
    ] = await Promise.all([
      safeExecute(conn, `SELECT COUNT(*) total FROM V$SESSION WHERE username IS NOT NULL`),
      safeExecute(conn, `SELECT COUNT(*) total FROM V$SESSION WHERE username IS NOT NULL AND status = 'ACTIVE'`),
      safeExecute(conn, `SELECT COUNT(*) total FROM V$SESSION WHERE username IS NOT NULL AND blocking_session IS NOT NULL`),
      safeExecute(conn, `SELECT COUNT(*) total FROM V$LOCK l JOIN V$SESSION s ON l.sid = s.sid WHERE s.username IS NOT NULL AND l.block = 1`),
      safeExecute(conn, `
        SELECT event, wait_class, COUNT(*) cnt
        FROM V$SESSION
        WHERE username IS NOT NULL AND wait_class <> 'Idle' AND event IS NOT NULL
        GROUP BY event, wait_class
        ORDER BY cnt DESC FETCH FIRST 5 ROWS ONLY
      `),
      safeExecute(conn, `
        SELECT metric_name, value, unit
        FROM V$SYSMETRIC
        WHERE group_id = 2
          AND metric_name IN (
            'Database Time Per Sec',
            'Database CPU Time Ratio',
            'Host CPU Utilization (%)',
            'Executions Per Sec',
            'User Calls Per Sec'
          )
      `)
    ]);

    const topWait = Array.isArray(waits) && waits.length ? waits[0] : null;

    res.json({
      sesiones: sesiones.__error ? null : sesiones[0]?.TOTAL,
      sesiones_activas: sesionesActivas.__error ? null : sesionesActivas[0]?.TOTAL,
      sesiones_bloqueadas: sesionesBloqueadas.__error ? null : sesionesBloqueadas[0]?.TOTAL,
      bloqueos: bloqueos.__error ? null : bloqueos[0]?.TOTAL,
      top_wait: topWait
        ? { event: topWait.EVENT, wait_class: topWait.WAIT_CLASS, cnt: topWait.CNT }
        : null,
      sysmetrics: sysmetrics.__error ? [] : sysmetrics
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Top waits (no-idle)
router.get('/waits', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `
      SELECT wait_class, event, COUNT(*) cnt
      FROM V$SESSION
      WHERE username IS NOT NULL AND wait_class <> 'Idle' AND event IS NOT NULL
      GROUP BY wait_class, event
      ORDER BY cnt DESC FETCH FIRST 25 ROWS ONLY
      `
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Sesiones activas (V$SESSION)
router.get('/sesiones', verificarToken, async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT
         sid,
         serial#,
         username,
         status,
         osuser,
         machine,
         program,
         type,
         wait_class,
         event,
         sql_id,
         blocking_session,
         last_call_et,
         logon_time
       FROM V$SESSION
       WHERE username IS NOT NULL
       ORDER BY status DESC, last_call_et DESC`
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
      `SELECT
         t.addr,
         t.ses_addr,
         t.start_time,
         t.status,
         s.sid,
         s.serial#,
         s.username,
         s.machine,
         s.program
       FROM V$TRANSACTION t
       JOIN V$SESSION s ON t.ses_addr = s.saddr
       ORDER BY t.start_time`
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
      `SELECT
         sql_id,
         parsing_schema_name,
         elapsed_time,
         cpu_time,
         executions,
         rows_processed,
         sql_text
       FROM V$SQL
       WHERE sql_text IS NOT NULL
       ORDER BY elapsed_time DESC FETCH FIRST 15 ROWS ONLY`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
