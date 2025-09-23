-- SQL schema alineado al PDF + historial de estado (tu requerimiento)
-- PDF exige tablas: users, tasks; campos y endpoints exactos. :contentReference[oaicite:2]{index=2}

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

-- TASKS
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

-- TASK STATUS HISTORY (extra pedido por ti)
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

-- Opcional: vista rápida del último estado (no requerida; solo ayudas de depuración)
-- CREATE VIEW v_tasks_latest AS
-- SELECT t.*, u.name AS user_name, u.email
-- FROM tasks t
-- JOIN users u ON u.id = t.user_id;
