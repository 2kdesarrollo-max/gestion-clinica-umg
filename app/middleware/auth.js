// ============================================================
// Middleware de autenticación JWT
// ============================================================
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/db');

const DEFAULT_PRIVILEGIOS = [
  'dashboard',
  'pacientes',
  'medicos',
  'especialidades',
  'quirofanos',
  'equipos',
  'reservas',
  'emergencias',
  'reportes',
  'usuarios',
  'perfiles',
  'monitoreo'
];

function parsePrivilegios(privilegios) {
  if (!privilegios) return DEFAULT_PRIVILEGIOS;
  if (Array.isArray(privilegios)) {
    return privilegios
      .map(v => String(v).trim().toLowerCase())
      .filter(Boolean);
  }
  const raw = String(privilegios).trim();
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map(v => String(v).trim().toLowerCase())
          .filter(Boolean);
      }
    } catch {}
  }
  return raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

function hasModuleRead(privs, modulo) {
  const m = String(modulo || '').trim().toLowerCase();
  if (!m) return false;
  const tokens = parsePrivilegios(privs);
  return tokens.includes(m) || tokens.includes(`${m}:r`) || tokens.includes(`${m}:w`);
}

function hasModuleWrite(privs, modulo) {
  const m = String(modulo || '').trim().toLowerCase();
  if (!m) return false;
  const tokens = parsePrivilegios(privs);
  return tokens.includes(`${m}:w`);
}

async function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  let conn;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    if (decoded && !decoded.tipo && decoded.id) {
      conn = await getConnection();
      const result = await conn.execute(
        `SELECT u.id_usuario, u.id_medico, u.activo, p.nombre perfil, p.privilegios
         FROM USUARIOS_SISTEMA u
         JOIN PERFILES_SISTEMA p ON u.id_perfil = p.id_perfil
         WHERE u.id_usuario = :id AND u.activo = 1`,
        { id: decoded.id }
      );
      if (!result.rows || result.rows.length === 0) {
        return res.status(403).json({ error: 'Token inválido o expirado' });
      }
      const row = result.rows[0];
      req.usuario.perfil = row.PERFIL;
      req.usuario.privilegios = row.PRIVILEGIOS;
      req.usuario.id_medico = row.ID_MEDICO || null;
    }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  } finally {
    if (conn) await conn.close();
  }
}

function verificarPerfil(...perfilesPermitidos) {
  return (req, res, next) => {
    const mode = String(process.env.PERMISOS_MODE || 'STRICT').toUpperCase();
    if (mode === 'OPEN') return next();
    if (!perfilesPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({
        error: 'No tienes permisos para esta acción'
      });
    }
    next();
  };
}

function verificarPermiso(modulo, accion) {
  return (req, res, next) => {
    const mode = String(process.env.PERMISOS_MODE || 'STRICT').toUpperCase();
    if (mode === 'OPEN') return next();
    const perfil = String(req.usuario?.perfil || '');
    if (perfil.toUpperCase() === 'SUPER_ADMIN' || perfil.toUpperCase() === 'SUPERADMIN') return next();

    const privs = req.usuario?.privilegios;
    const a = String(accion || 'read').toLowerCase();
    const ok = a === 'write'
      ? hasModuleWrite(privs, modulo)
      : hasModuleRead(privs, modulo);

    if (!ok) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

module.exports = { verificarToken, verificarPerfil, verificarPermiso };
