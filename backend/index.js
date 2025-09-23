// Express API alineado 1:1 al PDF:
// POST /users/register, POST /users/login, POST /tasks, GET /tasks/:userId, PUT /tasks/:id/status
// Flujo de estado: pending -> in_progress -> done. :contentReference[oaicite:3]{index=3}

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión PG: Render requiere SSL
const dbUrl = process.env.DATABASE_URL;
const needSSL =
  process.env.PGSSLMODE === 'require' ||
  (dbUrl && dbUrl.includes('render.com'));

const pool = new Pool({
  connectionString: dbUrl,
  ssl: needSSL ? { rejectUnauthorized: false } : false
});

// Utilidad: siguiente estado
const nextStatus = (current) => {
  if (current === 'pending') return 'in_progress';
  if (current === 'in_progress') return 'done';
  return 'done';
};

// Healthcheck opcional (no altera requisitos del PDF)
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * 1) POST /users/register – registrar un usuario nuevo (email único)
 * Body: { name, email, password }
 * Respuesta: { id, name, email }
 */
app.post('/users/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email y password son requeridos' });
    }

    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rowCount > 0) {
      return res.status(409).json({ error: 'Email ya registrado' });
    }

    const hash = await bcrypt.hash(password, 10);
    const ins = await pool.query(
      'INSERT INTO users(name,email,password) VALUES ($1,$2,$3) RETURNING id,name,email',
      [name, email, hash]
    );
    res.status(201).json(ins.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

/**
 * 2) POST /users/login – validar credenciales
 * Body: { email, password }
 * Respuesta: { id, name, email }
 */
app.post('/users/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email y password son requeridos' });
    }
    const q = await pool.query('SELECT id,name,email,password FROM users WHERE email=$1', [email]);
    if (q.rowCount === 0) return res.status(401).json({ error: 'Credenciales inválidas' });

    const user = q.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

/**
 * 3) POST /tasks – crear tarea asociada a usuario
 * Body: { user_id, title, description }
 * Respuesta: tarea creada
 */
app.post('/tasks', async (req, res) => {
  try {
    const { user_id, title, description } = req.body || {};
    if (!user_id || !title) {
      return res.status(400).json({ error: 'user_id y title son requeridos' });
    }
    const ins = await pool.query(
      `INSERT INTO tasks(user_id,title,description)
       VALUES ($1,$2,$3)
       RETURNING id,user_id,title,description,status,created_at`,
      [user_id, title, description || null]
    );
    res.status(201).json(ins.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al crear tarea' });
  }
});

/**
 * 4) GET /tasks/:userId – listar tareas de un usuario
 * Respuesta: array de tareas
 */
app.get('/tasks/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ error: 'userId inválido' });

    const q = await pool.query(
      `SELECT id,user_id,title,description,status,created_at
       FROM tasks WHERE user_id=$1
       ORDER BY created_at DESC`,
      [userId]
    );
    res.json(q.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al listar tareas' });
  }
});

/**
 * 5) PUT /tasks/:id/status – avanzar estado (pending → in_progress → done)
 * Respuesta: tarea actualizada
 */
app.put('/tasks/:id/status', async (req, res) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });

    await client.query('BEGIN');
    const cur = await client.query('SELECT id,user_id,status FROM tasks WHERE id=$1 FOR UPDATE', [id]);
    if (cur.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const row = cur.rows[0];
    const newStatus = nextStatus(row.status);

    // Actualiza tarea
    const upd = await client.query(
      `UPDATE tasks SET status=$1 WHERE id=$2
       RETURNING id,user_id,title,description,status,created_at`,
      [newStatus, id]
    );

    // Historial
    await client.query(
      `INSERT INTO task_status_history(task_id,old_status,new_status,changed_by)
       VALUES ($1,$2,$3,$4)`,
      [id, row.status, newStatus, row.user_id]
    );

    await client.query('COMMIT');
    res.json(upd.rows[0]);
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar estado' });
  } finally {
    client.release();
  }
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[API] listening on port ${PORT}`);
});
