/* ============================================================
   Gestión Clínica Integral UMG - JS Portal Paciente
   ============================================================ */

const API_URL = '/api';

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
            window.location.href = 'index.html';
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
                    ${res.ESTADO === 'SOLICITADA' ? `<button class="btn-outline" onclick="cancelarReserva(${res.ID_RESERVA})">Cancelar</button>` : ''}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        body.innerHTML = '<tr><td colspan="5">Error al cargar reservas.</td></tr>';
    }
}

// Logout
function logout() {
    localStorage.removeItem('token_paciente');
    localStorage.removeItem('paciente');
    window.location.href = 'index.html';
}
