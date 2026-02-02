# 🌊 ConnyVet — Despliegue en DigitalOcean

> **Referencia rápida:** este proyecto está desplegado en **DigitalOcean**. Aquí se documenta dónde está, cómo conectarse y qué datos usar para no depender de memoria ni buscar en muchos sitios.

---

## 📍 Dónde está la app

| Qué | Valor (completar / ver en servidor) |
|-----|-------------------------------------|
| **Proveedor** | DigitalOcean |
| **IP del Droplet** | `TU_IP_DROPLET` |
| **Dominio API** | `https://api.tu-dominio.com` |
| **Dominio Frontend** | `https://tu-dominio.com` |

---

## 🔐 Acceso SSH y servidor

| Dato | Valor (completar) |
|------|-------------------|
| **Usuario SSH** | `deploy` (o `root` si es inicial) |
| **Conectar** | `ssh deploy@TU_IP_DROPLET` |
| **Ruta del proyecto** | `/var/www/connyvet` |

---

## 🗄️ Base de datos (MySQL)

| Dato | Variable .env | Valor (completar en servidor) |
|------|----------------|-------------------------------|
| **Nombre BD** | `DB_DATABASE` | `connyvet` |
| **Usuario** | `DB_USERNAME` | `connyvet` |
| **Contraseña** | `DB_PASSWORD` | *(solo en .env del servidor, no subir a Git)* |

El `.env` real está en el servidor en:  
`/var/www/connyvet/backend_api/connyvet_api/.env`

---

## 📦 Composer en producción (Ocean)

En el servidor **siempre** instalar dependencias sin dev para menos tamaño y menos “ruido”:

```bash
composer install --optimize-autoloader --no-dev
```

- `--no-dev`: no instala paquetes de `require-dev` (PHPUnit, Faker, Sail, etc.) → menos espacio y menos riesgo.
- `--optimize-autoloader`: mejora el autoload en producción.

El script `deploy.sh` ya usa este comando. Si ejecutas Composer a mano en Ocean, usa el de arriba.

---

## 🚀 Cómo subir estos cambios a Ocean

### En tu máquina (local)

```bash
cd /home/gps/Escritorio/proyectos/proyectos/sconnyvet_sistema/finalsistem_connyvet

git add .
git status
git commit -m "Descripción de los cambios (ej: Fase 1-3 QA, Ocean referencia)"
git push origin main
```

### En el servidor (DigitalOcean)

```bash
ssh deploy@TU_IP_DROPLET

cd /var/www/connyvet
git pull origin main
./deploy.sh
```

`deploy.sh` hace: `git pull`, `composer install --no-dev`, migraciones, build del front, reinicio de PHP-FPM y workers.

---

## 📁 Archivos de despliegue en el repo

- `deploy.sh` — script de despliegue (pull + backend + front + restart).
- `GUIA_DESPLIEGUE_DIGITALOCEAN.md` — guía paso a paso.
- `RESUMEN_DESPLIEGUE.md` — resumen rápido.
- `backend_api/connyvet_api/.env.production.example` — plantilla de `.env` para producción (copiar a `.env` en el servidor y rellenar).

---

*Actualiza este archivo con los valores reales (IP, dominios, usuario SSH) cuando los tengas; no pongas contraseñas ni secrets aquí, solo referencias (ej. “ver .env en servidor”).*
