// ============================================================
// Gestión Clínica Integral UMG
// Conexión a Oracle Database XEPDB1
// ============================================================
const oracledb = require('oracledb');
require('dotenv').config();

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = false;

let pool;

async function initPool() {
  try {
    pool = await oracledb.createPool({
      user:             process.env.DB_USER,
      password:         process.env.DB_PASSWORD,
      connectString:    `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE}`,
      poolMin:          2,
      poolMax:          10,
      poolIncrement:    1,
      poolTimeout:      60,
      stmtCacheSize:    23
    });
    console.log('✅ Conexión a Oracle XEPDB1 establecida correctamente');
  } catch (err) {
    console.error('❌ Error al conectar a Oracle:', err.message);
    process.exit(1);
  }
}

async function getConnection() {
  if (!pool) await initPool();
  return await pool.getConnection();
}

async function closePool() {
  if (pool) {
    await pool.close(0);
    console.log('Pool de Oracle cerrado');
  }
}

module.exports = { initPool, getConnection, closePool };
