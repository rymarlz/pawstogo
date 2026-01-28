<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UsersSeeder::class,
            TutorsSeeder::class,
            PatientsSeeder::class,
            VaccinesSeeder::class,
            ConsultationsSeeder::class,
            VaccineApplicationsSeeder::class,
            HospitalizationsSeeder::class,
            PaymentsSeeder::class,
        ]);
    }
}
