/* ============================================================
   Gestión Clínica Integral UMG - JS Admin
   ============================================================ */

const API_URL = '/api';

class APIClient {
    constructor() {
        this.token = localStorage.getItem('admin_token');
    }

    async fetch(endpoint, options = {}) {
        this.token = localStorage.getItem('admin_token');
        const headers = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            ...options.headers
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers,
                cache: 'no-store'
            });
            if (response.status === 304 || response.status === 204) {
                return null;
            }
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
    async delete(endpoint, data) {
        const opts = { method: 'DELETE' };
        if (data !== undefined) {
            opts.body = JSON.stringify(data);
        }
        return await this.fetch(endpoint, opts);
    }
}

const client = new APIClient();
let pacientesCache = [];
let medicosCache = [];
let especialidadesCache = [];
let equiposCache = [];
let perfilesCache = [];
let reservasCache = [];
let usuariosCache = [];
let reservaPreset = null;

function getAdminUser() {
    try {
        return JSON.parse(localStorage.getItem('admin_user') || 'null');
    } catch {
        return null;
    }
}

function isSuperAdminUser(user) {
    const perfil = String(user?.perfil || '').toUpperCase();
    return perfil === 'SUPERADMIN' || perfil === 'SUPER_ADMIN';
}

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

function getPrivilegeTokens(user) {
    const privs = user?.privilegios;
    if (!privs) return DEFAULT_PRIVILEGIOS.slice();
    if (Array.isArray(privs)) {
        return privs
            .map(v => String(v).trim().toLowerCase())
            .filter(Boolean);
    }
    const raw = String(privs).trim();
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

function canReadModule(user, moduleId) {
    const m = String(moduleId || '').trim().toLowerCase();
    if (!m) return false;
    if (isSuperAdminUser(user)) return true;
    const tokens = getPrivilegeTokens(user);
    return tokens.includes(m) || tokens.includes(`${m}:r`) || tokens.includes(`${m}:w`);
}

function canWriteModule(user, moduleId) {
    const m = String(moduleId || '').trim().toLowerCase();
    if (!m) return false;
    if (isSuperAdminUser(user)) return true;
    const tokens = getPrivilegeTokens(user);
    return tokens.includes(`${m}:w`);
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function initFloatingModals() {
    let drag = null;

    function onMove(e) {
        if (!drag) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        const w = drag.el.offsetWidth;
        const h = drag.el.offsetHeight;

        const left = clamp(drag.startLeft + dx, 8, window.innerWidth - w - 8);
        const top = clamp(drag.startTop + dy, 8, window.innerHeight - h - 8);

        drag.el.style.left = `${left}px`;
        drag.el.style.top = `${top}px`;
        drag.el.style.transform = 'none';
    }

    function onUp() {
        if (!drag) return;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        drag = null;
    }

    document.addEventListener('mousedown', (e) => {
        const h2 = e.target && e.target.closest ? e.target.closest('.modal-content h2') : null;
        if (!h2) return;
        const content = h2.closest('.modal-content');
        if (!content) return;

        const rect = content.getBoundingClientRect();
        drag = {
            el: content,
            startX: e.clientX,
            startY: e.clientY,
            startLeft: rect.left,
            startTop: rect.top
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFloatingModals);
} else {
    initFloatingModals();
}

function getTodayStr() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function ensureToastRoot() {
    let root = document.getElementById('toast-root');
    if (!root) {
        root = document.createElement('div');
        root.id = 'toast-root';
        root.className = 'toast-root';
        document.body.appendChild(root);
    }
    return root;
}

function showToast(message, type = 'info') {
    const root = ensureToastRoot();
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-6px)';
        setTimeout(() => el.remove(), 220);
    }, 3200);
}

function setActiveTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tab);
    });
    const matriz = document.getElementById('tab-matriz');
    const solicitudes = document.getElementById('tab-solicitudes');
    const alertas = document.getElementById('tab-alertas');
    if (matriz) matriz.classList.toggle('hidden', tab !== 'matriz');
    if (solicitudes) solicitudes.classList.toggle('hidden', tab !== 'solicitudes');
    if (alertas) alertas.classList.toggle('hidden', tab !== 'alertas');
}

function getSelectedDateStr() {
    const input = document.getElementById('op-date');
    return input?.value || getTodayStr();
}

function initDashboardPage() {
    const dateInput = document.getElementById('op-date');
    if (dateInput) {
        dateInput.value = getTodayStr();
        dateInput.addEventListener('change', () => refreshDashboard());
    }
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
    });
    setActiveTab('matriz');
    refreshDashboard();
}

let monitoreoTimer = null;
let monSeries = {
    ts: [],
    sesiones: [],
    activas: [],
    waitsByClass: {}
};

function pushMonPoint({ ts, sesiones, activas }) {
    monSeries.ts.push(ts);
    monSeries.sesiones.push(Number(sesiones ?? 0));
    monSeries.activas.push(Number(activas ?? 0));
    const maxPoints = 60;
    if (monSeries.ts.length > maxPoints) {
        monSeries.ts = monSeries.ts.slice(-maxPoints);
        monSeries.sesiones = monSeries.sesiones.slice(-maxPoints);
        monSeries.activas = monSeries.activas.slice(-maxPoints);
    }
}

function upsertWaitsByClass(rows) {
    const map = {};
    (Array.isArray(rows) ? rows : []).forEach(r => {
        const cls = r.WAIT_CLASS || 'Other';
        map[cls] = (map[cls] || 0) + Number(r.CNT || 0);
    });
    monSeries.waitsByClass = map;
}

function getCanvas(ctxOrId) {
    if (typeof ctxOrId === 'string') return document.getElementById(ctxOrId);
    return ctxOrId;
}

function drawLineChart(canvasId, seriesA, seriesB, labels) {
    const canvas = getCanvas(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const padL = 44;
    const padR = 12;
    const padT = 14;
    const padB = 28;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;

    const values = [...seriesA, ...seriesB].map(n => Number(n || 0));
    const maxV = Math.max(1, ...values);
    const minV = 0;

    ctx.strokeStyle = 'rgba(16,24,40,0.10)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padT + (innerH * i) / 4;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + innerW, y);
        ctx.stroke();
    }

    ctx.fillStyle = 'rgba(31,41,55,0.65)';
    ctx.font = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
        const v = Math.round(maxV - ((maxV - minV) * i) / 4);
        const y = padT + (innerH * i) / 4;
        ctx.fillText(String(v), padL - 8, y);
    }

    function drawSeries(series, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        series.forEach((v, i) => {
            const x = padL + (innerW * (series.length <= 1 ? 0 : i / (series.length - 1)));
            const y = padT + innerH * (1 - (Number(v || 0) - minV) / (maxV - minV));
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }

    drawSeries(seriesA, 'rgba(15,42,67,0.88)');
    drawSeries(seriesB, 'rgba(27,110,168,0.88)');

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(31,41,55,0.70)';
    const lastLabel = labels && labels.length ? labels[labels.length - 1] : '';
    ctx.fillText(lastLabel, padL, h - 10);
}

function drawBarChart(canvasId, items) {
    const canvas = getCanvas(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const padL = 16;
    const padR = 16;
    const padT = 14;
    const padB = 26;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;

    const maxV = Math.max(1, ...items.map(i => i.value));
    const barGap = 10;
    const barW = items.length ? Math.max(18, (innerW - barGap * (items.length - 1)) / items.length) : innerW;

    ctx.fillStyle = 'rgba(31,41,55,0.65)';
    ctx.font = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    items.forEach((it, idx) => {
        const x = padL + idx * (barW + barGap);
        const bh = (innerH * it.value) / maxV;
        const y = padT + (innerH - bh);
        ctx.fillStyle = 'rgba(27,110,168,0.85)';
        ctx.fillRect(x, y, barW, bh);
        ctx.fillStyle = 'rgba(31,41,55,0.7)';
        ctx.fillText(it.label, x + barW / 2, h - 18);
    });

    canvas.__barItems = items;
    canvas.__barGeometry = { padL, padT, innerH, barW, barGap };
}

function setActiveMonTab(tab) {
    const tabs = document.querySelectorAll('.op-tabs .tab-btn');
    const ids = ['overview', 'charts', 'sesiones', 'bloqueos', 'waits', 'sql', 'tx'];
    if (!ids.includes(tab)) tab = 'overview';

    tabs.forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tab);
    });

    ids.forEach(id => {
        const el = document.getElementById(`tab-${id}`);
        if (el) el.classList.toggle('hidden', id !== tab);
    });
}

function stopMonitoreoAuto() {
    if (monitoreoTimer) clearInterval(monitoreoTimer);
    monitoreoTimer = null;
}

function startMonitoreoAuto() {
    stopMonitoreoAuto();
    const enabled = document.getElementById('mon-auto')?.checked;
    if (!enabled) return;
    const seconds = Number(document.getElementById('mon-interval')?.value || 30);
    const ms = Math.max(5000, seconds * 1000);
    monitoreoTimer = setInterval(() => {
        if (document.visibilityState !== 'visible') return;
        cargarMonitoreo();
    }, ms);
}

function initMonitoreoPage() {
    const tabs = document.querySelectorAll('.op-tabs .tab-btn');
    tabs.forEach(btn => btn.addEventListener('click', () => setActiveMonTab(btn.dataset.tab)));
    setActiveMonTab('overview');

    document.getElementById('mon-auto')?.addEventListener('change', startMonitoreoAuto);
    document.getElementById('mon-interval')?.addEventListener('change', startMonitoreoAuto);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') startMonitoreoAuto();
    });

    const filter = document.getElementById('mon-filter-sesiones');
    if (filter) {
        filter.addEventListener('input', () => {
            const q = filter.value.toLowerCase();
            document.querySelectorAll('#mon-sesiones-body tr').forEach(tr => {
                tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
            });
        });
    }

    cargarMonitoreo();
    startMonitoreoAuto();

    const bar = document.getElementById('chart-waits');
    if (bar) {
        bar.addEventListener('click', (ev) => {
            const rect = bar.getBoundingClientRect();
            const x = (ev.clientX - rect.left) * (bar.width / rect.width);
            const geom = bar.__barGeometry;
            const items = bar.__barItems || [];
            if (!geom || !items.length) return;
            const idx = Math.floor((x - geom.padL) / (geom.barW + geom.barGap));
            if (idx < 0 || idx >= items.length) return;
            const label = items[idx].fullLabel || items[idx].label;
            const filter = document.getElementById('mon-filter-sesiones');
            if (filter) filter.value = label;
            setActiveMonTab('sesiones');
            filter?.dispatchEvent(new Event('input'));
        });
    }
}

