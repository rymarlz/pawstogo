<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Vaccine;

class VaccinesSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            [
                'name' => 'Óctuple Canina',
                'species' => 'perro',
                'manufacturer' => 'DemoLab',
                'short_description' => 'Vacuna polivalente canina',
                'default_dose_ml' => 1.0,
                'route' => 'subcutánea',
                'default_interval_days' => 365,
                'is_core' => true,
                'active' => true,
            ],
            [
                'name' => 'Antirrábica',
                'species' => 'perro',
                'manufacturer' => 'DemoLab',
                'short_description' => 'Rabia',
                'default_dose_ml' => 1.0,
                'route' => 'subcutánea',
                'default_interval_days' => 365,
                'is_core' => true,
                'active' => true,
            ],
            [
                'name' => 'Triple Felina',
                'species' => 'gato',
                'manufacturer' => 'CatVax',
                'short_description' => 'Polivalente felina',
                'default_dose_ml' => 1.0,
                'route' => 'subcutánea',
                'default_interval_days' => 365,
                'is_core' => true,
                'active' => true,
            ],
        ];

        foreach ($items as $v) {
            Vaccine::updateOrCreate(
                ['name' => $v['name'], 'species' => $v['species']],
                $v
            );
        }
    }
}
