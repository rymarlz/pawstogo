# Configuraciones de despliegue

## Supervisor (worker de colas Laravel)

### En el servidor (DigitalOcean)

- Usar `connyvet-worker.supervisor.conf` con ruta `/var/www/connyvet` y `user=www-data`.
- Copiar a `/etc/supervisor/conf.d/connyvet-worker.conf` y ejecutar:
  - `sudo supervisorctl reread`
  - `sudo supervisorctl update`
  - `sudo supervisorctl start connyvet-worker:*`

### En local (Pop!_OS / Linux)

- Crear un archivo con la **ruta de tu proyecto** y **tu usuario**. Ver instrucciones en OCEAN_REFERENCIA.md o más abajo.
