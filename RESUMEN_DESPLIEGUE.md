# 📋 Resumen Rápido - Despliegue ConnyVet

## 🚀 Pasos Rápidos

### 1️⃣ Subir a Git
```bash
cd ~/Escritorio/proyectos/proyectos/sconnyvet_sistema/finalsistem_connyvet
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/connyvet.git
git push -u origin main
```

### 2️⃣ En el Servidor (DigitalOcean)

#### Instalación inicial (solo primera vez)
```bash
# Conectarte al servidor
ssh root@TU_IP

# Ejecutar script de setup
wget https://raw.githubusercontent.com/tu-usuario/connyvet/main/setup-server.sh
sudo bash setup-server.sh

# Configurar MySQL
sudo mysql_secure_installation
sudo mysql -u root -p
```

Dentro de MySQL:
```sql
CREATE DATABASE connyvet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'connyvet'@'localhost' IDENTIFIED BY 'TU_PASSWORD_SEGURO';
GRANT ALL PRIVILEGES ON connyvet.* TO 'connyvet'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Clonar y configurar proyecto
```bash
# Crear usuario deploy (si no existe)
adduser deploy
usermod -aG sudo deploy

# Cambiar a usuario deploy
su - deploy

# Clonar repositorio
cd /var/www
sudo git clone https://github.com/tu-usuario/connyvet.git connyvet
sudo chown -R deploy:deploy /var/www/connyvet
cd /var/www/connyvet

# Configurar backend
cd backend_api/connyvet_api
composer install --optimize-autoloader --no-dev
cp .env.example .env
nano .env  # Configurar variables
php artisan key:generate
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Configurar frontend
cd ../../front/connyvet-frontend
npm install
npm run build

# Configurar permisos
sudo chown -R www-data:www-data /var/www/connyvet/backend_api/connyvet_api/storage
sudo chmod -R 775 /var/www/connyvet/backend_api/connyvet_api/storage
```

#### Configurar Nginx
```bash
# Ver archivos de configuración en la guía completa
sudo nano /etc/nginx/sites-available/connyvet-backend
sudo nano /etc/nginx/sites-available/connyvet-frontend

# Habilitar sitios
sudo ln -s /etc/nginx/sites-available/connyvet-backend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/connyvet-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Configurar SSL
```bash
sudo certbot --nginx -d api.tu-dominio.com
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

#### Configurar Supervisor (colas)
```bash
sudo nano /etc/supervisor/conf.d/connyvet-worker.conf
# Pegar configuración de la guía completa
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start connyvet-worker:*
```

### 3️⃣ Actualizaciones futuras
```bash
cd /var/www/connyvet
./deploy.sh
```

---

## 📁 Archivos Importantes

- `GUIA_DESPLIEGUE_DIGITALOCEAN.md` - Guía completa paso a paso
- `deploy.sh` - Script de despliegue automático
- `setup-server.sh` - Script de configuración inicial del servidor
- `backend_api/connyvet_api/.env.production.example` - Ejemplo de .env para producción

---

## ⚠️ Checklist antes de desplegar

- [ ] Archivo `.env` configurado con valores de producción
- [ ] `APP_DEBUG=false` en producción
- [ ] Base de datos creada y configurada
- [ ] Dominios apuntando a la IP del servidor
- [ ] Credenciales de Webpay de producción configuradas
- [ ] Permisos de storage configurados correctamente
- [ ] SSL configurado con Let's Encrypt
- [ ] Backups configurados

---

## 🔗 URLs importantes

- Backend API: `https://api.tu-dominio.com`
- Frontend: `https://tu-dominio.com`
- Endpoint de prueba: `https://api.tu-dominio.com/api/v1/ping`

---

Para más detalles, consulta `GUIA_DESPLIEGUE_DIGITALOCEAN.md`
