#!/bin/bash

# Script de configuración inicial del servidor
# Ejecutar en la instancia de DigitalOcean como root o con sudo
# Uso: sudo bash setup-server.sh

set -e

echo "🔧 Configurando servidor para ConnyVet..."

# Actualizar sistema
echo "📦 Actualizando sistema..."
apt update && apt upgrade -y

# Instalar Nginx
echo "🌐 Instalando Nginx..."
apt install nginx -y
systemctl start nginx
systemctl enable nginx

# Instalar MySQL
echo "🗄️ Instalando MySQL..."
apt install mysql-server -y
systemctl start mysql
systemctl enable mysql

# Instalar PHP 8.2
echo "🐘 Instalando PHP 8.2..."
apt install software-properties-common -y
add-apt-repository ppa:ondrej/php -y
apt update
apt install php8.2-fpm php8.2-cli php8.2-common php8.2-mysql php8.2-zip php8.2-gd php8.2-mbstring php8.2-curl php8.2-xml php8.2-bcmath php8.2-intl php8.2-redis -y

# Instalar Composer
echo "📦 Instalando Composer..."
curl -sS https://getcomposer.org/installer | php
mv composer.phar /usr/local/bin/composer
chmod +x /usr/local/bin/composer

# Instalar Node.js 20.x
echo "📦 Instalando Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Instalar Supervisor
echo "👷 Instalando Supervisor..."
apt install supervisor -y

# Instalar Certbot
echo "🔒 Instalando Certbot..."
apt install certbot python3-certbot-nginx -y

# Configurar PHP
echo "⚙️ Configurando PHP..."
sed -i 's/upload_max_filesize = 2M/upload_max_filesize = 20M/' /etc/php/8.2/fpm/php.ini
sed -i 's/post_max_size = 8M/post_max_size = 20M/' /etc/php/8.2/fpm/php.ini
sed -i 's/memory_limit = 128M/memory_limit = 256M/' /etc/php/8.2/fpm/php.ini
systemctl restart php8.2-fpm

# Crear usuario deploy si no existe
if ! id "deploy" &>/dev/null; then
    echo "👤 Creando usuario deploy..."
    adduser --disabled-password --gecos "" deploy
    usermod -aG sudo deploy
    mkdir -p /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
fi

# Crear directorio para la aplicación
echo "📁 Creando directorios..."
mkdir -p /var/www/connyvet
chown -R deploy:deploy /var/www/connyvet

echo "✅ Configuración del servidor completada!"
echo ""
echo "📝 Próximos pasos:"
echo "1. Configurar MySQL (mysql_secure_installation)"
echo "2. Crear base de datos y usuario MySQL"
echo "3. Clonar el repositorio en /var/www/connyvet"
echo "4. Configurar archivos .env"
echo "5. Ejecutar migraciones"
echo "6. Configurar Nginx"
echo "7. Configurar SSL con Certbot"
