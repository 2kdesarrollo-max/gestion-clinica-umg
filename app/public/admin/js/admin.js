/* ============================================================
   Gestión Clínica Integral UMG - JS Admin
   ============================================================ */

const API_URL = '/api';

class APIClient {
    constructor() {
        this.token = localStorage.getItem('admin_token');
    }

    async fetch(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers
            });
            const data = await response.json();
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    // logoutAdmin();
                }
                throw new Error(data.error || 'Error en la solicitud');
            }
            return data;
        } catch (err) {
            console.error('API Error:', err.message);
            throw err;
        }
    }

    async login(credentials) {
        return await this.fetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    // CRUD Genérico
    async get(endpoint) { return await this.fetch(endpoint); }
    async post(endpoint, data) { return await this.fetch(endpoint, { method: 'POST', body: JSON.stringify(data) }); }
    async put(endpoint, data) { return await this.fetch(endpoint, { method: 'PUT', body: JSON.stringify(data) }); }
    async delete(endpoint) { return await this.fetch(endpoint, { method: 'DELETE' }); }
}

const client = new APIClient();

// Sidebar dinámico
function initSidebar(privilegios) {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;

    const allModules = [
        { id: 'dashboard', label: 'Dashboard', icon: '🏠', url: 'dashboard.html' },
        { id: 'pacientes', label: 'Pacientes', icon: '👤', url: 'pacientes.html' },
        { id: 'medicos', label: 'Médicos', icon: '👨‍⚕️', url: 'medicos.html' },
        { id: 'especialidades', label: 'Especialidades', icon: '🩺', url: 'especialidades.html' },
        { id: 'quirofanos', label: 'Quirófanos', icon: '🏥', url: 'quirofanos.html' },
        { id: 'equipos', label: 'Equipos', icon: '🛠️', url: 'equipos.html' },
        { id: 'reservas', label: 'Reservas', icon: '📅', url: 'reservas.html' },
        { id: 'emergencias', label: 'Emergencias', icon: '🚨', url: 'emergencias.html' },
        { id: 'reportes', label: 'Reportes', icon: '📊', url: 'reportes.html' },
        { id: 'usuarios', label: 'Usuarios', icon: '👥', url: 'usuarios.html' },
        { id: 'perfiles', label: 'Perfiles', icon: '🛡️', url: 'perfiles.html' },
        { id: 'monitoreo', label: 'Monitoreo Oracle', icon: '🖥️', url: 'monitoreo.html' }
    ];

    const privs = Array.isArray(privilegios) ? privilegios : (privilegios ? privilegios.split(',') : []);
    
    nav.innerHTML = allModules
        .filter(m => privs.includes(m.id))
        .map(m => `
            <a href="${m.url}" class="nav-item ${window.location.pathname.includes(m.url) ? 'active' : ''}">
                <span class="nav-icon">${m.icon}</span>
                <span class="nav-label">${m.label}</span>
            </a>
        `).join('');
}

// Dashboard
async function refreshDashboard() {
    try {
        const quirofanos = await client.get('/quirofanos/disponibles');
        const reservas = await client.get('/reservas?estado=SOLICITADA');
        const emergencias = await client.get('/emergencias');
        const completadas = await client.get('/reservas?estado=COMPLETADA');

        document.getElementById('stat-quirofanos').innerText = quirofanos.length;
        document.getElementById('stat-reservas').innerText = reservas.length;
        document.getElementById('stat-emergencias').innerText = emergencias.length;
        document.getElementById('stat-completadas').innerText = completadas.length;

        // Cargar tablas rápidas
        const ultimasRes = await client.get('/reservas');
        document.getElementById('ultimas-reservas-body').innerHTML = ultimasRes.slice(0, 10).map(r => `
            <tr>
                <td>${r.PACIENTE}</td>
                <td>${r.TIPO_CIRUGIA}</td>
                <td>${new Date(r.FECHA_RESERVA).toLocaleDateString()}</td>
                <td><span class="badge badge-${r.ESTADO.toLowerCase()}">${r.ESTADO}</span></td>
                <td><a href="reservas.html" class="btn-outline">Ver</a></td>
            </tr>
        `).join('');

        document.getElementById('emergencias-activas-body').innerHTML = emergencias.map(e => `
            <tr>
                <td>${e.PACIENTE}</td>
                <td>${e.QUIROFANO}</td>
                <td><span class="badge badge-danger">${e.NIVEL_PRIORIDAD}</span></td>
                <td>${new Date(e.FECHA_HOR).toLocaleTimeString()}</td>
                <td><button onclick="resolverEmergencia(${e.ID_EMERGENCIA})" class="btn-primary">Resolver</button></td>
            </tr>
        `).join('');

        document.getElementById('last-refresh').innerText = `Actualizado: ${new Date().toLocaleTimeString()}`;
    } catch (err) {
        console.error('Error al actualizar dashboard:', err.message);
    }
}

