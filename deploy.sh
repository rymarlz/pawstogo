#!/bin/bash

# Script de despliegue para ConnyVet (DigitalOcean)
# Uso: ./deploy.sh
# Referencia servidor/datos: OCEAN_REFERENCIA.md

set -e  # Salir si hay algún error

echo "🚀 Iniciando despliegue de ConnyVet..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -d "backend_api/connyvet_api" ] || [ ! -d "front/connyvet-frontend" ]; then
    echo -e "${RED}❌ Error: Este script debe ejecutarse desde la raíz del proyecto${NC}"
    exit 1
fi

# 1. Actualizar código desde Git
echo -e "${YELLOW}📥 Actualizando código desde Git...${NC}"
git pull origin main

# 2. Backend - Instalar dependencias y optimizar
echo -e "${YELLOW}📦 Configurando backend...${NC}"
cd backend_api/connyvet_api

# Instalar dependencias de Composer
composer install --optimize-autoloader --no-dev

# Ejecutar migraciones
php artisan migrate --force

# Enlace simbólico para que /storage sirva las fotos (pacientes, etc.)
php artisan storage:link 2>/dev/null || true

# Limpiar y cachear configuraciones
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear

php artisan config:cache
php artisan route:cache
php artisan view:cache

# 3. Frontend - Construir para producción
echo -e "${YELLOW}🎨 Construyendo frontend...${NC}"
cd ../../front/connyvet-frontend

# Instalar dependencias
npm install

# Construir para producción
npm run build

# 4. Reiniciar servicios
echo -e "${YELLOW}🔄 Reiniciando servicios...${NC}"
sudo systemctl restart php8.2-fpm
if command -v supervisorctl &>/dev/null; then
  sudo supervisorctl restart connyvet-worker:*
else
  echo -e "${YELLOW}⚠️  Supervisor no instalado; workers no reiniciados. Si usas colas: apt install supervisor${NC}"
fi

echo -e "${GREEN}✅ Despliegue completado exitosamente!${NC}"
