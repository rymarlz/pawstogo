#!/bin/bash
# Script para aplicar correcciones automáticas a los límites de subida

set -e

echo "=== APLICANDO CORRECCIONES A LÍMITES DE SUBIDA ==="
echo ""

# 1. Obtener ruta del php.ini
PHP_INI=$(php --ini | grep "Loaded Configuration File" | awk '{print $4}')
PHP_FPM_INI="/etc/php/8.2/fpm/php.ini"

echo "1. Configurando PHP CLI ($PHP_INI)..."

# Backup
sudo cp "$PHP_INI" "${PHP_INI}.backup.$(date +%Y%m%d_%H%M%S)"

# Aplicar cambios usando sed
sudo sed -i 's/^upload_max_filesize = .*/upload_max_filesize = 20M/' "$PHP_INI"
sudo sed -i 's/^post_max_size = .*/post_max_size = 25M/' "$PHP_INI"
sudo sed -i 's/^max_file_uploads = .*/max_file_uploads = 20/' "$PHP_INI"

# Si no existen las líneas, agregarlas
grep -q "^upload_max_filesize" "$PHP_INI" || echo "upload_max_filesize = 20M" | sudo tee -a "$PHP_INI" > /dev/null
grep -q "^post_max_size" "$PHP_INI" || echo "post_max_size = 25M" | sudo tee -a "$PHP_INI" > /dev/null
grep -q "^max_file_uploads" "$PHP_INI" || echo "max_file_uploads = 20" | sudo tee -a "$PHP_INI" > /dev/null

echo "   ✓ PHP CLI configurado"
echo ""

echo "2. Configurando PHP-FPM ($PHP_FPM_INI)..."

# Backup
sudo cp "$PHP_FPM_INI" "${PHP_FPM_INI}.backup.$(date +%Y%m%d_%H%M%S)"

# Aplicar cambios
sudo sed -i 's/^upload_max_filesize = .*/upload_max_filesize = 20M/' "$PHP_FPM_INI"
sudo sed -i 's/^post_max_size = .*/post_max_size = 25M/' "$PHP_FPM_INI"
sudo sed -i 's/^max_file_uploads = .*/max_file_uploads = 20/' "$PHP_FPM_INI"

# Si no existen las líneas, agregarlas
grep -q "^upload_max_filesize" "$PHP_FPM_INI" || echo "upload_max_filesize = 20M" | sudo tee -a "$PHP_FPM_INI" > /dev/null
grep -q "^post_max_size" "$PHP_FPM_INI" || echo "post_max_size = 25M" | sudo tee -a "$PHP_FPM_INI" > /dev/null
grep -q "^max_file_uploads" "$PHP_FPM_INI" || echo "max_file_uploads = 20" | sudo tee -a "$PHP_FPM_INI" > /dev/null

echo "   ✓ PHP-FPM configurado"
echo ""

echo "3. Configurando Nginx..."

# Configurar backend
BACKEND_NGINX="/etc/nginx/sites-available/connyvet-backend"
if [ -f "$BACKEND_NGINX" ]; then
    # Backup
    sudo cp "$BACKEND_NGINX" "${BACKEND_NGINX}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Agregar client_max_body_size si no existe
    if ! grep -q "client_max_body_size" "$BACKEND_NGINX"; then
        # Agregar después de la línea "server {" o "listen"
        sudo sed -i '/^server {/a\    client_max_body_size 25M;' "$BACKEND_NGINX"
        echo "   ✓ Backend Nginx configurado"
    else
        # Actualizar si ya existe
        sudo sed -i 's/client_max_body_size .*/client_max_body_size 25M;/' "$BACKEND_NGINX"
        echo "   ✓ Backend Nginx actualizado"
    fi
else
    echo "   ⚠ Archivo $BACKEND_NGINX no encontrado"
fi

# Configurar frontend
FRONTEND_NGINX="/etc/nginx/sites-available/connyvet-frontend"
if [ -f "$FRONTEND_NGINX" ]; then
    # Backup
    sudo cp "$FRONTEND_NGINX" "${FRONTEND_NGINX}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Agregar client_max_body_size si no existe
    if ! grep -q "client_max_body_size" "$FRONTEND_NGINX"; then
        sudo sed -i '/^server {/a\    client_max_body_size 25M;' "$FRONTEND_NGINX"
        echo "   ✓ Frontend Nginx configurado"
    else
        sudo sed -i 's/client_max_body_size .*/client_max_body_size 25M;/' "$FRONTEND_NGINX"
        echo "   ✓ Frontend Nginx actualizado"
    fi
else
    echo "   ⚠ Archivo $FRONTEND_NGINX no encontrado"
fi

echo ""

echo "4. Verificando configuración de Nginx..."
sudo nginx -t
echo ""

echo "5. Reiniciando servicios..."
sudo systemctl restart php8.2-fpm
sudo systemctl restart nginx
echo ""

echo "6. Verificando cambios aplicados..."
echo ""
echo "PHP CLI:"
php -i | grep -E "(upload_max_filesize|post_max_size|max_file_uploads)" | head -3
echo ""
echo "Nginx:"
grep "client_max_body_size" /etc/nginx/sites-available/connyvet-* 2>/dev/null || echo "No encontrado"
echo ""

echo "=== ✓ CORRECCIONES APLICADAS ==="
echo ""
echo "Ahora intenta subir los archivos nuevamente."
echo "Si el problema persiste, revisa los logs:"
echo "  tail -f /var/www/connyvet/backend_api/connyvet_api/storage/logs/laravel.log"
