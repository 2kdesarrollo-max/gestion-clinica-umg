// ============================================================
// Middleware de autenticación JWT
// ============================================================
const jwt = require('jsonwebtoken');

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

module.exports = { verificarToken, verificarPerfil };
