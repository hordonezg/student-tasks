// Ajusta API_BASE:
// - Local: se usa http://localhost:3000 automáticamente.
// - En producción: REEMPLAZA 'REPLACE_WITH_BACKEND_URL' por tu URL de backend en Render (p.ej. https://student-tasks-api.onrender.com)
const API_BASE = location.hostname.includes('localhost')
  ? 'http://localhost:3000'
  : 'REPLACE_WITH_BACKEND_URL';

const $ = (id) => document.getElementById(id);

const state = {
  user: null,
};

function saveUser(u) {
  state.user = u;
  localStorage.setItem('user', JSON.stringify(u));
}

function loadUser() {
  const raw = localStorage.getItem('user');
  if (raw) state.user = JSON.parse(raw);
}

function uiAuth(show) {
  $('auth').classList.toggle('hidden', !show);
  $('app').classList.toggle('hidden', show);
}

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  if (!res.ok) {
    let msg = 'Error';
    try {
      const j = await res.json();
      msg = j.error || JSON.stringify(j);
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

async function refreshTasks() {
  const list = $('tasks');
  list.innerHTML = '';
  $('listMsg').textContent = 'Cargando...';
  try {
    const data = await api(`/tasks/${state.user.id}`);
    if (data.length === 0) {
      $('listMsg').textContent = 'No hay tareas.';
      return;
    }
    $('listMsg').textContent = '';
    data.forEach(t => {
      const div = document.createElement('div');
      div.className = 'task';
      div.innerHTML = `
        <div>
          <strong>${t.title}</strong><br/>
          <small>${t.description || ''}</small>
        </div>
        <div>
          <span class="pill">${t.status}</span>
          <button data-id="${t.id}" ${t.status === 'done' ? 'disabled' : ''}>Avanzar</button>
        </div>`;
      list.appendChild(div);
    });

    // bind
    list.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        e.target.disabled = true;
        try {
          await api(`/tasks/${id}/status`, { method: 'PUT' });
          await refreshTasks();
        } catch (err) {
          alert(err.message);
          e.target.disabled = false;
        }
      });
    });
  } catch (err) {
    $('listMsg').textContent = err.message;
  }
}

// Registro
$('formRegister').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('regMsg').textContent = 'Procesando...';
  try {
    const body = {
      name: $('regName').value.trim(),
      email: $('regEmail').value.trim(),
      password: $('regPassword').value
    };
    const u = await api('/users/register', { method: 'POST', body: JSON.stringify(body) });
    $('regMsg').textContent = 'Registro OK. Ahora inicia sesión.';
  } catch (err) {
    $('regMsg').textContent = err.message;
  }
});

// Login
$('formLogin').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('logMsg').textContent = 'Procesando...';
  try {
    const body = {
      email: $('logEmail').value.trim(),
      password: $('logPassword').value
    };
    const u = await api('/users/login', { method: 'POST', body: JSON.stringify(body) });
    saveUser(u);
    $('userName').textContent = u.name;
    $('userEmail').textContent = u.email;
    $('userId').textContent = u.id;
    uiAuth(false);
    await refreshTasks();
  } catch (err) {
    $('logMsg').textContent = err.message;
  }
});

// Crear tarea
$('formTask').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('taskMsg').textContent = 'Creando...';
  try {
    const body = {
      user_id: state.user.id,
      title: $('taskTitle').value.trim(),
      description: $('taskDesc').value.trim()
    };
    await api('/tasks', { method: 'POST', body: JSON.stringify(body) });
    $('taskTitle').value = '';
    $('taskDesc').value = '';
    $('taskMsg').textContent = 'Tarea creada.';
    await refreshTasks();
  } catch (err) {
    $('taskMsg').textContent = err.message;
  }
});

// Logout
$('btnLogout').addEventListener('click', () => {
  localStorage.removeItem('user');
  state.user = null;
  uiAuth(true);
});

(function init() {
  loadUser();
  if (state.user) {
    $('userName').textContent = state.user.name;
    $('userEmail').textContent = state.user.email;
    $('userId').textContent = state.user.id;
    uiAuth(false);
    refreshTasks();
  } else {
    uiAuth(true);
  }
})();
