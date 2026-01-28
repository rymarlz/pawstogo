<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class UsersSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@connyvet.test'],
            [
                'name' => 'Admin ConnyVet',
                'password' => 'admin1234', // <- texto plano (mutator lo hashea)
                'role' => User::ROLE_ADMIN,
                'is_active' => true,
                'status' => 'active',
                'locale' => 'es',
                'timezone' => 'America/Santiago',
            ]
        );

        User::updateOrCreate(
            ['email' => 'doctor@connyvet.test'],
            [
                'name' => 'Doctor Demo',
                'password' => 'doctor1234',
                'role' => User::ROLE_DOCTOR,
                'is_active' => true,
                'status' => 'active',
                'locale' => 'es',
                'timezone' => 'America/Santiago',
            ]
        );

        User::updateOrCreate(
            ['email' => 'asistente@connyvet.test'],
            [
                'name' => 'Asistente Demo',
                'password' => 'asistente1234',
                'role' => User::ROLE_ASISTENTE,
                'is_active' => true,
                'status' => 'active',
                'locale' => 'es',
                'timezone' => 'America/Santiago',
            ]
        );
    }
}
