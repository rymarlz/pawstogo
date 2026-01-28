<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Patient;
use App\Models\Hospitalization;
use Carbon\Carbon;

class HospitalizationsSeeder extends Seeder
{
    public function run(): void
    {
        $p = Patient::orderBy('id')->first();
        if (!$p) return;

        Hospitalization::create([
            'patient_id' => $p->id,
            'tutor_id' => $p->tutor_id,
            'admission_date' => Carbon::now()->subDays(2)->toDateString(),
            'discharge_date' => null,
            'status' => 'active',
            'bed_number' => 'Box 1',
            'notes' => 'Hospitalización demo.',
        ]);
    }
}
