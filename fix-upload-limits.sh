#!/bin/bash
# Script para diagnosticar y corregir límites de subida de archivos

echo "=== DIAGNÓSTICO DE LÍMITES DE SUBIDA ==="
echo ""

# 1. Verificar límites actuales de PHP
echo "1. Límites actuales de PHP:"
php -i | grep -E "(upload_max_filesize|post_max_size|max_file_uploads|memory_limit)" | head -4
echo ""

# 2. Verificar límites de Nginx
echo "2. Límites de Nginx (client_max_body_size):"
grep -r "client_max_body_size" /etc/nginx/ 2>/dev/null || echo "   No configurado (usando default: 1M)"
echo ""

# 3. Verificar configuración PHP-FPM
echo "3. Archivo de configuración PHP-FPM:"
PHP_INI=$(php --ini | grep "Loaded Configuration File" | awk '{print $4}')
echo "   PHP ini: $PHP_INI"
echo ""

# 4. Ver últimos errores en logs de Laravel
echo "4. Últimos errores en logs de Laravel:"
if [ -f /var/www/connyvet/backend_api/connyvet_api/storage/logs/laravel.log ]; then
    tail -30 /var/www/connyvet/backend_api/connyvet_api/storage/logs/laravel.log | grep -A 5 -B 5 -i "post\|upload\|size\|422" | tail -20
else
    echo "   Archivo de log no encontrado"
fi
echo ""

echo "=== SOLUCIÓN ==="
echo ""
echo "Para corregir los límites, ejecuta estos comandos en el servidor:"
echo ""
echo "# 1. Editar php.ini"
echo "sudo nano $PHP_INI"
echo ""
echo "# Buscar y cambiar estas líneas:"
echo "upload_max_filesize = 20M"
echo "post_max_size = 25M"
echo "max_file_uploads = 20"
echo "memory_limit = 256M"
echo ""
echo "# 2. Editar configuración PHP-FPM"
echo "sudo nano /etc/php/8.2/fpm/php.ini"
echo "# (Aplicar los mismos cambios)"
echo ""
echo "# 3. Agregar client_max_body_size a Nginx"
echo "sudo nano /etc/nginx/sites-available/connyvet-backend"
echo "# Agregar dentro del bloque server:"
echo "client_max_body_size 25M;"
echo ""
echo "sudo nano /etc/nginx/sites-available/connyvet-frontend"
echo "# Agregar dentro del bloque server:"
echo "client_max_body_size 25M;"
echo ""
echo "# 4. Reiniciar servicios"
echo "sudo systemctl restart php8.2-fpm"
echo "sudo systemctl restart nginx"
echo ""
echo "# 5. Verificar cambios"
echo "php -i | grep -E '(upload_max_filesize|post_max_size)'"
