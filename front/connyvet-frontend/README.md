# 🐾 ConnyVet – Veterinary Management System

Sistema de gestión veterinaria desarrollado con **Laravel + React**.

## 🚀 Funcionalidades
- Autenticación y roles (admin / staff)
- Gestión de tutores y pacientes
- Ficha clínica unificada
- Consultas veterinarias
- Catálogo y aplicación de vacunas
- Hospitalizaciones
- Módulo de pagos (en desarrollo)

## 🛠️ Stack tecnológico
### Backend
- Laravel 11
- Sanctum (auth)
- SQLite / MySQL
- REST API v1

### Frontend
- React + Vite
- TypeScript
- TailwindCSS
- React Router

## 📦 Instalación local

### Backend
```bash
cd connyvet-api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve





### Backend
cd connyvet-frontend
npm install
npm run dev