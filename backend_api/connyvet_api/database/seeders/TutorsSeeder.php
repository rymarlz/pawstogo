<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Tutor;

class TutorsSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            [
                'nombres' => 'Gonzalo',
                'apellidos' => 'Pizarro',
                'rut' => '12.345.678-5',
                'email' => 'gonzalo.tutor@demo.cl',
                'telefono_movil' => '+56911111111',
                'direccion' => 'Av. Demo 123',
                'comuna' => 'Santiago',
                'region' => 'RM',
                'active' => true,
            ],
            [
                'nombres' => 'Camila',
                'apellidos' => 'Rojas',
                'rut' => '19.222.333-4',
                'email' => 'camila.tutor@demo.cl',
                'telefono_movil' => '+56922222222',
                'direccion' => 'Calle Demo 456',
                'comuna' => 'Ñuñoa',
                'region' => 'RM',
                'active' => true,
            ],
            [
                'nombres' => 'Pedro',
                'apellidos' => 'Muñoz',
                'rut' => '16.777.888-9',
                'email' => 'pedro.tutor@demo.cl',
                'telefono_movil' => '+56933333333',
                'direccion' => 'Pasaje Demo 789',
                'comuna' => 'Maipú',
                'region' => 'RM',
                'active' => true,
            ],
        ];

        foreach ($items as $t) {
            Tutor::updateOrCreate(
                ['rut' => $t['rut']],
                $t
            );
        }
    }
}
