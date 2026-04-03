// ============================================================
// Gestión Clínica Integral UMG
// Servidor principal Express.js
// Puerto: 3001
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { initPool } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos
app.use('/imagenes', express.static(
  path.join(__dirname, '../../imagenes')
));
app.use('/portal', express.static(
  path.join(__dirname, 'public/portal')
));
app.use('/admin', express.static(
  path.join(__dirname, 'public/admin')
));

// Rutas API
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/pacientes',     require('./routes/pacientes'));
app.use('/api/medicos',       require('./routes/medicos'));
app.use('/api/especialidades',require('./routes/especialidades'));
app.use('/api/quirofanos',    require('./routes/quirofanos'));
app.use('/api/equipos',       require('./routes/equipos'));
app.use('/api/reservas',      require('./routes/reservas'));
app.use('/api/emergencias',   require('./routes/emergencias'));
app.use('/api/reportes',      require('./routes/reportes'));
app.use('/api/usuarios',      require('./routes/usuarios'));
app.use('/api/perfiles',      require('./routes/perfiles'));
app.use('/api/monitoreo',     require('./routes/monitoreo'));

// Ruta raíz → Portal paciente
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/portal/index.html'));
});

// Ruta admin → Portal hospital
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
initPool().then(() => {
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   GESTIÓN CLÍNICA INTEGRAL UMG             ║
║   Servidor corriendo en puerto ${PORT}        ║
║   Portal paciente: http://localhost:${PORT}   ║
║   Portal hospital: http://localhost:${PORT}/admin ║
╚════════════════════════════════════════════╗
    `);
  });
});
