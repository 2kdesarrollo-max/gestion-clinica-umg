/* ============================================================
   Gestión Clínica Integral UMG - JS Portal Paciente
   ============================================================ */

const API_URL = '/api';
let reservasCache = [];

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
