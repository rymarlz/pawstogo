<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // updateOrCreate para que si ya existe el admin, ACTUALICE la contraseña
   User::updateOrCreate(
  ['email' => 'admin@connyvet.test'],
  [
    'name' => 'Admin ConnyVet',
    'password' => 'admin1234', // <-- texto plano (mutator la hashea)
    'role' => 'admin',
    'is_active' => true,
    'status' => 'active',
  ]
);


    }
}
