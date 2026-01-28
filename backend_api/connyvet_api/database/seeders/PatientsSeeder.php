<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Tutor;
use App\Models\Patient;

class PatientsSeeder extends Seeder
{
    public function run(): void
    {
        $tutors = Tutor::where('active', true)->orderBy('id')->get();
        if ($tutors->isEmpty()) return;

        $patients = [
            [
                'name' => 'Toby',
                'species' => 'perro',
                'breed' => 'Mestizo',
                'sex' => 'macho',
                'birth_date' => '2022-03-10',
                'color' => 'Café',
                'microchip' => 'CHIP-TOBY-001',
                'weight_kg' => 12.4,
                'sterilized' => true,
                'notes' => 'Paciente activo demo',
                'active' => true,
            ],
            [
                'name' => 'Luna',
                'species' => 'gato',
                'breed' => 'Europeo',
                'sex' => 'hembra',
                'birth_date' => '2021-08-22',
                'color' => 'Negro',
                'microchip' => 'CHIP-LUNA-002',
                'weight_kg' => 4.1,
                'sterilized' => true,
                'notes' => 'Control anual',
                'active' => true,
            ],
            [
                'name' => 'Rocky',
                'species' => 'perro',
                'breed' => 'Bulldog',
                'sex' => 'macho',
                'birth_date' => '2020-01-15',
                'color' => 'Blanco',
                'microchip' => 'CHIP-ROCKY-003',
                'weight_kg' => 18.9,
                'sterilized' => false,
                'notes' => null,
                'active' => true,
            ],
        ];

        $i = 0;
        foreach ($patients as $p) {
            $tutor = $tutors[$i % $tutors->count()];

            Patient::updateOrCreate(
                ['microchip' => $p['microchip']],
                array_merge($p, [
                    'tutor_id' => $tutor->id,
                    // legacy compat:
                    'tutor_name' => $tutor->name,
                    'tutor_email' => $tutor->email,
                    'tutor_phone' => $tutor->phone,
                ])
            );

            $i++;
        }
    }
}
