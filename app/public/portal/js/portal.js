/* ============================================================
   Gestión Clínica Integral UMG - JS Portal Paciente
   ============================================================ */

const API_URL = '/api';
let reservasCache = [];

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
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

function getPaciente() {
    try {
        return JSON.parse(localStorage.getItem('paciente') || 'null');
    } catch {
        return null;
    }
}

function initPacienteHeader() {
    const paciente = getPaciente();
    const navUser = document.getElementById('nav-user');
    const navReservas = document.getElementById('nav-reservas');
    const navSolicitud = document.getElementById('nav-solicitud');
    const navLogin = document.getElementById('nav-login');
    const navLogout = document.getElementById('nav-logout');
    if (navUser && navUser.querySelector('.nav-user')) {
        navUser.querySelector('.nav-user').textContent = paciente?.nombre ? `Hola, ${paciente.nombre}` : '';
    }
    if (navUser) navUser.style.display = paciente ? '' : 'none';
    if (navReservas) navReservas.style.display = paciente ? '' : 'none';
    if (navSolicitud) navSolicitud.style.display = paciente ? '' : 'none';
    if (navLogout) navLogout.style.display = paciente ? '' : 'none';
    if (navLogin) navLogin.style.display = paciente ? 'none' : '';

    const headerNav = document.querySelector('header nav ul');
    if (headerNav && !document.getElementById('nav-user')) {
        const li = document.createElement('li');
        li.id = 'nav-user';
        li.innerHTML = `<span class="nav-user">${paciente?.nombre ? `Hola, ${paciente.nombre}` : ''}</span>`;
        const logoutLi = headerNav.querySelector('a[onclick="logout()"]')?.closest('li') || null;
        if (logoutLi) headerNav.insertBefore(li, logoutLi);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPacienteHeader);
} else {
    initPacienteHeader();
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

// Función fetch genérica
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token_paciente');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Error en la solicitud');
        }
        return data;
    } catch (err) {
        console.error('API Error:', err.message);
        throw err;
    }
}

// Login
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(loginForm);
        const credentials = Object.fromEntries(formData);

        try {
            const data = await apiFetch('/auth/login-paciente', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });
            localStorage.setItem('token_paciente', data.token);
            localStorage.setItem('paciente', JSON.stringify(data.paciente));
            window.location.href = 'mis-reservas.html';
        } catch (err) {
            alert(err.message);
        }
    });
}

// Registro
const registroForm = document.getElementById('registro-form');
if (registroForm) {
    registroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(registroForm);
        const userData = Object.fromEntries(formData);

        try {
            await apiFetch('/auth/registro-paciente', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            alert('Registro exitoso. Ahora puedes iniciar sesión.');
            window.location.href = 'login.html';
        } catch (err) {
            alert(err.message);
        }
    });
}

