# 🚀 Guía Completa de Despliegue - ConnyVet en DigitalOcean

## 📋 Índice
1. [Preparar el proyecto para Git](#1-preparar-el-proyecto-para-git)
2. [Subir a GitHub/GitLab](#2-subir-a-githubgitlab)
3. [Configurar la instancia de DigitalOcean](#3-configurar-la-instancia-de-digitalocean)
4. [Instalar dependencias del servidor](#4-instalar-dependencias-del-servidor)
5. [Configurar MySQL](#5-configurar-mysql)
6. [Configurar PHP y Composer](#6-configurar-php-y-composer)
7. [Configurar Node.js y NPM](#7-configurar-nodejs-y-npm)
8. [Clonar y configurar el proyecto](#8-clonar-y-configurar-el-proyecto)
9. [Configurar Nginx](#9-configurar-nginx)
10. [Configurar SSL con Let's Encrypt](#10-configurar-ssl-con-lets-encrypt)
11. [Configurar Supervisor para colas](#11-configurar-supervisor-para-colas)
12. [Verificación final](#12-verificación-final)

---

## 1. Preparar el proyecto para Git

### 1.1 Crear .gitignore en la raíz del proyecto

```bash
cd ~/Escritorio/proyectos/proyectos/sconnyvet_sistema/finalsistem_connyvet
```

Crea un archivo `.gitignore` en la raíz con este contenido:

```gitignore
# Archivos de entorno
.env
.env.*
!.env.example

# Node modules
node_modules/
**/node_modules/

# Vendor (Composer)
vendor/
**/vendor/

# Build files
dist/
build/
**/dist/
**/build/

# Logs
*.log
logs/
**/logs/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Laravel específico
/storage/*.key
/storage/pail
/public/storage
/public/hot
/public/build
/bootstrap/cache/*
!bootstrap/cache/.gitignore

# Archivos temporales
*.zip
*.bak
```

### 1.2 Verificar que .env no se suba a Git

```bash
# Verificar que .env está en .gitignore
git check-ignore .env backend_api/connyvet_api/.env front/connyvet-frontend/.env
```

### 1.3 Crear archivos .env.example si no existen

Asegúrate de tener `.env.example` en ambos proyectos (backend y frontend) con valores de ejemplo.

---

## 2. Subir a GitHub/GitLab

### 2.1 Inicializar Git (si no está inicializado)

```bash
cd ~/Escritorio/proyectos/proyectos/sconnyvet_sistema/finalsistem_connyvet

# Verificar si ya existe git
ls -la .git

# Si no existe, inicializar
git init
```

### 2.2 Agregar archivos al staging

```bash
# Ver qué archivos se van a agregar
git status

# Agregar todos los archivos (excepto los del .gitignore)
git add .

# Verificar qué se agregó
git status
```

### 2.3 Crear commit inicial

```bash
git commit -m "Initial commit: ConnyVet sistema completo"
```

### 2.4 Crear repositorio en GitHub/GitLab

1. Ve a GitHub.com o GitLab.com
2. Crea un nuevo repositorio (público o privado)
3. **NO** inicialices con README, .gitignore o licencia
4. Copia la URL del repositorio (ej: `https://github.com/tu-usuario/connyvet.git`)

### 2.5 Conectar y subir

```bash
# Agregar el repositorio remoto
git remote add origin https://github.com/tu-usuario/connyvet.git

# Cambiar a main si es necesario
git branch -M main

# Subir el código
git push -u origin main
```

---

## 3. Configurar la instancia de DigitalOcean

### 3.1 Conectarte a tu servidor

```bash
# Reemplaza TU_IP con la IP de tu droplet
ssh root@TU_IP

# O si usas clave SSH
ssh -i ~/.ssh/tu_clave root@TU_IP
```

### 3.2 Actualizar el sistema

```bash
# Ubuntu/Debian
apt update && apt upgrade -y

# Reiniciar si es necesario
reboot
```

### 3.3 Crear usuario no-root (recomendado)

```bash
# Crear usuario
adduser deploy
usermod -aG sudo deploy

# Configurar SSH para el nuevo usuario
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Cambiar al usuario deploy
su - deploy
```

---

## 4. Instalar dependencias del servidor

### 4.1 Instalar Nginx

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Verificar estado
sudo systemctl status nginx
```

### 4.2 Instalar MySQL

```bash
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql

# Configurar seguridad (ejecutar y seguir las instrucciones)
sudo mysql_secure_installation

# Crear base de datos y usuario
sudo mysql -u root -p
```

Dentro de MySQL:

```sql
CREATE DATABASE connyvet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'connyvet'@'localhost' IDENTIFIED BY 'TU_PASSWORD_SEGURO_AQUI';
GRANT ALL PRIVILEGES ON connyvet.* TO 'connyvet'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4.3 Instalar PHP 8.2 y extensiones

```bash
# Agregar repositorio de PHP
sudo apt install software-properties-common -y
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

# Instalar PHP 8.2 y extensiones necesarias
sudo apt install php8.2-fpm php8.2-cli php8.2-common php8.2-mysql php8.2-zip php8.2-gd php8.2-mbstring php8.2-curl php8.2-xml php8.2-bcmath php8.2-intl php8.2-redis -y

# Verificar instalación
php -v
```

### 4.4 Instalar Composer

```bash
cd ~
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer

# Verificar
composer --version
```

### 4.5 Instalar Node.js 20.x y NPM

```bash
# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar
node -v
npm -v
```

---

## 5. Configurar MySQL

### 5.1 Verificar configuración

```bash
sudo mysql -u root -p
```

```sql
SHOW DATABASES;
SELECT user, host FROM mysql.user;
EXIT;
```

---

## 6. Configurar PHP y Composer

### 6.1 Configurar PHP-FPM

```bash
# Editar configuración de PHP-FPM
sudo nano /etc/php/8.2/fpm/php.ini
```

Busca y modifica:

```ini
upload_max_filesize = 20M
post_max_size = 20M
memory_limit = 256M
max_execution_time = 300
```

```bash
# Reiniciar PHP-FPM
sudo systemctl restart php8.2-fpm
sudo systemctl enable php8.2-fpm
```

---

## 7. Configurar Node.js y NPM

Ya está instalado en el paso 4.5. Verificar:

```bash
node -v  # Debe mostrar v20.x.x
npm -v   # Debe mostrar 10.x.x
```

---

## 8. Clonar y configurar el proyecto

### 8.1 Crear directorio para la aplicación

```bash
# Crear directorio
sudo mkdir -p /var/www/connyvet
sudo chown -R deploy:deploy /var/www/connyvet
cd /var/www/connyvet
```

### 8.2 Clonar el repositorio

```bash
# Clonar tu repositorio
git clone https://github.com/tu-usuario/connyvet.git .

# O si es privado, usar SSH
# git clone git@github.com:tu-usuario/connyvet.git .
```

### 8.3 Configurar el Backend (Laravel)

```bash
cd /var/www/connyvet/backend_api/connyvet_api

# Instalar dependencias de Composer
composer install --optimize-autoloader --no-dev

# Copiar archivo de entorno
cp .env.example .env

# Generar clave de aplicación
php artisan key:generate
```

### 8.4 Configurar .env del backend

```bash
nano .env
```

Configura estos valores:

```env
APP_NAME=ConnyVet
APP_ENV=production
APP_KEY=base64:... (ya generado)
APP_DEBUG=false
APP_URL=https://tu-dominio.com

APP_LOCALE=es
APP_FALLBACK_LOCALE=es

LOG_CHANNEL=stack
LOG_LEVEL=error

# Base de datos
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=connyvet
DB_USERNAME=connyvet
DB_PASSWORD=TU_PASSWORD_SEGURO_AQUI

# Session / Cache
SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=database

# Storage
FILESYSTEM_DISK=public

# Frontend URL
FRONTEND_URL=https://tu-dominio.com

# Webpay (configurar con tus credenciales de producción)
WEBPAY_ENV=production
WEBPAY_COMMERCE_CODE=TU_CODIGO_COMERCIO
WEBPAY_API_KEY=TU_API_KEY
```

### 8.5 Ejecutar migraciones y seeders

```bash
# Ejecutar migraciones
php artisan migrate --force

# Ejecutar seeders (si tienes datos iniciales)
php artisan db:seed --force

# Crear enlace simbólico para storage
php artisan storage:link

# Optimizar Laravel
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 8.6 Configurar permisos

```bash
# Dar permisos a storage y bootstrap/cache
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

### 8.7 Configurar el Frontend

```bash
cd /var/www/connyvet/front/connyvet-frontend

# Instalar dependencias
npm install

# Construir para producción
npm run build

# El resultado estará en /var/www/connyvet/front/connyvet-frontend/dist
```

---

## 9. Configurar Nginx

### 9.1 Crear configuración para el Backend

```bash
sudo nano /etc/nginx/sites-available/connyvet-backend
```

Contenido:

```nginx
server {
    listen 80;
    server_name api.tu-dominio.com;  # Cambiar por tu dominio o IP
    
    root /var/www/connyvet/backend_api/connyvet_api/public;
    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    # Headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 9.2 Crear configuración para el Frontend

```bash
sudo nano /etc/nginx/sites-available/connyvet-frontend
```

Contenido:

```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;  # Cambiar por tu dominio
    
    root /var/www/connyvet/front/connyvet-frontend/dist;
    index index.html;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (opcional, si quieres servir desde el mismo dominio)
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 9.3 Habilitar sitios

```bash
# Crear enlaces simbólicos
sudo ln -s /etc/nginx/sites-available/connyvet-backend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/connyvet-frontend /etc/nginx/sites-enabled/

# Eliminar sitio por defecto (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## 10. Configurar SSL con Let's Encrypt

### 10.1 Instalar Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 10.2 Obtener certificados SSL

```bash
# Para el backend
sudo certbot --nginx -d api.tu-dominio.com

# Para el frontend
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# Seguir las instrucciones y responder las preguntas
```

### 10.3 Renovación automática

Certbot configura la renovación automática. Verificar:

```bash
sudo certbot renew --dry-run
```

---

## 11. Configurar Supervisor para colas

### 11.1 Instalar Supervisor

```bash
sudo apt install supervisor -y
```

### 11.2 Crear configuración para colas de Laravel

```bash
sudo nano /etc/supervisor/conf.d/connyvet-worker.conf
```

Contenido:

```ini
[program:connyvet-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/connyvet/backend_api/connyvet_api/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/connyvet/backend_api/connyvet_api/storage/logs/worker.log
stopwaitsecs=3600
```

### 11.3 Activar Supervisor

```bash
# Recargar configuración
sudo supervisorctl reread
sudo supervisorctl update

# Iniciar worker
sudo supervisorctl start connyvet-worker:*

# Verificar estado
sudo supervisorctl status
```

---

## 12. Verificación final

### 12.1 Verificar servicios

```bash
# Verificar que todos los servicios estén corriendo
sudo systemctl status nginx
sudo systemctl status mysql
sudo systemctl status php8.2-fpm
sudo systemctl status supervisor
```

### 12.2 Probar endpoints

```bash
# Probar API
curl https://api.tu-dominio.com/api/v1/ping

# Debe responder con JSON
```

### 12.3 Verificar logs

```bash
# Logs de Nginx
sudo tail -f /var/log/nginx/error.log

# Logs de Laravel
tail -f /var/www/connyvet/backend_api/connyvet_api/storage/logs/laravel.log

# Logs de Supervisor
sudo tail -f /var/www/connyvet/backend_api/connyvet_api/storage/logs/worker.log
```

---

## 🔧 Comandos útiles para mantenimiento

### Actualizar el código

```bash
cd /var/www/connyvet
git pull origin main

# Backend
cd backend_api/connyvet_api
composer install --optimize-autoloader --no-dev
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Frontend
cd ../../front/connyvet-frontend
npm install
npm run build

# Reiniciar servicios
sudo systemctl restart php8.2-fpm
sudo supervisorctl restart connyvet-worker:*
```

### Ver logs en tiempo real

```bash
# Laravel
tail -f /var/www/connyvet/backend_api/connyvet_api/storage/logs/laravel.log

# Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PHP-FPM
sudo tail -f /var/log/php8.2-fpm.log
```

### Reiniciar servicios

```bash
sudo systemctl restart nginx
sudo systemctl restart php8.2-fpm
sudo systemctl restart mysql
sudo supervisorctl restart connyvet-worker:*
```

---

## 📝 Notas importantes

1. **Seguridad**: 
   - Cambia todas las contraseñas por defecto
   - Configura firewall (UFW)
   - Mantén el sistema actualizado

2. **Backups**:
   - Configura backups automáticos de la base de datos
   - Haz backup del directorio `/var/www/connyvet` regularmente

3. **Monitoreo**:
   - Considera usar herramientas como Laravel Telescope (solo en desarrollo)
   - Configura alertas de monitoreo

4. **Dominio**:
   - Asegúrate de que tus dominios apunten a la IP de tu servidor
   - Configura registros DNS A y AAAA

---

## 🆘 Solución de problemas comunes

### Error 502 Bad Gateway
```bash
# Verificar PHP-FPM
sudo systemctl status php8.2-fpm
sudo systemctl restart php8.2-fpm
```

### Error de permisos
```bash
sudo chown -R www-data:www-data /var/www/connyvet/backend_api/connyvet_api/storage
sudo chmod -R 775 /var/www/connyvet/backend_api/connyvet_api/storage
```

### Error de base de datos
```bash
# Verificar conexión
mysql -u connyvet -p connyvet
# Verificar que el usuario tenga permisos
```

---

¡Listo! Tu aplicación debería estar funcionando en producción. 🎉