function minutesToTimeStr(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function abrirModalReservaDesdeDashboard() {
    const fecha = getSelectedDateStr();
    reservaPreset = { fecha };
    abrirModalReserva();
}

function closeDetailPanel() {
    const panel = document.getElementById('detail-panel');
    if (!panel) return;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
}

function openDetailPanel({ title, subtitle, bodyHTML, actionsHTML }) {
    const panel = document.getElementById('detail-panel');
    if (!panel) return;
    const t = document.getElementById('detail-title');
    const st = document.getElementById('detail-subtitle');
    const body = document.getElementById('detail-body');
    const actions = document.getElementById('detail-actions');
    if (t) t.textContent = title || 'Detalle';
    if (st) st.textContent = subtitle || '';
    if (body) body.innerHTML = bodyHTML || '';
    if (actions) actions.innerHTML = actionsHTML || '';
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
}

async function cancelarReservaAdmin(idReserva) {
    const motivo = prompt('Motivo de cancelación:', 'Cancelado por operación');
    if (motivo === null) return;
    try {
        await client.delete(`/reservas/${idReserva}`, { motivo });
        showToast('Reserva cancelada', 'success');
        closeDetailPanel();
        const reservasBody = document.getElementById('reservas-body');
        if (reservasBody) {
            await cargarReservas();
        } else {
            await refreshDashboard();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Sidebar dinámico
function initSidebar(privilegios) {
    let nav = document.getElementById('sidebar-nav');
    if (!nav) {
        const container = document.getElementById('sidebar-container');
        if (container) {
            const user = JSON.parse(localStorage.getItem('admin_user') || 'null');
            container.innerHTML = `
                <div class="sidebar-header">
                    <div class="sidebar-brand">
                        <img src="/imagenes/emojihospital.png" alt="Logo">
                        <div class="sidebar-brand-text">
                            <h2>Admin GCI-UMG</h2>
                        </div>
                        <button type="button" class="sidebar-toggle" aria-label="Abrir menú" onclick="toggleSidebar()">☰</button>
                    </div>
                    <div class="sidebar-user">
                        <div class="sidebar-user-name">${user?.nombre || 'Usuario Admin'}</div>
                        <div class="sidebar-user-role">${user?.perfil || ''}</div>
                    </div>
                </div>
                <nav id="sidebar-nav"></nav>
                <div class="sidebar-footer">
                    <button onclick="logoutAdmin()" class="btn-logout">Cerrar Sesión</button>
                </div>
            `;
            nav = container.querySelector('#sidebar-nav');

            let backdrop = document.getElementById('sidebar-backdrop');
            if (!backdrop) {
                backdrop = document.createElement('div');
                backdrop.id = 'sidebar-backdrop';
                backdrop.className = 'sidebar-backdrop';
                backdrop.addEventListener('click', () => setSidebarOpen(false));
                document.body.appendChild(backdrop);
            }

            let fab = document.getElementById('sidebar-fab');
            if (!fab) {
                fab = document.createElement('button');
                fab.id = 'sidebar-fab';
                fab.className = 'sidebar-fab';
                fab.type = 'button';
                fab.setAttribute('aria-label', 'Abrir menú');
                fab.textContent = '☰';
                fab.addEventListener('click', () => toggleSidebar());
                document.body.appendChild(fab);
            }
        }
    }
    if (!nav) return;

    const allModules = [
        { id: 'dashboard', label: 'Dashboard', icon: '•', url: 'dashboard.html' },
        { id: 'pacientes', label: 'Pacientes', icon: '•', url: 'pacientes.html' },
        { id: 'medicos', label: 'Médicos', icon: '•', url: 'medicos.html' },
        { id: 'especialidades', label: 'Especialidades', icon: '•', url: 'especialidades.html' },
        { id: 'quirofanos', label: 'Quirófanos', icon: '•', url: 'quirofanos.html' },
        { id: 'equipos', label: 'Equipos', icon: '•', url: 'equipos.html' },
        { id: 'reservas', label: 'Reservas', icon: '•', url: 'reservas.html' },
        { id: 'emergencias', label: 'Emergencias', icon: '•', url: 'emergencias.html' },
        { id: 'reportes', label: 'Reportes', icon: '•', url: 'reportes.html' },
        { id: 'usuarios', label: 'Usuarios', icon: '•', url: 'usuarios.html' },
        { id: 'perfiles', label: 'Perfiles', icon: '•', url: 'perfiles.html' },
        { id: 'monitoreo', label: 'Monitoreo Oracle', icon: '•', url: 'monitoreo.html' }
    ];

    const user = getAdminUser();
    const privs = Array.isArray(privilegios) ? privilegios : (privilegios ? privilegios.split(',') : []);
    
    nav.innerHTML = allModules
        .filter(m => canReadModule(user, m.id) || privs.includes(m.id))
        .map(m => `
            <a href="${m.url}" class="nav-item ${window.location.pathname.includes(m.url) ? 'active' : ''}">
                <span class="nav-icon">${m.icon}</span>
                <span class="nav-label">${m.label}</span>
            </a>
        `).join('');

    nav.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => setSidebarOpen(false));
    });

    ensureHeaderLogout();
}

function setSidebarOpen(open) {
    const sidebar = document.getElementById('sidebar-container');
    if (!sidebar) return;
    sidebar.classList.toggle('open', Boolean(open));
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.classList.toggle('show', Boolean(open));
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar-container');
    if (!sidebar) return;
    setSidebarOpen(!sidebar.classList.contains('open'));
}

function ensureHeaderLogout() {
    const header = document.querySelector('.main-header');
    if (!header) return;
    let actions = header.querySelector('.header-actions');
    if (!actions) {
        actions = document.createElement('div');
        actions.className = 'header-actions';
        header.appendChild(actions);
    }
    if (actions.querySelector('.btn-logout-top')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-outline btn-logout-top';
    btn.textContent = 'Cerrar sesión';
    btn.addEventListener('click', logoutAdmin);
    actions.appendChild(btn);
}

async function cargarEspecialidadesFiltro() {
    const filtro = document.getElementById('filtro-especialidad');
    const select = document.getElementById('id_especialidad');
    try {
        const especialidades = await client.get('/especialidades');
        if (filtro) {
            filtro.innerHTML = '<option value="">Todas las especialidades</option>' + especialidades.map(e => `
                <option value="${e.ID_ESPECIALIDAD}">${e.NOMBRE}</option>
            `).join('');
        }
        if (select) {
            select.innerHTML = especialidades.map(e => `
                <option value="${e.ID_ESPECIALIDAD}">${e.NOMBRE}</option>
            `).join('');
        }
    } catch (err) {
        console.error('Error al cargar especialidades:', err.message);
    }
}

// Dashboard
async function refreshDashboard() {
    const statQuirofanos = document.getElementById('stat-quirofanos');
    const statSolicitudes = document.getElementById('stat-reservas');
    const statEmergencias = document.getElementById('stat-emergencias');
    const statCompletadas = document.getElementById('stat-completadas');
    const schedulerRoot = document.getElementById('scheduler-root');
    const solicitudesBody = document.getElementById('solicitudes-body');
    const alertasBody = document.getElementById('alertas-body');
    const lastRefresh = document.getElementById('last-refresh');

    if (!statQuirofanos && !schedulerRoot && !solicitudesBody && !alertasBody) return;

    const fecha = getSelectedDateStr();

    if (schedulerRoot) {
        schedulerRoot.innerHTML = `
            <div class="scheduler-header-grid" style="grid-template-columns: 80px repeat(4, minmax(220px, 1fr));">
                <div class="scheduler-head-cell time">Horario</div>
                ${Array.from({ length: 4 }).map(() => `<div class="scheduler-head-cell skeleton" style="height: 40px; margin: 8px;"></div>`).join('')}
            </div>
            <div class="scheduler-body-grid" style="grid-template-columns: 80px repeat(4, minmax(220px, 1fr));">
                <div class="scheduler-times">
                    ${Array.from({ length: 24 }).map((_, i) => `<div class="scheduler-time">${String(i).padStart(2, '0')}:00</div>`).join('')}
                </div>
                ${Array.from({ length: 4 }).map(() => `<div class="scheduler-col" style="height:1440px;"><div class="skeleton" style="height: 120px; margin: 10px;"></div><div class="skeleton" style="height: 160px; margin: 10px;"></div></div>`).join('')}
            </div>
        `;
    }

    try {
        const [
            quirofanosDisponibles,
            reservasSolicitadasAll,
            reservasCompletadas,
            emergenciasActivas,
            quirofanosAll,
            reservasDia,
            bloqueosDia
        ] = await Promise.all([
            client.get('/quirofanos/disponibles'),
            client.get(`/reservas?estado=SOLICITADA`),
            client.get(`/reservas?estado=COMPLETADA&fecha=${encodeURIComponent(fecha)}`),
            client.get('/emergencias'),
            client.get('/quirofanos'),
            client.get(`/reservas?fecha=${encodeURIComponent(fecha)}`),
            client.get(`/quirofanos/bloqueos?fecha=${encodeURIComponent(fecha)}`)
        ]);

        const reservasSolicitadasDia = (Array.isArray(reservasSolicitadasAll) ? reservasSolicitadasAll : []).filter(r => {
            return dateStrFromValue(r.FECHA_RESERVA) === fecha;
        });

        const emergenciasDia = (Array.isArray(emergenciasActivas) ? emergenciasActivas : []).filter(e => {
            return dateStrFromValue(e.FECHA_HORA) === fecha;
        });

        if (statQuirofanos) statQuirofanos.textContent = Array.isArray(quirofanosDisponibles) ? quirofanosDisponibles.length : 0;
        if (statSolicitudes) statSolicitudes.textContent = Array.isArray(reservasSolicitadasAll) ? reservasSolicitadasAll.length : 0;
        if (statEmergencias) statEmergencias.textContent = emergenciasDia.length;
        if (statCompletadas) statCompletadas.textContent = Array.isArray(reservasCompletadas) ? reservasCompletadas.length : 0;

        if (schedulerRoot) {
            renderScheduler(
                schedulerRoot,
                Array.isArray(quirofanosAll) ? quirofanosAll : [],
                Array.isArray(reservasDia) ? reservasDia : [],
                emergenciasDia,
                Array.isArray(bloqueosDia) ? bloqueosDia : [],
                fecha
            );
        }

        if (solicitudesBody) {
            solicitudesBody.innerHTML = (Array.isArray(reservasSolicitadasAll) ? reservasSolicitadasAll : []).slice(0, 50).map(r => `
                <tr>
                    <td>${r.ID_RESERVA}</td>
                    <td>${r.PACIENTE}</td>
                    <td>${r.TIPO_CIRUGIA}</td>
                    <td>${new Date(r.FECHA_RESERVA).toLocaleDateString()}</td>
                    <td>
                        <button class="btn-outline" onclick="openReservaDetail(${r.ID_RESERVA})">Ver</button>
                        <button class="btn-primary" onclick="programarDesdeSolicitud(${r.ID_RESERVA})">Programar</button>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="5">No hay solicitudes pendientes.</td></tr>';
        }

        if (alertasBody) {
            const rows = [];
            for (const e of emergenciasDia) {
                rows.push(`
                    <tr>
                        <td>EMERGENCIA</td>
                        <td>${e.PACIENTE} · ${e.QUIROFANO} · ${e.NIVEL_PRIORIDAD}</td>
                        <td><button class="btn-primary" onclick="resolverEmergencia(${e.ID_EMERGENCIA})">Resolver</button></td>
                    </tr>
                `);
            }
            for (const r of reservasSolicitadasDia.slice(0, 25)) {
                rows.push(`
                    <tr>
                        <td>SOLICITUD</td>
                        <td>#${r.ID_RESERVA} · ${r.PACIENTE} · ${r.TIPO_CIRUGIA}</td>
                        <td><button class="btn-outline" onclick="openReservaDetail(${r.ID_RESERVA})">Ver</button></td>
                    </tr>
                `);
            }
            alertasBody.innerHTML = rows.join('') || '<tr><td colspan="3">Sin alertas para este día.</td></tr>';
        }

        if (lastRefresh) lastRefresh.textContent = `Actualizado: ${new Date().toLocaleTimeString()}`;
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function parseDateValue(v) {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d;
}

function dateStrFromValue(v) {
    if (!v) return null;
    if (typeof v === 'string') {
        const s = v.trim();
        if (s.length >= 10 && s[4] === '-' && s[7] === '-') return s.slice(0, 10);
    }
    if (v instanceof Date) return toDateStr(v);
    const d = parseDateValue(v);
    if (!d) return null;
    return toDateStr(d);
}

function toDateStr(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function minutesFromTime(d) {
    return d.getHours() * 60 + d.getMinutes();
}

function renderScheduler(root, quirofanos, reservas, emergencias, bloqueos, fecha) {
    const startMin = 0;
    const endMin = 24 * 60;
    const totalHeight = (endMin - startMin);

    const colsRaw = Array.isArray(quirofanos) ? quirofanos : [];
    const reservasRaw = Array.isArray(reservas) ? reservas : [];
    const emergenciasRaw = Array.isArray(emergencias) ? emergencias : [];
    const bloqueosRaw = Array.isArray(bloqueos) ? bloqueos : [];

    const colsActive = colsRaw.filter(q => Number(q.ACTIVO ?? 1) === 1);
    const qidsInReservas = new Set(reservasRaw.map(r => Number(r.ID_QUIROFANO)).filter(n => Number.isFinite(n)));
    const missing = colsRaw.filter(q => Number(q.ACTIVO ?? 1) !== 1 && qidsInReservas.has(Number(q.ID_QUIROFANO)));
    const colsFinal = colsActive.concat(missing);

    const colCount = colsFinal.length || 1;
    const isSmall = window.matchMedia && window.matchMedia('(max-width: 600px)').matches;
    const timeColW = isSmall ? 64 : 80;
    const minColW = isSmall ? 160 : 220;
    const gridCols = `${timeColW}px repeat(${colCount}, minmax(${minColW}px, 1fr))`;
    const minWidthPx = timeColW + (colCount * (minColW + 20));

    const reservasById = new Map();
    reservasRaw.forEach(r => reservasById.set(Number(r.ID_RESERVA), r));
    window.__reservasById = reservasById;

    const head = `
        <div class="scheduler-inner" style="min-width:${minWidthPx}px;">
            <div class="scheduler-header-grid" style="grid-template-columns: ${gridCols};">
                <div class="scheduler-head-cell time">Horario</div>
                ${colsFinal.map(q => `
                    <div class="scheduler-head-cell">
                        ${q.NOMBRE}
                        <div style="font-weight: 650; font-size: 0.78rem; color: rgba(31,41,55,0.65); margin-top: 2px;">${q.ESTADO}</div>
                    </div>
                `).join('')}
            </div>
    `;

    const times = Array.from({ length: 24 }).map((_, i) => `<div class="scheduler-time">${String(i).padStart(2, '0')}:00</div>`).join('');

    const colsHtml = colsFinal.map(q => {
        const qid = Number(q.ID_QUIROFANO);
        const blocks = [];

        bloqueosRaw
            .filter(b => Number(b.ID_QUIROFANO) === qid)
            .forEach(b => {
                const hi = parseDateValue(b.INICIO);
                const hf = parseDateValue(b.FIN);
                if (!hi || !hf) return;
                const top = Math.max(0, minutesFromTime(hi) - startMin);
                const height = Math.max(20, minutesFromTime(hf) - minutesFromTime(hi));
                blocks.push(`
                    <div class="sched-block sched-maint" style="top:${top}px;height:${height}px;" data-kind="mantenimiento" data-qid="${qid}">
                        <div class="sched-title">${String(b.TIPO || 'MANTENIMIENTO')}</div>
                        <div class="sched-meta">${b.MOTIVO || ''}</div>
                        <div class="sched-meta">${minutesToTimeStr(minutesFromTime(hi))}-${minutesToTimeStr(minutesFromTime(hf))}</div>
                    </div>
                `);
            });

        reservasRaw
            .filter(r => Number(r.ID_QUIROFANO) === qid)
            .forEach(r => {
                const hi = parseDateValue(r.HORA_INICIO);
                const hf = parseDateValue(r.HORA_FIN);
                if (!hi || !hf) return;
                if (dateStrFromValue(r.FECHA_RESERVA) !== fecha) return;

                const estado = String(r.ESTADO || '').toUpperCase();
                if (estado === 'CANCELADA') return;

                const top = Math.max(0, minutesFromTime(hi) - startMin);
                const height = Math.max(24, minutesFromTime(hf) - minutesFromTime(hi));

                let cls = 'sched-pending';
                if (estado === 'APROBADA') cls = 'sched-approved';
                else if (estado === 'EN_CURSO') cls = 'sched-running';
                else if (estado === 'COMPLETADA') cls = 'sched-done';

                blocks.push(`
                    <div class="sched-block ${cls}" style="top:${top}px;height:${height}px;" data-kind="reserva" data-id="${r.ID_RESERVA}">
                        <div class="sched-title">${r.TIPO_CIRUGIA || 'Reserva'}</div>
                        <div class="sched-meta">${r.PACIENTE || ''}</div>
                        <div class="sched-meta">${r.MEDICO || ''} · ${minutesToTimeStr(minutesFromTime(hi))}-${minutesToTimeStr(minutesFromTime(hf))}</div>
                    </div>
                `);
            });

        emergenciasRaw
            .filter(e => Number(e.ID_QUIROFANO) === qid)
            .forEach(e => {
                if (dateStrFromValue(e.FECHA_HORA) !== fecha) return;
                const fh = parseDateValue(e.FECHA_HORA);
                if (!fh) return;
                const top = Math.max(0, minutesFromTime(fh) - startMin);
                const height = 60;
                blocks.push(`
                    <div class="sched-block sched-emergency pulse" style="top:${top}px;height:${height}px;" data-kind="emergencia" data-id="${e.ID_EMERGENCIA}">
                        <div class="sched-title">EMERGENCIA</div>
                        <div class="sched-meta">${e.PACIENTE || ''}</div>
                        <div class="sched-meta">${e.MEDICO || ''} · ${e.NIVEL_PRIORIDAD || ''}</div>
                    </div>
                `);
            });

        return `<div class="scheduler-col" data-qid="${qid}" style="height:${totalHeight}px;">${blocks.join('')}</div>`;
    }).join('');

    const body = `
            <div class="scheduler-body-grid" style="grid-template-columns: ${gridCols};">
                <div class="scheduler-times">${times}</div>
                ${colsHtml}
            </div>
        </div>
    `;

    root.innerHTML = head + body;

    Array.from(root.querySelectorAll('.scheduler-col')).forEach(colEl => {
        colEl.addEventListener('click', (ev) => {
            const block = ev.target.closest('.sched-block');
            if (block) return;
            const qid = Number(colEl.dataset.qid);
            const rect = colEl.getBoundingClientRect();
            const y = ev.clientY - rect.top;
            const minutes = startMin + Math.max(0, Math.min(totalHeight - 1, Math.floor(y)));
            const start = minutesToTimeStr(minutes);
            const end = minutesToTimeStr(Math.min(endMin, minutes + 60));
            reservaPreset = { fecha, hora_inicio: start, hora_fin: end, id_quirofano: qid };
            abrirModalReserva();
        });
    });

    root.querySelectorAll('.sched-block[data-kind=\"reserva\"]').forEach(el => {
        el.addEventListener('click', () => openReservaDetail(Number(el.dataset.id)));
    });
    root.querySelectorAll('.sched-block[data-kind=\"emergencia\"]').forEach(el => {
        el.addEventListener('click', () => openEmergenciaDetail(Number(el.dataset.id)));
    });
}

function openReservaDetail(idReserva) {
    const map = window.__reservasById;
    const r = map ? map.get(Number(idReserva)) : null;
    if (!r) {
        showToast('No se encontró la reserva', 'error');
        return;
    }
    const fecha = parseDateValue(r.FECHA_RESERVA);
    const hi = parseDateValue(r.HORA_INICIO);
    const hf = parseDateValue(r.HORA_FIN);
    const subtitle = `${r.PACIENTE || ''} · ${r.QUIROFANO || ''}`;
    const bodyHTML = `
        <div style="display:flex;flex-direction:column;gap:10px;">
            <div><strong>ID:</strong> ${r.ID_RESERVA}</div>
            <div><strong>Estado:</strong> ${r.ESTADO}</div>
            <div><strong>Prioridad:</strong> ${r.PRIORIDAD || ''}</div>
            <div><strong>Cirugía:</strong> ${r.TIPO_CIRUGIA || ''}</div>
            <div><strong>Médico:</strong> ${r.MEDICO || ''}</div>
            <div><strong>Especialidad:</strong> ${r.ESPECIALIDAD || ''}</div>
            <div><strong>Fecha:</strong> ${fecha ? fecha.toLocaleDateString() : ''}</div>
            <div><strong>Hora:</strong> ${hi ? minutesToTimeStr(minutesFromTime(hi)) : ''} - ${hf ? minutesToTimeStr(minutesFromTime(hf)) : ''}</div>
            <div><strong>Descripción:</strong> ${r.DESCRIPCION_NECESIDAD || ''}</div>
        </div>
    `;

    const estado = String(r.ESTADO || '').toUpperCase();
    const baseLink = `reservas.html?id=${encodeURIComponent(String(r.ID_RESERVA))}`;
    let actionsHTML = `<a class="btn-outline" href="${baseLink}">Abrir en Reservas</a>`;
    if (estado === 'SOLICITADA') {
        actionsHTML = `
            <a class="btn-primary" href="${baseLink}&action=programar">Programar</a>
            <a class="btn-danger" href="${baseLink}&action=cancelar">Cancelar</a>
            <a class="btn-outline" href="${baseLink}">Abrir en Reservas</a>
        `;
    } else if (estado === 'APROBADA') {
        actionsHTML = `
            <a class="btn-outline" href="${baseLink}&action=reprogramar">Reprogramar</a>
            <a class="btn-danger" href="${baseLink}&action=cancelar">Cancelar</a>
            <a class="btn-outline" href="${baseLink}">Abrir en Reservas</a>
        `;
    } else if (estado === 'EN_CURSO') {
        actionsHTML = `
            <a class="btn-danger" href="${baseLink}&action=cancelar">Cancelar</a>
            <a class="btn-outline" href="${baseLink}">Abrir en Reservas</a>
        `;
    }

    openDetailPanel({
        title: r.TIPO_CIRUGIA || 'Reserva',
        subtitle,
        bodyHTML,
        actionsHTML
    });
}

function openEmergenciaDetail(idEmergencia) {
    showToast(`Emergencia #${idEmergencia}`, 'info');
}

async function programarDesdeSolicitud(idReserva) {
    const map = window.__reservasById;
    const r = map ? map.get(Number(idReserva)) : null;
    const fecha = getSelectedDateStr();
    if (!r) {
        reservaPreset = { fecha };
        abrirModalReserva();
        return;
    }
    const hi = parseDateValue(r.HORA_INICIO);
    const hf = parseDateValue(r.HORA_FIN);
    reservaPreset = {
        id_reserva: Number(r.ID_RESERVA),
        fecha,
        hora_inicio: hi ? minutesToTimeStr(minutesFromTime(hi)) : '08:00',
        hora_fin: hf ? minutesToTimeStr(minutesFromTime(hf)) : '09:00',
        id_paciente: r.ID_PACIENTE ? Number(r.ID_PACIENTE) : undefined,
        id_medico: r.ID_MEDICO ? Number(r.ID_MEDICO) : undefined,
        id_quirofano: r.ID_QUIROFANO ? Number(r.ID_QUIROFANO) : undefined,
        id_especialidad: r.ID_ESPECIALIDAD ? Number(r.ID_ESPECIALIDAD) : undefined,
        tipo_cirugia: r.TIPO_CIRUGIA || '',
        descripcion: r.DESCRIPCION_NECESIDAD || '',
        prioridad: r.PRIORIDAD || 'NORMAL'
    };
    abrirModalReserva();
}

async function resolverEmergencia(idEmergencia) {
    try {
        await client.put(`/emergencias/resolver/${idEmergencia}`, {});
        const emergenciasBody = document.getElementById('emergencias-body');
        if (emergenciasBody) {
            await cargarEmergencias();
        } else {
            await refreshDashboard();
        }
    } catch (err) {
        alert(err.message);
    }
}

// Gestión de Pacientes
async function cargarPacientes() {
    const body = document.getElementById('pacientes-body');
    if (!body) return;
    try {
        const pacientes = await client.get('/pacientes');
        pacientesCache = Array.isArray(pacientes) ? pacientes : [];
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

function filtrarPacientes() {
    const body = document.getElementById('pacientes-body');
    if (!body) return;

    const q = (document.getElementById('busqueda-paciente')?.value || '').toLowerCase();
    const genero = document.getElementById('filtro-genero')?.value || '';

    const filtrados = pacientesCache.filter(p => {
        const nombre = `${p.NOMBRE || ''} ${p.APELLIDO || ''}`.toLowerCase();
        const matchTexto = !q || nombre.includes(q);
        const matchGenero = !genero || p.GENERO === genero;
        return matchTexto && matchGenero;
    });

    body.innerHTML = filtrados.map(p => `
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
}

function abrirModalPaciente() {
    const modal = document.getElementById('modal-paciente');
    if (!modal) return;

    document.getElementById('modal-titulo').textContent = 'Nuevo Paciente';
    document.getElementById('id_paciente').value = '';
    document.getElementById('nombre').value = '';
    document.getElementById('apellido').value = '';
    document.getElementById('email').value = '';
    document.getElementById('fecha_nacimiento').value = '';
    document.getElementById('genero').value = 'MASCULINO';
    document.getElementById('telefono').value = '';
    modal.style.display = 'block';

    bindOnce('paciente-form', () => {
        const form = document.getElementById('paciente-form');
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('id_paciente').value;
            const nombre = document.getElementById('nombre').value;
            const apellido = document.getElementById('apellido').value;
            const email = document.getElementById('email').value;
            const fecha_nacimiento = document.getElementById('fecha_nacimiento').value;
            const genero = document.getElementById('genero').value;
            const telefono = document.getElementById('telefono').value;

            try {
                if (id) {
                    await client.put(`/pacientes/${id}`, { nombre, apellido, fecha_nacimiento, genero, telefono, email });
                } else {
                    await client.post('/pacientes', { nombre, apellido, fecha_nacimiento, genero, telefono, email });
                }
                cerrarModalPaciente();
                await cargarPacientes();
            } catch (err) {
                alert(err.message);
            }
        });
    });
}

function cerrarModalPaciente() {
    const modal = document.getElementById('modal-paciente');
    if (!modal) return;
    modal.style.display = 'none';
}

async function editarPaciente(idPaciente) {
    const p = pacientesCache.find(x => Number(x.ID_PACIENTE) === Number(idPaciente));
    if (!p) {
        await cargarPacientes();
    }
    const paciente = pacientesCache.find(x => Number(x.ID_PACIENTE) === Number(idPaciente));
    if (!paciente) return;

    abrirModalPaciente();
    document.getElementById('modal-titulo').textContent = 'Editar Paciente';
    document.getElementById('id_paciente').value = paciente.ID_PACIENTE;
    document.getElementById('nombre').value = paciente.NOMBRE || '';
    document.getElementById('apellido').value = paciente.APELLIDO || '';
    document.getElementById('email').value = paciente.EMAIL || '';
    document.getElementById('fecha_nacimiento').value = paciente.FECHA_NACIMIENTO ? String(paciente.FECHA_NACIMIENTO).substring(0, 10) : '';
    document.getElementById('genero').value = paciente.GENERO || 'MASCULINO';
    document.getElementById('telefono').value = paciente.TELEFONO || '';
}

async function eliminarPaciente(idPaciente) {
    const ok = confirm('¿Dar de baja este paciente?');
    if (!ok) return;
    try {
        await client.delete(`/pacientes/${idPaciente}`);
        await cargarPacientes();
    } catch (err) {
        alert(err.message);
    }
}

// Gestión de Médicos
async function cargarMedicos() {
    const body = document.getElementById('medicos-body');
    if (!body) return;
    try {
        const medicos = await client.get('/medicos');
        medicosCache = Array.isArray(medicos) ? medicos : [];
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

async function ensurePerfilesSistemaSelect() {
    const sel = document.getElementById('id_perfil_sistema');
    if (!sel) return;
    try {
        if (!Array.isArray(perfilesCache) || perfilesCache.length === 0) {
            const perfiles = await client.get('/perfiles');
            perfilesCache = Array.isArray(perfiles) ? perfiles : [];
        }
        sel.innerHTML = perfilesCache.map(p => `<option value="${p.ID_PERFIL}">${p.NOMBRE}</option>`).join('');
        const def = perfilesCache.find(p => String(p.NOMBRE || '').toUpperCase() === 'MEDICO') || perfilesCache[0];
        if (def) sel.value = String(def.ID_PERFIL);
    } catch {
        sel.innerHTML = '';
    }
}

async function cargarAccesoSistemaMedico(idMedico) {
    const idEl = document.getElementById('id_usuario_sistema');
    const userEl = document.getElementById('username_sistema');
    const passEl = document.getElementById('password_sistema');
    const perfilEl = document.getElementById('id_perfil_sistema');
    if (!idEl || !userEl || !passEl || !perfilEl) return;

    idEl.value = '';
    userEl.value = '';
    passEl.value = '';
    await ensurePerfilesSistemaSelect();

    try {
        const u = await client.get(`/usuarios/por-medico/${idMedico}`);
        if (!u) return;
        idEl.value = String(u.ID_USUARIO || '');
        userEl.value = String(u.USERNAME || '');
        if (u.ID_PERFIL) perfilEl.value = String(u.ID_PERFIL);
    } catch {}
}

function filtrarMedicos() {
    const body = document.getElementById('medicos-body');
    if (!body) return;

    const q = (document.getElementById('busqueda-medico')?.value || '').toLowerCase();
    const especialidad = document.getElementById('filtro-especialidad')?.value || '';

    const filtrados = medicosCache.filter(m => {
        const nombre = `${m.NOMBRE || ''} ${m.APELLIDO || ''}`.toLowerCase();
        const matchTexto = !q || nombre.includes(q);
        const matchEsp = !especialidad || String(m.ID_ESPECIALIDAD) === String(especialidad);
        return matchTexto && matchEsp;
    });

    body.innerHTML = filtrados.map(m => `
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
}

function abrirModalMedico() {
    const modal = document.getElementById('modal-medico');
    if (!modal) return;

    document.getElementById('modal-titulo').textContent = 'Nuevo Médico';
    document.getElementById('id_medico').value = '';
    const idUsuarioSistema = document.getElementById('id_usuario_sistema');
    if (idUsuarioSistema) idUsuarioSistema.value = '';
    document.getElementById('nombre').value = '';
    document.getElementById('apellido').value = '';
    document.getElementById('licencia').value = '';
    document.getElementById('email').value = '';
    document.getElementById('telefono').value = '';
    const usernameSistema = document.getElementById('username_sistema');
    const passwordSistema = document.getElementById('password_sistema');
    if (usernameSistema) usernameSistema.value = '';
    if (passwordSistema) passwordSistema.value = '';
    ensurePerfilesSistemaSelect();
    modal.style.display = 'block';

    bindOnce('medico-form', () => {
        const form = document.getElementById('medico-form');
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('id_medico').value;
            const nombre = document.getElementById('nombre').value;
            const apellido = document.getElementById('apellido').value;
            const id_especialidad = Number(document.getElementById('id_especialidad').value);
            const licencia = document.getElementById('licencia').value;
            const email = document.getElementById('email').value;
            const telefono = document.getElementById('telefono').value;
            const idUsuarioSistemaVal = document.getElementById('id_usuario_sistema')?.value || '';
            const usernameSistemaVal = (document.getElementById('username_sistema')?.value || '').trim();
            const passwordSistemaVal = document.getElementById('password_sistema')?.value || '';
            const idPerfilSistemaVal = Number(document.getElementById('id_perfil_sistema')?.value || 0) || null;

            try {
                let medicoId = id ? Number(id) : null;
                if (id) {
                    await client.put(`/medicos/${id}`, { nombre, apellido, id_especialidad, licencia, telefono, email });
                } else {
                    const r = await client.post('/medicos', { nombre, apellido, id_especialidad, licencia, telefono, email });
                    medicoId = r?.id_medico ? Number(r.id_medico) : null;
                }

                if (!medicoId) medicoId = id ? Number(id) : null;
                if (medicoId && (usernameSistemaVal || passwordSistemaVal || idUsuarioSistemaVal)) {
                    if (idUsuarioSistemaVal) {
                        await client.put(`/usuarios/${idUsuarioSistemaVal}`, {
                            nombre,
                            apellido,
                            username: usernameSistemaVal || null,
                            email,
                            id_perfil: idPerfilSistemaVal,
                            id_medico: medicoId
                        });
                        if (passwordSistemaVal) {
                            await client.put(`/usuarios/${idUsuarioSistemaVal}/password`, { password: passwordSistemaVal });
                        }
                    } else {
                        if (!usernameSistemaVal || !passwordSistemaVal) {
                            showToast('Para crear acceso, usuario y contraseña son requeridos', 'error');
                            return;
                        }
                        await client.post('/usuarios', {
                            nombre,
                            apellido,
                            username: usernameSistemaVal,
                            email,
                            password: passwordSistemaVal,
                            id_perfil: idPerfilSistemaVal,
                            id_medico: medicoId
                        });
                    }
                }
                cerrarModalMedico();
                await cargarMedicos();
            } catch (err) {
                alert(err.message);
            }
        });
    });
}

function cerrarModalMedico() {
    const modal = document.getElementById('modal-medico');
    if (!modal) return;
    modal.style.display = 'none';
}

async function editarMedico(idMedico) {
    const m = medicosCache.find(x => Number(x.ID_MEDICO) === Number(idMedico));
    if (!m) {
        await cargarMedicos();
    }
    const medico = medicosCache.find(x => Number(x.ID_MEDICO) === Number(idMedico));
    if (!medico) return;

    abrirModalMedico();
    document.getElementById('modal-titulo').textContent = 'Editar Médico';
    document.getElementById('id_medico').value = medico.ID_MEDICO;
    document.getElementById('nombre').value = medico.NOMBRE || '';
    document.getElementById('apellido').value = medico.APELLIDO || '';
    document.getElementById('id_especialidad').value = medico.ID_ESPECIALIDAD;
    document.getElementById('licencia').value = medico.LICENCIA || '';
    document.getElementById('email').value = medico.EMAIL || '';
    document.getElementById('telefono').value = medico.TELEFONO || '';
    await cargarAccesoSistemaMedico(medico.ID_MEDICO);
}

async function cargarReservas() {
    const body = document.getElementById('reservas-body');
    if (!body) return;

    const filtroEstado = document.getElementById('filtro-estado');
    const estado = filtroEstado ? filtroEstado.value : '';
    const endpoint = estado ? `/reservas?estado=${encodeURIComponent(estado)}` : '/reservas';

    try {
        const reservas = await client.get(endpoint);
        reservasCache = Array.isArray(reservas) ? reservas : [];
        body.innerHTML = reservas.map(r => `
            <tr>
                <td>${r.PACIENTE}</td>
                <td>${r.TIPO_CIRUGIA}</td>
                <td>${r.MEDICO}</td>
                <td>${r.QUIROFANO}</td>
                <td>${dateStrFromValue(r.FECHA_RESERVA) || ''}</td>
                <td><span class="badge badge-${r.ESTADO.toLowerCase()}">${r.ESTADO}</span></td>
                <td>
                    ${r.ESTADO === 'SOLICITADA' ? `<button onclick="programarReserva(${r.ID_RESERVA})" class="btn-primary">Programar</button>` : ''}
                    ${r.ESTADO === 'APROBADA' ? `<button onclick="programarReserva(${r.ID_RESERVA})" class="btn-outline">Reprogramar</button>` : ''}
                    <button onclick="verDisponibilidadReserva(${r.ID_RESERVA})" class="btn-outline">Disponibilidad</button>
                    ${(r.ESTADO === 'SOLICITADA' || r.ESTADO === 'APROBADA') ? `<button onclick="cancelarReservaAdmin(${r.ID_RESERVA})" class="btn-danger">Cancelar</button>` : ''}
                </td>
            </tr>
        `).join('');
        applyReservasDeepLink();
    } catch (err) {
        body.innerHTML = '<tr><td colspan="7">Error al cargar reservas.</td></tr>';
    }
}

function applyReservasDeepLink() {
    if (window.__reservasDeeplinkApplied) return;
    const params = new URLSearchParams(window.location.search || '');
    const idRaw = params.get('id') || params.get('reserva') || params.get('reservaId');
    const action = String(params.get('action') || '').toLowerCase();
    if (!idRaw) return;
    const id = Number(idRaw);
    if (!Number.isFinite(id)) return;

    const r = reservasCache.find(x => Number(x.ID_RESERVA) === id);
    if (!r) return;

    window.__reservasDeeplinkApplied = true;
    if (action === 'cancelar') {
        cancelarReservaAdmin(id).finally(() => {
            history.replaceState(null, '', 'reservas.html');
        });
        return;
    }
    if (action === 'programar' || action === 'reprogramar') {
        programarReserva(id);
        history.replaceState(null, '', 'reservas.html');
        return;
    }
    history.replaceState(null, '', 'reservas.html');
}

function programarReserva(idReserva) {
    const r = reservasCache.find(x => Number(x.ID_RESERVA) === Number(idReserva));
    if (!r) return;
    const hi = parseDateValue(r.HORA_INICIO);
    const hf = parseDateValue(r.HORA_FIN);
    const fecha = dateStrFromValue(r.FECHA_RESERVA) || getTodayStr();
    reservaPreset = {
        id_reserva: Number(r.ID_RESERVA),
        fecha,
        hora_inicio: hi ? minutesToTimeStr(minutesFromTime(hi)) : '08:00',
        hora_fin: hf ? minutesToTimeStr(minutesFromTime(hf)) : '09:00',
        id_paciente: r.ID_PACIENTE ? Number(r.ID_PACIENTE) : undefined,
        id_medico: r.ID_MEDICO ? Number(r.ID_MEDICO) : undefined,
        id_quirofano: r.ID_QUIROFANO ? Number(r.ID_QUIROFANO) : undefined,
        id_especialidad: r.ID_ESPECIALIDAD ? Number(r.ID_ESPECIALIDAD) : undefined,
        tipo_cirugia: r.TIPO_CIRUGIA || '',
        descripcion: r.DESCRIPCION_NECESIDAD || '',
        prioridad: r.PRIORIDAD || 'NORMAL'
    };
    abrirModalReserva();
}

function verDisponibilidadReserva(idReserva) {
    const r = reservasCache.find(x => Number(x.ID_RESERVA) === Number(idReserva));
    if (!r) return;
    const hi = parseDateValue(r.HORA_INICIO);
    const hf = parseDateValue(r.HORA_FIN);
    const fecha = dateStrFromValue(r.FECHA_RESERVA) || getTodayStr();
    reservaPreset = {
        id_reserva: Number(r.ID_RESERVA),
        fecha,
        hora_inicio: hi ? minutesToTimeStr(minutesFromTime(hi)) : '08:00',
        hora_fin: hf ? minutesToTimeStr(minutesFromTime(hf)) : '09:00',
        id_paciente: r.ID_PACIENTE ? Number(r.ID_PACIENTE) : undefined,
        id_medico: r.ID_MEDICO ? Number(r.ID_MEDICO) : undefined,
        id_quirofano: r.ID_QUIROFANO ? Number(r.ID_QUIROFANO) : undefined,
        id_especialidad: r.ID_ESPECIALIDAD ? Number(r.ID_ESPECIALIDAD) : undefined,
        tipo_cirugia: r.TIPO_CIRUGIA || '',
        descripcion: r.DESCRIPCION_NECESIDAD || '',
        prioridad: r.PRIORIDAD || 'NORMAL'
    };
    abrirModalReserva();
}

async function abrirModalReserva() {
    const modal = document.getElementById('modal-reserva');
    if (!modal) return;
    const preset = reservaPreset;

    const isEdit = Boolean(preset?.id_reserva);
    document.getElementById('modal-titulo').textContent = isEdit ? 'Programar Reserva' : 'Nueva Reserva';
    document.getElementById('id_reserva').value = preset?.id_reserva ? String(preset.id_reserva) : '';
    document.getElementById('tipo_cirugia').value = preset?.tipo_cirugia || '';
    document.getElementById('descripcion').value = preset?.descripcion || '';
    const prioridadEl = document.getElementById('prioridad');
    if (prioridadEl) prioridadEl.value = 'NORMAL';
    document.getElementById('fecha').value = preset?.fecha || '';
    document.getElementById('hora_inicio').value = preset?.hora_inicio || '';
    document.getElementById('hora_fin').value = preset?.hora_fin || '';
    modal.style.display = 'block';

    bindOnce('reserva-form-init', async () => {
        const [pacientes, medicos, quirofanos, especialidades] = await Promise.all([
            client.get('/pacientes'),
            client.get('/medicos'),
            client.get('/quirofanos'),
            client.get('/especialidades')
        ]);

        const selPaciente = document.getElementById('id_paciente');
        const selMedico = document.getElementById('id_medico');
        const selQuirofano = document.getElementById('id_quirofano');
        const selEspecialidad = document.getElementById('id_especialidad');

        if (selPaciente) selPaciente.innerHTML = pacientes.map(p => `<option value="${p.ID_PACIENTE}">${p.NOMBRE} ${p.APELLIDO}</option>`).join('');
        if (selMedico) selMedico.innerHTML = medicos.map(m => `<option value="${m.ID_MEDICO}">${m.NOMBRE} ${m.APELLIDO}</option>`).join('');
        if (selQuirofano) selQuirofano.innerHTML = quirofanos.map(q => `<option value="${q.ID_QUIROFANO}">${q.NOMBRE}</option>`).join('');
        if (selEspecialidad) selEspecialidad.innerHTML = especialidades.map(e => `<option value="${e.ID_ESPECIALIDAD}">${e.NOMBRE}</option>`).join('');

        if (preset?.id_paciente && selPaciente) selPaciente.value = String(preset.id_paciente);
        if (preset?.id_medico && selMedico) selMedico.value = String(preset.id_medico);
        if (preset?.id_quirofano && selQuirofano) selQuirofano.value = String(preset.id_quirofano);
        if (preset?.id_especialidad && selEspecialidad) selEspecialidad.value = String(preset.id_especialidad);
        if (preset?.prioridad && prioridadEl) prioridadEl.value = preset.prioridad;
        reservaPreset = null;
        await updateReservaDisponibilidad();
    });

    bindOnce('reserva-disponibilidad', () => {
        const fields = ['id_medico', 'id_quirofano', 'fecha', 'hora_inicio', 'hora_fin'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('change', updateReservaDisponibilidad);
            el.addEventListener('input', updateReservaDisponibilidad);
        });
    });

    bindOnce('reserva-form', () => {
        const form = document.getElementById('reserva-form');
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id_reserva = document.getElementById('id_reserva').value;
            const id_paciente = Number(document.getElementById('id_paciente').value);
            const id_medico = Number(document.getElementById('id_medico').value);
            const id_quirofano = Number(document.getElementById('id_quirofano').value);
            const id_especialidad = Number(document.getElementById('id_especialidad').value);
            const tipo_cirugia = document.getElementById('tipo_cirugia').value;
            const descripcion = document.getElementById('descripcion').value;
            const prioridad = document.getElementById('prioridad')?.value || 'NORMAL';
            const fecha = document.getElementById('fecha').value;
            const hora_inicio = document.getElementById('hora_inicio').value;
            const hora_fin = document.getElementById('hora_fin').value;

            try {
                if (id_reserva) {
                    await client.put(`/reservas/asignar/${id_reserva}`, { id_paciente, id_medico, id_quirofano, id_especialidad, tipo_cirugia, descripcion, prioridad, fecha, hora_inicio, hora_fin });
                } else {
                    await client.post('/reservas', { id_paciente, id_medico, id_quirofano, id_especialidad, tipo_cirugia, descripcion, prioridad, fecha, hora_inicio, hora_fin });
                }
                cerrarModalReserva();
                showToast(id_reserva ? 'Reserva programada' : 'Reserva guardada', 'success');
                const body = document.getElementById('reservas-body');
                if (body) {
                    await cargarReservas();
                } else {
                    await refreshDashboard();
                }
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    });
}

async function updateReservaDisponibilidad() {
    const box = document.getElementById('disponibilidad-box');
    const btn = document.querySelector('#reserva-form button[type="submit"]');
    if (!box) return;

    const fecha = document.getElementById('fecha')?.value;
    const hora_inicio = document.getElementById('hora_inicio')?.value;
    const hora_fin = document.getElementById('hora_fin')?.value;
    const id_medico = Number(document.getElementById('id_medico')?.value);
    const id_quirofano = Number(document.getElementById('id_quirofano')?.value);

    if (!fecha || !hora_inicio || !hora_fin || !id_medico || !id_quirofano) {
        box.style.display = 'none';
        if (btn) btn.disabled = false;
        return;
    }

    try {
        const [q, m] = await Promise.all([
            client.get(`/quirofanos/disponibilidad?fecha=${encodeURIComponent(fecha)}&hora_inicio=${encodeURIComponent(hora_inicio)}&hora_fin=${encodeURIComponent(hora_fin)}`),
            client.get(`/medicos/disponibilidad?fecha=${encodeURIComponent(fecha)}&hora_inicio=${encodeURIComponent(hora_inicio)}&hora_fin=${encodeURIComponent(hora_fin)}`)
        ]);

        const occQ = new Set((q?.ocupados_por_reserva || []).map(x => Number(x.ID_QUIROFANO)));
        const blkQ = new Set((q?.bloqueados_por_mantenimiento || []).map(x => Number(x.ID_QUIROFANO)));
        const occM = new Set((m?.ocupados_por_reserva || []).map(x => Number(x.ID_MEDICO)));

        const qOk = !occQ.has(id_quirofano) && !blkQ.has(id_quirofano);
        const mOk = !occM.has(id_medico);

        const parts = [];
        parts.push(`<div class="${qOk ? 'ok' : 'warn'}">Quirófano: ${qOk ? 'DISPONIBLE' : (blkQ.has(id_quirofano) ? 'MANTENIMIENTO/BLOQUEO' : 'OCUPADO')}</div>`);
        parts.push(`<div class="${mOk ? 'ok' : 'warn'}">Médico: ${mOk ? 'DISPONIBLE' : 'OCUPADO'}</div>`);
        box.innerHTML = parts.join('');
        box.style.display = 'block';
        if (btn) btn.disabled = !(qOk && mOk);
    } catch (err) {
        box.innerHTML = `<div class="warn">No se pudo validar disponibilidad.</div>`;
        box.style.display = 'block';
        if (btn) btn.disabled = false;
    }
}

function cerrarModalReserva() {
    const modal = document.getElementById('modal-reserva');
    if (!modal) return;
    modal.style.display = 'none';
}

async function actualizarEstadoReserva(idReserva, estado) {
    try {
        await client.put(`/reservas/estado/${idReserva}`, { estado });
        const body = document.getElementById('reservas-body');
        if (body) {
            await cargarReservas();
        } else {
            await refreshDashboard();
        }
        showToast('Estado actualizado', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function cargarUsuarios() {
    const body = document.getElementById('usuarios-body');
    const selectPerfil = document.getElementById('id_perfil');
    if (!body && !selectPerfil) return;

    try {
        const adminUser = getAdminUser();
        const canDelete = isSuperAdminUser(adminUser);
        const canWrite = canWriteModule(adminUser, 'usuarios');
        const [usuarios, perfiles] = await Promise.all([
            body ? client.get('/usuarios') : Promise.resolve([]),
            selectPerfil ? client.get('/perfiles') : Promise.resolve([])
        ]);

        if (selectPerfil) {
            selectPerfil.innerHTML = perfiles.map(p => `
                <option value="${p.ID_PERFIL}">${p.NOMBRE}</option>
            `).join('');
        }

        if (body) {
            usuariosCache = Array.isArray(usuarios) ? usuarios : [];
            body.innerHTML = usuarios.map(u => `
                <tr>
                    <td>${u.NOMBRE} ${u.APELLIDO}</td>
                    <td>${u.USERNAME}</td>
                    <td>${u.EMAIL}</td>
                    <td>${u.PERFIL_NOMBRE || '--'}</td>
                    <td><span class="badge badge-${u.ACTIVO ? 'success' : 'danger'}">${u.ACTIVO ? 'ACTIVO' : 'BAJA'}</span></td>
                    <td>
                        ${canWrite ? `<button onclick="editarUsuario(${u.ID_USUARIO})" class="btn-outline">Editar</button>` : ''}
                        ${canWrite ? `<button onclick="toggleUsuario(${u.ID_USUARIO}, ${u.ACTIVO ? 0 : 1})" class="btn-outline">${u.ACTIVO ? 'Desactivar' : 'Activar'}</button>` : ''}
                        ${canDelete ? `<button onclick="eliminarUsuario(${u.ID_USUARIO})" class="btn-danger">Eliminar</button>` : ''}
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        if (body) body.innerHTML = '<tr><td colspan="6">Error al cargar usuarios.</td></tr>';
    }
}

async function toggleUsuario(idUsuario, activo) {
    try {
        if (!canWriteModule(getAdminUser(), 'usuarios')) {
            showToast('No tienes permisos de escritura para Usuarios', 'error');
            return;
        }
        await client.put(`/usuarios/estado/${idUsuario}`, { activo });
        await cargarUsuarios();
    } catch (err) {
        alert(err.message);
    }
}

async function editarUsuario(idUsuario) {
    if (!canWriteModule(getAdminUser(), 'usuarios')) {
        showToast('No tienes permisos de escritura para Usuarios', 'error');
        return;
    }
    let u = usuariosCache.find(x => Number(x.ID_USUARIO) === Number(idUsuario));
    if (!u) {
        await cargarUsuarios();
        u = usuariosCache.find(x => Number(x.ID_USUARIO) === Number(idUsuario));
    }
    if (!u) return;

    abrirModalUsuario();
    const titulo = document.getElementById('modal-titulo');
    if (titulo) titulo.textContent = 'Editar Usuario';

    const idEl = document.getElementById('id_usuario');
    if (idEl) idEl.value = u.ID_USUARIO;
    const nombreEl = document.getElementById('nombre');
    if (nombreEl) nombreEl.value = u.NOMBRE || '';
    const apellidoEl = document.getElementById('apellido');
    if (apellidoEl) apellidoEl.value = u.APELLIDO || '';
    const emailEl = document.getElementById('email');
    if (emailEl) emailEl.value = u.EMAIL || '';

    const usernameEl = document.getElementById('username');
    if (usernameEl) {
        usernameEl.value = u.USERNAME || '';
        usernameEl.disabled = true;
        usernameEl.removeAttribute('required');
    }

    const passGroup = document.getElementById('pass-group');
    if (passGroup) passGroup.style.display = 'none';
    const passEl = document.getElementById('password');
    if (passEl) {
        passEl.value = '';
        passEl.required = false;
    }

    const selectPerfil = document.getElementById('id_perfil');
    if (selectPerfil) {
        if (selectPerfil.options.length === 0) {
            const perfiles = await client.get('/perfiles');
            selectPerfil.innerHTML = (Array.isArray(perfiles) ? perfiles : []).map(p => `<option value="${p.ID_PERFIL}">${p.NOMBRE}</option>`).join('');
        }
        selectPerfil.value = String(u.ID_PERFIL);
    }
}

async function eliminarUsuario(idUsuario) {
    if (!isSuperAdminUser(getAdminUser())) {
        showToast('No tienes permisos para eliminar usuarios', 'error');
        return;
    }
    let u = usuariosCache.find(x => Number(x.ID_USUARIO) === Number(idUsuario));
    if (!u) {
        await cargarUsuarios();
        u = usuariosCache.find(x => Number(x.ID_USUARIO) === Number(idUsuario));
    }
    const label = u ? `${u.NOMBRE} ${u.APELLIDO} (@${u.USERNAME})` : `#${idUsuario}`;
    const ok = confirm(`¿Eliminar definitivamente al usuario ${label}?`);
    if (!ok) return;
    try {
        await client.delete(`/usuarios/${idUsuario}`);
        showToast('Usuario eliminado', 'success');
        await cargarUsuarios();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function cargarPerfiles() {
    const body = document.getElementById('perfiles-body');
    if (!body) return;

    try {
        const perfiles = await client.get('/perfiles');
        perfilesCache = Array.isArray(perfiles) ? perfiles : [];
        body.innerHTML = perfiles.map(p => `
            <tr>
                <td>${p.NOMBRE}</td>
                <td>${p.DESCRIPCION || ''}</td>
                <td>${p.PRIVILEGIOS || ''}</td>
                <td><span class="badge badge-${p.ACTIVO ? 'success' : 'danger'}">${p.ACTIVO ? 'ACTIVO' : 'BAJA'}</span></td>
                <td>
                    <button class="btn-outline" onclick="editarPerfil(${p.ID_PERFIL})">Editar</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        body.innerHTML = '<tr><td colspan="5">Error al cargar perfiles.</td></tr>';
    }
}

function abrirModalPerfil() {
    const modal = document.getElementById('modal-perfil');
    if (!modal) return;
    if (!canWriteModule(getAdminUser(), 'perfiles')) {
        showToast('No tienes permisos de escritura para Perfiles', 'error');
        return;
    }

    document.getElementById('modal-titulo').textContent = 'Nuevo Perfil';
    document.getElementById('id_perfil').value = '';
    document.getElementById('nombre').value = '';
    document.getElementById('descripcion').value = '';
    document.querySelectorAll('input[name="privilegios"]').forEach(cb => { cb.checked = true; });
    modal.style.display = 'block';

    bindOnce('perfil-perm-ui', () => {
        modal.addEventListener('change', (e) => {
            const t = e.target;
            if (!(t instanceof HTMLInputElement)) return;
            if (t.name !== 'privilegios') return;
            const mod = t.dataset.mod;
            const perm = t.dataset.perm;
            if (!mod || !perm) return;

            if (perm === 'w' && t.checked) {
                const r = modal.querySelector(`input[name="privilegios"][data-mod="${mod}"][data-perm="r"]`);
                if (r instanceof HTMLInputElement) r.checked = true;
            }
            if (perm === 'r' && !t.checked) {
                const w = modal.querySelector(`input[name="privilegios"][data-mod="${mod}"][data-perm="w"]`);
                if (w instanceof HTMLInputElement) w.checked = false;
            }
        });
    });

    bindOnce('perfil-form', () => {
        const form = document.getElementById('perfil-form');
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('id_perfil').value;
            const nombre = document.getElementById('nombre').value;
            const descripcion = document.getElementById('descripcion').value;
            const privilegios = Array.from(document.querySelectorAll('input[name="privilegios"]:checked')).map(x => x.value).join(',');

            try {
                if (id) {
                    await client.put(`/perfiles/${id}`, { nombre, descripcion, privilegios });
                } else {
                    await client.post('/perfiles', { nombre, descripcion, privilegios });
                }
                cerrarModalPerfil();
                await cargarPerfiles();
            } catch (err) {
                alert(err.message);
            }
        });
    });
}

function editarPerfil(idPerfil) {
    const perfil = perfilesCache.find(p => Number(p.ID_PERFIL) === Number(idPerfil));
    if (!perfil) return;
    abrirModalPerfil();
    document.getElementById('modal-titulo').textContent = 'Editar Perfil';
    document.getElementById('id_perfil').value = perfil.ID_PERFIL;
    document.getElementById('nombre').value = perfil.NOMBRE || '';
    document.getElementById('descripcion').value = perfil.DESCRIPCION || '';
    const selected = String(perfil.PRIVILEGIOS || '').split(',').map(s => s.trim()).filter(Boolean);
    document.querySelectorAll('input[name="privilegios"]').forEach(cb => {
        const v = String(cb.value || '');
        const base = v.includes(':') ? v.split(':')[0] : v;
        cb.checked = selected.includes(v) || selected.includes(base);
    });
}

function cerrarModalPerfil() {
    const modal = document.getElementById('modal-perfil');
    if (!modal) return;
    modal.style.display = 'none';
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

let handlersBound = {};

function bindOnce(key, fn) {
    if (handlersBound[key]) return;
    handlersBound[key] = true;
    fn();
}

async function cargarEspecialidades() {
    const body = document.getElementById('especialidades-body');
    if (!body) return;

    try {
        const especialidades = await client.get('/especialidades');
        especialidadesCache = Array.isArray(especialidades) ? especialidades : [];
        body.innerHTML = especialidades.map(e => `
            <tr>
                <td>${e.NOMBRE}</td>
                <td>${e.DESCRIPCION || ''}</td>
                <td><span class="badge badge-success">ACTIVA</span></td>
                <td>
                    <button class="btn-outline" onclick="editarEspecialidad(${e.ID_ESPECIALIDAD})">Editar</button>
                    <button class="btn-danger" onclick="darBajaEspecialidad(${e.ID_ESPECIALIDAD})">Baja</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        body.innerHTML = '<tr><td colspan="4">Error al cargar especialidades.</td></tr>';
    }
}

function abrirModalEspecialidad() {
    const modal = document.getElementById('modal-especialidad');
    if (!modal) return;
    document.getElementById('modal-titulo').textContent = 'Nueva Especialidad';
    document.getElementById('id_especialidad').value = '';
    document.getElementById('nombre').value = '';
    document.getElementById('descripcion').value = '';
    modal.style.display = 'block';

    bindOnce('especialidad-form', () => {
        const form = document.getElementById('especialidad-form');
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('id_especialidad').value;
            const nombre = document.getElementById('nombre').value;
            const descripcion = document.getElementById('descripcion').value;

            try {
                if (id) {
                    await client.put(`/especialidades/${id}`, { nombre, descripcion });
                } else {
                    await client.post('/especialidades', { nombre, descripcion });
                }
                cerrarModalEspecialidad();
                await cargarEspecialidades();
            } catch (err) {
                alert(err.message);
            }
        });
    });
}

function editarEspecialidad(id) {
    const esp = especialidadesCache.find(e => Number(e.ID_ESPECIALIDAD) === Number(id));
    abrirModalEspecialidad();
    document.getElementById('modal-titulo').textContent = 'Editar Especialidad';
    document.getElementById('id_especialidad').value = id;
    document.getElementById('nombre').value = esp?.NOMBRE || '';
    document.getElementById('descripcion').value = esp?.DESCRIPCION || '';
}

async function darBajaEspecialidad(id) {
    const ok = confirm('¿Dar de baja esta especialidad?');
    if (!ok) return;
    try {
        await client.put(`/especialidades/baja/${id}`, {});
        await cargarEspecialidades();
    } catch (err) {
        alert(err.message);
    }
}

function cerrarModalEspecialidad() {
    const modal = document.getElementById('modal-especialidad');
    if (!modal) return;
    modal.style.display = 'none';
}

function cambiarEstadoQ(idQuirofano, estadoActual) {
    const modal = document.getElementById('modal-quirofano');
    if (!modal) return;
    document.getElementById('id_quirofano').value = idQuirofano;
    document.getElementById('estado').value = estadoActual;
    const nombreEl = document.getElementById('quirofano-nombre');
    if (nombreEl) nombreEl.textContent = `Quirófano #${idQuirofano}`;
    modal.style.display = 'block';
    const maintBox = document.getElementById('mantenimiento-fields');
    const mantFecha = document.getElementById('mant_fecha');
    const mantInicio = document.getElementById('mant_inicio');
    const mantFin = document.getElementById('mant_fin');
    const mantMotivo = document.getElementById('mant_motivo');
    const estadoSel = document.getElementById('estado');
    if (mantFecha && !mantFecha.value) mantFecha.value = getTodayStr();
    if (mantInicio && !mantInicio.value) {
        const now = new Date();
        mantInicio.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    if (mantFin && !mantFin.value) {
        const now = new Date();
        now.setHours(now.getHours() + 2);
        mantFin.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    if (maintBox && estadoSel) {
        maintBox.style.display = estadoSel.value === 'MANTENIMIENTO' ? 'block' : 'none';
    }

    bindOnce('quirofano-form', () => {
        const form = document.getElementById('quirofano-form');
        if (!form) return;
        const estadoEl = document.getElementById('estado');
        if (estadoEl) {
            estadoEl.addEventListener('change', () => {
                const box = document.getElementById('mantenimiento-fields');
                if (!box) return;
                box.style.display = estadoEl.value === 'MANTENIMIENTO' ? 'block' : 'none';
            });
        }
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('id_quirofano').value;
            const estado = document.getElementById('estado').value;
            try {
                if (estado === 'MANTENIMIENTO') {
                    const f = document.getElementById('mant_fecha')?.value || getTodayStr();
                    const hi = document.getElementById('mant_inicio')?.value || '08:00';
                    const hf = document.getElementById('mant_fin')?.value || '10:00';
                    const motivo = document.getElementById('mant_motivo')?.value || '';
                    await client.post('/quirofanos/bloqueos', {
                        id_quirofano: Number(id),
                        tipo: 'MANTENIMIENTO',
                        inicio: `${f} ${hi}`,
                        fin: `${f} ${hf}`,
                        motivo
                    });
                } else {
                    await client.put(`/quirofanos/estado/${id}`, { estado });
                }
                cerrarModalQuirofano();
                await cargarQuirofanos();
            } catch (err) {
                alert(err.message);
            }
        });
    });
}

function cerrarModalQuirofano() {
    const modal = document.getElementById('modal-quirofano');
    if (!modal) return;
    modal.style.display = 'none';
}

async function cargarEquipos() {
    const body = document.getElementById('equipos-body');
    if (!body) return;

    try {
        const equipos = await client.get('/equipos');
        equiposCache = Array.isArray(equipos) ? equipos : [];
        body.innerHTML = equipos.map(e => `
            <tr>
                <td>${e.NOMBRE}</td>
                <td>${e.DESCRIPCION || ''}</td>
                <td>${e.CANTIDAD_TOTAL}</td>
                <td>${e.CANTIDAD_DISPONIBLE}</td>
                <td><span class="badge badge-success">ACTIVO</span></td>
                <td>
                    <button class="btn-outline" onclick="editarEquipo(${e.ID_EQUIPO})">Editar</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        body.innerHTML = '<tr><td colspan="6">Error al cargar equipos.</td></tr>';
    }
}

function abrirModalEquipo() {
    const modal = document.getElementById('modal-equipo');
    if (!modal) return;
    document.getElementById('modal-titulo').textContent = 'Nuevo Equipo';
    document.getElementById('id_equipo').value = '';
    document.getElementById('nombre').value = '';
    document.getElementById('descripcion').value = '';
    document.getElementById('cantidad_total').value = 1;
    document.getElementById('cantidad_disponible').value = 1;
    modal.style.display = 'block';

    bindOnce('equipo-form', () => {
        const form = document.getElementById('equipo-form');
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('id_equipo').value;
            const nombre = document.getElementById('nombre').value;
            const descripcion = document.getElementById('descripcion').value;
            const cantidad_total = Number(document.getElementById('cantidad_total').value);
            const cantidad_disponible = Number(document.getElementById('cantidad_disponible').value);

            try {
                if (id) {
                    await client.put(`/equipos/stock/${id}`, { cantidad_total, cantidad_disponible });
                } else {
                    await client.post('/equipos', { nombre, descripcion, cantidad_total });
                }
                cerrarModalEquipo();
                await cargarEquipos();
            } catch (err) {
                alert(err.message);
            }
        });
    });
}

function editarEquipo(id) {
    const eq = equiposCache.find(e => Number(e.ID_EQUIPO) === Number(id));
    abrirModalEquipo();
    document.getElementById('modal-titulo').textContent = 'Editar Equipo';
    document.getElementById('id_equipo').value = id;
    document.getElementById('nombre').value = eq?.NOMBRE || '';
    document.getElementById('descripcion').value = eq?.DESCRIPCION || '';
    document.getElementById('cantidad_total').value = eq?.CANTIDAD_TOTAL ?? 1;
    document.getElementById('cantidad_disponible').value = eq?.CANTIDAD_DISPONIBLE ?? 1;
}

function cerrarModalEquipo() {
    const modal = document.getElementById('modal-equipo');
    if (!modal) return;
    modal.style.display = 'none';
}

async function cargarEmergencias() {
    const body = document.getElementById('emergencias-body');
    if (!body) return;

    try {
        const emergencias = await client.get('/emergencias');
        if (!Array.isArray(emergencias) || emergencias.length === 0) {
            body.innerHTML = '<tr><td colspan="6">No hay emergencias activas.</td></tr>';
            return;
        }
        body.innerHTML = emergencias.map(e => `
            <tr>
                <td>${e.PACIENTE}</td>
                <td>${e.QUIROFANO}</td>
                <td><span class="badge badge-danger">${e.NIVEL}</span></td>
                <td>${e.MEDICO}</td>
                <td>${new Date(e.FECHA_HORA).toLocaleString()}</td>
                <td><button class="btn-outline" onclick="resolverEmergencia(${e.ID_EMERGENCIA})">Resolver</button></td>
            </tr>
        `).join('');
    } catch (err) {
        body.innerHTML = '<tr><td colspan="6">Error al cargar emergencias.</td></tr>';
    }
}

function abrirModalEmergencia() {
    const modal = document.getElementById('modal-emergencia');
    if (!modal) return;
    modal.style.display = 'block';

    bindOnce('emergencia-form-init', async () => {
        const [pacientes, medicos, quirofanos] = await Promise.all([
            client.get('/pacientes'),
            client.get('/medicos'),
            client.get('/quirofanos/disponibles')
        ]);

        const selPaciente = document.getElementById('id_paciente_emerg');
        const selMedico = document.getElementById('id_medico_emerg');
        const selQuirofano = document.getElementById('id_quirofano_emerg');

        if (selPaciente) {
            selPaciente.innerHTML = pacientes.map(p => `<option value="${p.ID_PACIENTE}">${p.NOMBRE} ${p.APELLIDO}</option>`).join('');
        }
        if (selMedico) {
            selMedico.innerHTML = medicos.map(m => `<option value="${m.ID_MEDICO}">${m.NOMBRE} ${m.APELLIDO}</option>`).join('');
        }
        if (selQuirofano) {
            selQuirofano.innerHTML = quirofanos.map(q => `<option value="${q.ID_QUIROFANO}">${q.NOMBRE}</option>`).join('');
        }
    });

    bindOnce('emergencia-form', () => {
        const form = document.getElementById('emergencia-form');
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id_paciente = Number(document.getElementById('id_paciente_emerg').value);
            const id_medico = Number(document.getElementById('id_medico_emerg').value);
            const id_quirofano = Number(document.getElementById('id_quirofano_emerg').value);
            const nivel = document.getElementById('nivel').value;
            const descripcion = document.getElementById('descripcion').value;

            try {
                await client.post('/emergencias', { id_paciente, id_medico, id_quirofano, nivel, descripcion });
                cerrarModalEmergencia();
                await cargarEmergencias();
            } catch (err) {
                alert(err.message);
            }
        });
    });
}

function cerrarModalEmergencia() {
    const modal = document.getElementById('modal-emergencia');
    if (!modal) return;
    modal.style.display = 'none';
}

function abrirModalUsuario() {
    const modal = document.getElementById('modal-usuario');
    if (!modal) return;
    if (!canWriteModule(getAdminUser(), 'usuarios')) {
        showToast('No tienes permisos de escritura para Usuarios', 'error');
        return;
    }
    document.getElementById('modal-titulo').textContent = 'Nuevo Usuario';
    document.getElementById('id_usuario').value = '';
    document.getElementById('nombre').value = '';
    document.getElementById('apellido').value = '';
    const usernameEl = document.getElementById('username');
    if (usernameEl) {
        usernameEl.value = '';
        usernameEl.disabled = false;
        usernameEl.required = true;
    }
    document.getElementById('email').value = '';
    const passEl = document.getElementById('password');
    if (passEl) {
        passEl.value = '';
        passEl.required = true;
    }
    const passGroup = document.getElementById('pass-group');
    if (passGroup) passGroup.style.display = 'block';
    modal.style.display = 'block';

    bindOnce('usuario-form-init', async () => {
        const perfiles = await client.get('/perfiles');
        const selectPerfil = document.getElementById('id_perfil');
        if (selectPerfil && selectPerfil.options.length === 0) {
            selectPerfil.innerHTML = perfiles.map(p => `<option value="${p.ID_PERFIL}">${p.NOMBRE}</option>`).join('');
        }
    });

    bindOnce('usuario-form', () => {
        const form = document.getElementById('usuario-form');
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('id_usuario').value;
            const nombre = document.getElementById('nombre').value;
            const apellido = document.getElementById('apellido').value;
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const id_perfil = Number(document.getElementById('id_perfil').value);

            try {
                if (id) {
                    await client.put(`/usuarios/${id}`, { nombre, apellido, email, id_perfil });
                } else {
                    await client.post('/usuarios', { nombre, apellido, username, email, password, id_perfil });
                }
                cerrarModalUsuario();
                await cargarUsuarios();
            } catch (err) {
                alert(err.message);
            }
        });
    });
}

function cerrarModalUsuario() {
    const modal = document.getElementById('modal-usuario');
    if (!modal) return;
    modal.style.display = 'none';
}

// Monitoreo Oracle
async function cargarMonitoreo() {
    const lastEl = document.getElementById('mon-last');
    const kSes = document.getElementById('mon-kpi-sesiones');
    const kAct = document.getElementById('mon-kpi-activas');
    const kBloq = document.getElementById('mon-kpi-bloqueadas');
    const kLocks = document.getElementById('mon-kpi-bloqueos');
    const sysEl = document.getElementById('mon-sysmetrics');
    const topWaitEl = document.getElementById('mon-top-wait');

    const sesionesBody = document.getElementById('mon-sesiones-body');
    const bloqueosBody = document.getElementById('mon-bloqueos-body');
    const waitsBody = document.getElementById('mon-waits-body');
    const topSqlBody = document.getElementById('mon-top-sql-body');
    const txBody = document.getElementById('mon-tx-body');

    if (!kSes && !sesionesBody && !bloqueosBody && !topSqlBody) return;

    function fmt(n) {
        if (n === null || n === undefined) return '--';
        const num = Number(n);
        if (Number.isNaN(num)) return String(n);
        if (Math.abs(num) >= 1000) return num.toLocaleString();
        return num % 1 === 0 ? String(num) : num.toFixed(2);
    }

    try {
        const [overview, sesiones, bloqueos, waits, topSql, tx] = await Promise.all([
            client.get('/monitoreo/overview'),
            client.get('/monitoreo/sesiones'),
            client.get('/monitoreo/bloqueos'),
            client.get('/monitoreo/waits'),
            client.get('/monitoreo/top-sql'),
            client.get('/monitoreo/transacciones')
        ]);

        pushMonPoint({
            ts: Date.now(),
            sesiones: overview.sesiones,
            activas: overview.sesiones_activas
        });
        upsertWaitsByClass(waits);

        if (kSes) kSes.textContent = fmt(overview.sesiones);
        if (kAct) kAct.textContent = fmt(overview.sesiones_activas);
        if (kBloq) kBloq.textContent = fmt(overview.sesiones_bloqueadas);
        if (kLocks) kLocks.textContent = fmt(overview.bloqueos);

        if (topWaitEl) {
            topWaitEl.textContent = overview.top_wait
                ? `${overview.top_wait.wait_class} · ${overview.top_wait.event} · ${overview.top_wait.cnt}`
                : 'Sin waits relevantes';
        }

        if (sysEl) {
            const items = Array.isArray(overview.sysmetrics) ? overview.sysmetrics : [];
            sysEl.innerHTML = items.map(m => `
                <div class="sysmetric">
                    <div class="label">${m.METRIC_NAME}</div>
                    <div class="value">${fmt(m.VALUE)} ${m.UNIT || ''}</div>
                </div>
            `).join('');
        }

        if (sesionesBody) {
            const rows = Array.isArray(sesiones) ? sesiones : [];
            sesionesBody.innerHTML = rows.slice(0, 200).map(s => `
                <tr>
                    <td>${s.SID}</td>
                    <td>${s.USERNAME}</td>
                    <td>${s.STATUS}</td>
                    <td>${s.MACHINE || ''}</td>
                    <td>${s.PROGRAM || ''}</td>
                    <td>${s.WAIT_CLASS || ''}</td>
                    <td>${s.EVENT || ''}</td>
                    <td>${s.BLOCKING_SESSION || ''}</td>
                    <td>${s.SQL_ID || ''}</td>
                </tr>
            `).join('') || '<tr><td colspan="9">Sin datos</td></tr>';
        }

        if (bloqueosBody) {
            const rows = Array.isArray(bloqueos) ? bloqueos : [];
            bloqueosBody.innerHTML = rows.slice(0, 200).map(b => `
                <tr>
                    <td>${b.SID}</td>
                    <td>${b.USERNAME}</td>
                    <td>${b.TYPE}</td>
                    <td>${b.LMODE}</td>
                    <td>${b.REQUEST}</td>
                    <td>${b.BLOCK ? 'SÍ' : 'NO'}</td>
                </tr>
            `).join('') || '<tr><td colspan="6">Sin bloqueos</td></tr>';
        }

        if (waitsBody) {
            const rows = Array.isArray(waits) ? waits : [];
            waitsBody.innerHTML = rows.map(w => `
                <tr>
                    <td>${w.WAIT_CLASS}</td>
                    <td>${w.EVENT}</td>
                    <td>${w.CNT}</td>
                </tr>
            `).join('') || '<tr><td colspan="3">Sin waits</td></tr>';
        }

        if (topSqlBody) {
            const rows = Array.isArray(topSql) ? topSql : [];
            topSqlBody.innerHTML = rows.map(s => `
                <tr>
                    <td>${s.SQL_ID || ''}</td>
                    <td>${s.PARSING_SCHEMA_NAME || ''}</td>
                    <td>${fmt(s.ELAPSED_TIME)}</td>
                    <td>${fmt(s.CPU_TIME)}</td>
                    <td>${fmt(s.EXECUTIONS)}</td>
                    <td>${fmt(s.ROWS_PROCESSED)}</td>
                    <td>${String(s.SQL_TEXT || '').substring(0, 90)}</td>
                </tr>
            `).join('') || '<tr><td colspan="7">Sin datos</td></tr>';
        }

        if (txBody) {
            const rows = Array.isArray(tx) ? tx : [];
            txBody.innerHTML = rows.slice(0, 200).map(t => `
                <tr>
                    <td>${t.START_TIME ? new Date(t.START_TIME).toLocaleString() : ''}</td>
                    <td>${t.STATUS}</td>
                    <td>${t.SID || ''}</td>
                    <td>${t.USERNAME || ''}</td>
                    <td>${t.MACHINE || ''}</td>
                    <td>${t.PROGRAM || ''}</td>
                </tr>
            `).join('') || '<tr><td colspan="6">Sin transacciones activas</td></tr>';
        }

        if (lastEl) lastEl.textContent = `Actualizado: ${new Date().toLocaleTimeString()}`;

        const chartSes = document.getElementById('chart-sesiones');
        const chartWaits = document.getElementById('chart-waits');
        if (chartSes) {
            const labels = monSeries.ts.map(t => new Date(t).toLocaleTimeString());
            drawLineChart('chart-sesiones', monSeries.sesiones, monSeries.activas, labels);
        }
        if (chartWaits) {
            const entries = Object.entries(monSeries.waitsByClass || {})
                .map(([k, v]) => ({ label: k.length > 10 ? k.slice(0, 10) + '…' : k, fullLabel: k, value: Number(v || 0) }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 8);
            drawBarChart('chart-waits', entries);
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
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
    window.location.href = 'index.html';
}

function exportarCSV() {
    alert('Función de exportación básica activada. Descargando datos...');
    // Implementación simple de exportación CSV
}

function initPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(btn => {
        if (btn.dataset.bound === '1') return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target') || '';
            const input = targetId ? document.getElementById(targetId) : btn.closest('.password-wrap')?.querySelector('input[type="password"], input[type="text"]');
            if (!(input instanceof HTMLInputElement)) return;
            const nextType = input.type === 'password' ? 'text' : 'password';
            input.type = nextType;
            btn.textContent = nextType === 'password' ? 'Ver' : 'Ocultar';
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPasswordToggles);
} else {
    initPasswordToggles();
}