// Cargar especialidades en Home
async function cargarEspecialidadesHome() {
    const grid = document.getElementById('especialidades-grid');
    if (!grid) return;

    try {
        const especialidades = await apiFetch('/especialidades');
        grid.innerHTML = especialidades.slice(0, 6).map(esp => `
            <div class="service-card">
                <h3>${esp.NOMBRE}</h3>
                <p>${esp.DESCRIPCION || 'Cuidado especializado con tecnología de punta.'}</p>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error al cargar especialidades:', err.message);
    }
}

// Cargar especialidades en Select
async function cargarEspecialidadesSelect() {
    const select = document.getElementById('id_especialidad');
    if (!select) return;

    try {
        const especialidades = await apiFetch('/especialidades');
        select.innerHTML = '<option value="">Selecciona una especialidad...</option>' + 
            especialidades.map(esp => `
                <option value="${esp.ID_ESPECIALIDAD}">${esp.NOMBRE}</option>
            `).join('');
    } catch (err) {
        console.error('Error al cargar especialidades:', err.message);
    }
}

// Enviar solicitud de reserva
const solicitudForm = document.getElementById('solicitud-form');
if (solicitudForm) {
    solicitudForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(solicitudForm);
        const reservaData = Object.fromEntries(formData);
        const paciente = JSON.parse(localStorage.getItem('paciente'));
        reservaData.id_paciente = paciente.id;
        reservaData.id_medico = 1; // Médico por defecto para solicitudes (asignado luego por admin)
        reservaData.id_quirofano = 1; // Quirófano por defecto para solicitudes (asignado luego por admin)

        try {
            await apiFetch('/reservas', {
                method: 'POST',
                body: JSON.stringify(reservaData)
            });
            alert('Solicitud enviada exitosamente. El hospital revisará tu caso.');
            window.location.href = 'mis-reservas.html';
        } catch (err) {
            alert(err.message);
        }
    });
}

// Cargar mis reservas
async function cargarMisReservas() {
    const body = document.getElementById('reservas-body');
    if (!body) return;

    const paciente = JSON.parse(localStorage.getItem('paciente'));
    try {
        const reservas = await apiFetch(`/reservas/paciente/${paciente.id}`);
        reservasCache = Array.isArray(reservas) ? reservas : [];
        if (reservas.length === 0) {
            body.innerHTML = '<tr><td colspan="5">No tienes reservas registradas.</td></tr>';
            return;
        }
        body.innerHTML = reservas.map(res => `
            <tr>
                <td>${new Date(res.FECHA_RESERVA).toLocaleDateString()}</td>
                <td>${res.TIPO_CIRUGIA}</td>
                <td>${res.MEDICO || 'Pendiente'}</td>
                <td><span class="badge badge-${res.ESTADO.toLowerCase()}">${res.ESTADO}</span></td>
                <td>
                    <button class="btn-primary" onclick="verDetalle(${res.ID_RESERVA})">Ver</button>
                    ${(res.ESTADO === 'SOLICITADA' || res.ESTADO === 'APROBADA') ? `<button class="btn-outline" onclick="cancelarReserva(${res.ID_RESERVA})">Cancelar</button>` : ''}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        body.innerHTML = '<tr><td colspan="5">Error al cargar reservas.</td></tr>';
    }
}

function verDetalle(idReserva) {
    const modal = document.getElementById('modal-detalle');
    const detalle = document.getElementById('detalle-reserva');
    if (!modal || !detalle) return;

    const reserva = reservasCache.find(r => Number(r.ID_RESERVA) === Number(idReserva));

    if (!reserva) {
        detalle.innerHTML = '<p>No se encontró la reserva.</p>';
        modal.style.display = 'block';
        return;
    }

    detalle.innerHTML = `
        <p><strong>ID:</strong> ${reserva.ID_RESERVA}</p>
        <p><strong>Fecha:</strong> ${new Date(reserva.FECHA_RESERVA).toLocaleDateString()}</p>
        <p><strong>Cirugía:</strong> ${reserva.TIPO_CIRUGIA}</p>
        <p><strong>Estado:</strong> ${reserva.ESTADO}</p>
        <p><strong>Médico:</strong> ${reserva.MEDICO || 'Pendiente'}</p>
        <p><strong>Quirófano:</strong> ${reserva.QUIROFANO || 'Pendiente'}</p>
        <p><strong>Descripción:</strong> ${reserva.DESCRIPCION_NECESIDAD || '-'}</p>
    `;

    cargarTrackerReserva(reserva.ID_RESERVA);
    modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('modal-detalle');
    if (!modal) return;
    modal.style.display = 'none';
}

async function cancelarReserva(idReserva) {
    const ok = confirm('¿Deseas cancelar esta reserva?');
    if (!ok) return;

    try {
        await apiFetch(`/reservas/${idReserva}`, {
            method: 'DELETE',
            body: JSON.stringify({ motivo: 'Cancelado por paciente' })
        });
        await cargarMisReservas();
    } catch (err) {
        alert(err.message);
    }
}

// Logout
function logout() {
    localStorage.removeItem('token_paciente');
    localStorage.removeItem('paciente');
    window.location.href = 'index.html';
}

async function cargarDisponibilidadSolicitud() {
    const box = document.getElementById('disponibilidad-box');
    const grid = document.getElementById('disponibilidad-grid');
    const fecha = document.getElementById('fecha')?.value;
    const hora_inicio = document.getElementById('hora_inicio')?.value;
    const hora_fin = document.getElementById('hora_fin')?.value;
    if (!box || !grid) return;
    if (!fecha || !hora_inicio || !hora_fin) {
        box.style.display = 'none';
        grid.style.display = 'none';
        return;
    }
    try {
        const [quirofanos, disp] = await Promise.all([
            apiFetch('/quirofanos'),
            apiFetch(`/quirofanos/disponibilidad?fecha=${encodeURIComponent(fecha)}&hora_inicio=${encodeURIComponent(hora_inicio)}&hora_fin=${encodeURIComponent(hora_fin)}`)
        ]);
        const ocupados = new Set((disp?.ocupados_por_reserva || []).map(x => Number(x.ID_QUIROFANO)));
        const bloqueados = new Set((disp?.bloqueados_por_mantenimiento || []).map(x => Number(x.ID_QUIROFANO)));
        const list = (Array.isArray(quirofanos) ? quirofanos : []).filter(q => Number(q.ACTIVO ?? 1) === 1);
        const libres = list.filter(q => !ocupados.has(Number(q.ID_QUIROFANO)) && !bloqueados.has(Number(q.ID_QUIROFANO)));

        box.textContent = `Espacios disponibles para ${fecha} ${hora_inicio}-${hora_fin}: ${libres.length} de ${list.length} quirófanos`;
        box.style.display = 'block';
        grid.innerHTML = list.map(q => {
            const id = Number(q.ID_QUIROFANO);
            const isMaint = bloqueados.has(id);
            const isBusy = ocupados.has(id);
            const cls = isMaint ? 'maint' : (isBusy ? 'busy' : 'free');
            const status = isMaint ? 'MANTENIMIENTO' : (isBusy ? 'OCUPADO' : 'LIBRE');
            return `
                <div class="availability-card ${cls}">
                    <div class="t">${q.NOMBRE}</div>
                    <div class="s">${status}</div>
                </div>
            `;
        }).join('');
        grid.style.display = 'grid';
    } catch (err) {
        box.textContent = 'No se pudo cargar disponibilidad.';
        box.style.display = 'block';
        grid.style.display = 'none';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const f = document.getElementById('solicitud-form');
        if (!f) return;
        ['fecha', 'hora_inicio', 'hora_fin'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('change', cargarDisponibilidadSolicitud);
            el.addEventListener('input', cargarDisponibilidadSolicitud);
        });
        cargarDisponibilidadSolicitud();
    });
}

async function cargarTrackerReserva(idReserva) {
    const root = document.getElementById('tracker-reserva');
    if (!root) return;
    root.innerHTML = '<div class="meta">Cargando seguimiento...</div>';
    try {
        const data = await apiFetch(`/reservas/${idReserva}/tracker`);
        const events = Array.isArray(data?.events) ? data.events : [];
        if (events.length === 0) {
            root.innerHTML = '<div class="meta">Sin eventos disponibles.</div>';
            return;
        }
        root.innerHTML = events.map(ev => {
            const msg = ev.mensaje || ev.tipo || 'Evento';
            const meta = [ev.fecha_hora, ev.origen].filter(Boolean).join(' · ');
            return `
                <div class="tracker-item">
                    <div class="tracker-dot"></div>
                    <div>
                        <div class="msg">${msg}</div>
                        <div class="meta">${meta}</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch {
        root.innerHTML = '<div class="meta">No se pudo cargar seguimiento.</div>';
    }
}
