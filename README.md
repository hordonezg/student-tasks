# Student Tasks (Laboratorio de Desarrollo Web)

Alineado al PDF: endpoints, tablas y flujo de estado. Incluye `task_status_history` (historial). :contentReference[oaicite:4]{index=4}

## 1) Requisitos
- Node.js 20+
- Cuenta en Render
- Cuenta en GitHub (repo: `hordonezg/student-tasks`)
- PostgreSQL (Render DB Free o local)

## 2) Estructura
sql/db.sql
backend/index.js
backend/package.json
frontend/index.html
frontend/app.js
render.yaml


## 3) Local (opcional)
```bash
# Clonar o crear carpeta
mkdir student-tasks && cd student-tasks

# Crear archivos según este repo
# ...

# Instalar backend
cd backend
npm install
cd ..

# Crear DB local y aplicar script
# (si usas Docker u otro PG, ajusta)
createdb student_tasks_db
psql -d student_tasks_db -f sql/db.sql

# Exporta la URL
# Linux/Mac:
export DATABASE_URL="postgres://USER:PASS@localhost:5432/student_tasks_db"
export PGSSLMODE=disable

# Windows (PowerShell):
# $env:DATABASE_URL="postgres://USER:PASS@localhost:5432/student_tasks_db"
# $env:PGSSLMODE="disable"

# Levanta el backend
node backend/index.js
# http://localhost:3000

# Abre frontend/index.html con Live Server o un server estático