// Gestión de Pacientes
async function cargarPacientes() {
    const body = document.getElementById('pacientes-body');
    if (!body) return;
    try {
        const pacientes = await client.get('/pacientes');
        body.innerHTML = pacientes.map(p => `
            <tr>
                <td>${p.ID_PACIENTE}</td>
                <td>${p.NOMBRE} ${p.APELLIDO}</td>
                <td>${p.EMAIL}</td>
                <td>${p.TELEFONO || '--'}</td>
                <td>${p.GENERO}</td>
                <td><span class="badge badge-${p.ACTIVO ? 'success' : 'danger'}">${p.ACTIVO ? 'ACTIVO' : 'BAJA'}</span></td>
                <td>
                    <button onclick="editarPaciente(${p.ID_PACIENTE})" class="btn-outline">Editar</button>
                    <button onclick="eliminarPaciente(${p.ID_PACIENTE})" class="btn-danger">Baja</button>
                </td>
            </tr>
        `).join('');
    } catch (err) { alert(err.message); }
}

// Gestión de Médicos
async function cargarMedicos() {
    const body = document.getElementById('medicos-body');
    if (!body) return;
    try {
        const medicos = await client.get('/medicos');
        body.innerHTML = medicos.map(m => `
            <tr>
                <td>${m.NOMBRE} ${m.APELLIDO}</td>
                <td>${m.ESPECIALIDAD_NOMBRE}</td>
                <td>${m.LICENCIA}</td>
                <td>${m.EMAIL}</td>
                <td><span class="badge badge-${m.ACTIVO ? 'success' : 'danger'}">${m.ACTIVO ? 'ACTIVO' : 'BAJA'}</span></td>
                <td>
                    <button onclick="editarMedico(${m.ID_MEDICO})" class="btn-outline">Editar</button>
                </td>
            </tr>
        `).join('');
    } catch (err) { alert(err.message); }
}

// Gestión de Quirófanos
async function cargarQuirofanos() {
    const grid = document.getElementById('quirofanos-grid');
    if (!grid) return;
    try {
        const quirofanos = await client.get('/quirofanos');
        grid.innerHTML = quirofanos.map(q => `
            <div class="quirofano-card">
                <h3>${q.NOMBRE}</h3>
                <p>Piso ${q.PISO}</p>
                <div class="q-status-container">
                    <span class="q-status status-${q.ESTADO.toLowerCase()}"></span>
                    <strong>${q.ESTADO}</strong>
                </div>
                <p>${q.EQUIPAMIENTO || ''}</p>
                <button onclick="cambiarEstadoQ(${q.ID_QUIROFANO}, '${q.ESTADO}')" class="btn-primary">Cambiar Estado</button>
            </div>
        `).join('');
    } catch (err) { console.error(err.message); }
}

// Monitoreo Oracle
async function cargarMonitoreo() {
    try {
        const sesiones = await client.get('/monitoreo/sesiones');
        document.getElementById('mon-sesiones-body').innerHTML = sesiones.map(s => `
            <tr><td>${s.SID}</td><td>${s.USERNAME}</td><td>${s.STATUS}</td><td>${s.MACHINE}</td><td>${s.EVENT}</td></tr>
        `).join('');

        const bloqueos = await client.get('/monitoreo/bloqueos');
        document.getElementById('mon-bloqueos-body').innerHTML = bloqueos.map(b => `
            <tr><td>${b.SID}</td><td>${b.USERNAME}</td><td>${b.TYPE}</td><td>${b.LMODE}</td><td>${b.REQUEST}</td><td>${b.BLOCK ? 'SÍ' : 'NO'}</td></tr>
        `).join('');

        const sql = await client.get('/monitoreo/top-sql');
        document.getElementById('mon-top-sql-body').innerHTML = sql.map(s => `
            <tr><td>${s.SQL_TEXT.substring(0, 50)}...</td><td>${s.ELAPSED_TIME}</td><td>${s.EXECUTIONS}</td><td>${s.ROWS_PROCESSED}</td></tr>
        `).join('');
    } catch (err) { console.error(err.message); }
}

// Reportes
async function cargarReportes() {
    try {
        const ocupacion = await client.get('/reportes/ocupacion-quirofanos');
        document.getElementById('reporte-ocupacion-body').innerHTML = ocupacion.map(o => `
            <tr><td>${o.NOMBRE}</td><td>${o.TOTAL_RESERVAS_MES}</td><td>${o.PORCENTAJE_OCUPACION}%</td></tr>
        `).join('');

        const medicos = await client.get('/reportes/estadisticas-medicos');
        document.getElementById('reporte-medicos-body').innerHTML = medicos.map(m => `
            <tr><td>${m.NOMBRE} ${m.APELLIDO}</td><td>${m.ESPECIALIDAD}</td><td>${m.TOTAL_RESERVAS}</td><td>${m.COMPLETADAS}</td><td>${m.CANCELADAS}</td></tr>
        `).join('');

        const auditoria = await client.get('/reportes/log-auditoria');
        document.getElementById('reporte-auditoria-body').innerHTML = auditoria.map(a => `
            <tr><td>${a.TABLA_AFECTADA}</td><td>${a.OPERACION}</td><td>${a.ID_REGISTRO}</td><td>${a.VALOR_ANTERIOR || '--'}</td><td>${a.VALOR_NUEVO || '--'}</td><td>${a.USUARIO_ORACLE}</td><td>${new Date(a.FECHA_HORA).toLocaleString()}</td></tr>
        `).join('');
    } catch (err) { console.error(err.message); }
}

// Auxiliares
function logoutAdmin() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.href = 'login.html';
}

function exportarCSV() {
    alert('Función de exportación básica activada. Descargando datos...');
    // Implementación simple de exportación CSV
}
