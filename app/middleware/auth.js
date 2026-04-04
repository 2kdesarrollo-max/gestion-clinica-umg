// ============================================================
// Middleware de autenticación JWT
// ============================================================
const jwt = require('jsonwebtoken');

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
  return tokens.includes(m) || tokens.includes(`${m}:w`);
}

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
}

function verificarPerfil(...perfilesPermitidos) {
  return (req, res, next) => {
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
    const perfil = String(req.usuario?.perfil || '');
    if (perfil.toUpperCase() === 'ADMINISTRADOR') return next();

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
