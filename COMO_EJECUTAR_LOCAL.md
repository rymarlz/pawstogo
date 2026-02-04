# Cómo ejecutar todo en local

## Requisitos

- **PHP 8.2+** (para el backend)
- **Composer** (dependencias PHP)
- **Node.js 18+** y **npm** (para el frontend)
- **SQLite** (o MySQL si prefieres; por defecto el proyecto usa SQLite)

---

## 1. Backend (API Laravel)

Abre una terminal y ejecuta:

```bash
cd backend_api/connyvet_api
```

Si es la primera vez (o no tienes `.env` ni dependencias):

```bash
# Copiar entorno y generar clave
cp .env.example .env
php artisan key:generate

# Dependencias PHP
composer install

# Base de datos: crear archivo SQLite y migrar
touch database/database.sqlite
# En .env asegúrate: DB_CONNECTION=sqlite y DB_DATABASE con la ruta a database/database.sqlite
php artisan migrate
```

Levantar el servidor:

```bash
php artisan serve
```

El backend quedará en **http://localhost:8000**. La API está en `http://localhost:8000/api/v1`.

---

## 2. Frontend web (React + Vite)

Abre **otra terminal** (deja el backend corriendo) y ejecuta:

```bash
cd front/connyvet-frontend
```

Si es la primera vez:

```bash
npm install
```

Levantar el frontend:

```bash
npm run dev
```

La app web quedará en **http://localhost:5173** (o el puerto que indique Vite).

El front ya está configurado para usar la API en `http://127.0.0.1:8000/api/v1` (archivo `.env` en `front/connyvet-frontend`).

---

## 3. Ver los cambios

1. Con **backend** y **frontend** corriendo, abre en el navegador: **http://localhost:5173**
2. Inicia sesión en el dashboard.
3. Ve a **Pacientes** y entra al detalle de un paciente (ficha principal).
4. Ahí deberías ver la **imagen del paciente** (la misma que en el listado) junto al nombre y datos.

---

## Resumen rápido (ya con .env y migraciones hechas)

**Terminal 1 – Backend:**

```bash
cd backend_api/connyvet_api
php artisan serve
```

**Terminal 2 – Frontend:**

```bash
cd front/connyvet-frontend
npm run dev
```

Luego abre **http://localhost:5173** en el navegador.
