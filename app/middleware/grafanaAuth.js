function verificarGrafanaToken(req, res, next) {
  const expected = process.env.GRAFANA_API_TOKEN;
  if (!expected) return res.status(500).json({ error: 'GRAFANA_API_TOKEN no configurado' });

  const header = req.headers['authorization'] || '';
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null;
  const apiKey = req.headers['x-api-key'];
  const token = bearer || apiKey;

  if (!token) return res.status(401).json({ error: 'Token requerido' });
  if (token !== expected) return res.status(403).json({ error: 'Token inválido' });
  next();
}

module.exports = { verificarGrafanaToken };
