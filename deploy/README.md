# Configuraciones de despliegue

## Supervisor (worker de colas Laravel)

**Importante:** El directorio del `stdout_logfile` debe existir antes de `supervisorctl reread`. Laravel suele tener `storage/logs/`; si no existe: `mkdir -p backend_api/connyvet_api/storage/logs`.

### En el servidor (DigitalOcean)

1. Actualizar código para tener la carpeta `deploy/`:
   ```bash
   cd /var/www/connyvet
   git pull origin main
   ```
2. Asegurar que exista el directorio de logs:
   ```bash
   mkdir -p /var/www/connyvet/backend_api/connyvet_api/storage/logs
   sudo chown -R www-data:www-data /var/www/connyvet/backend_api/connyvet_api/storage
   ```
3. Copiar config y activar:
   ```bash
   sudo cp /var/www/connyvet/deploy/connyvet-worker.supervisor.conf /etc/supervisor/conf.d/connyvet-worker.conf
   sudo supervisorctl reread
   sudo supervisorctl update
   sudo supervisorctl start connyvet-worker:*
   sudo supervisorctl status
   ```

### En local (Pop!_OS / Linux)

- El archivo del repo usa rutas de **servidor** (`/var/www/connyvet`). En local debes crear tu propio config con la ruta de tu proyecto, por ejemplo:
  - `command=php /home/gps/Escritorio/proyectos/proyectos/sconnyvet_sistema/finalsistem_connyvet/backend_api/connyvet_api/artisan queue:work ...`
  - `stdout_logfile=/home/gps/.../backend_api/connyvet_api/storage/logs/worker.log`
  - `user=gps`
- Asegurar que exista `storage/logs`: `mkdir -p backend_api/connyvet_api/storage/logs`
