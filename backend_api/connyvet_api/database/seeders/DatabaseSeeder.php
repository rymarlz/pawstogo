<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UsersSeeder::class,
            AdminUserSeeder::class,
            TutorsSeeder::class,
            TutorUsersSeeder::class,
            PatientsSeeder::class,
            VaccinesSeeder::class,
            ConsultationsSeeder::class,
            VaccineApplicationsSeeder::class,
            HospitalizationsSeeder::class,
            PaymentsSeeder::class,
        ]);
    }
}
