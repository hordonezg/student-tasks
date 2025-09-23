// Crea el esquema si no existe (idéntico a sql/db.sql).
// Se ejecuta antes de levantar la API.

require('dotenv').config();
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL;
const needSSL =
  process.env.PGSSLMODE === 'require' ||
  (dbUrl && dbUrl.includes('render.com'));

const pool = new Pool({
  connectionString: dbUrl,
  ssl: needSSL ? { rejectUnauthorized: false } : false,
});

const schemaSQL = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT tasks_status_check CHECK (status IN ('pending','in_progress','done'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

CREATE TABLE IF NOT EXISTS task_status_history (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  old_status VARCHAR(20) NOT NULL,
  new_status VARCHAR(20) NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  changed_by INTEGER REFERENCES users(id),
  CONSTRAINT tsh_status_values CHECK (
    old_status IN ('pending','in_progress','done')
    AND new_status IN ('pending','in_progress','done')
  )
);
`;

(async () => {
  try {
    if (!dbUrl) {
      console.log('[INIT-DB] No DATABASE_URL, skip');
      process.exit(0);
    }
    console.log('[INIT-DB] Applying schema...');
    await pool.query(schemaSQL);
    console.log('[INIT-DB] Done.');
    process.exit(0);
  } catch (err) {
    console.error('[INIT-DB] Error:', err.message);
    process.exit(1);
  }
})();
