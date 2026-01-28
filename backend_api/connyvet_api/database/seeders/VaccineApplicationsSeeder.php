<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Patient;
use App\Models\Vaccine;
use App\Models\VaccineApplication;
use App\Models\Consultation;
use App\Models\User;
use Carbon\Carbon;

class VaccineApplicationsSeeder extends Seeder
{
    public function run(): void
    {
        $doctor = User::where('role', User::ROLE_DOCTOR)->first();
        $admin  = User::where('role', User::ROLE_ADMIN)->first();

        if (!$doctor || !$admin) return;

        $vaccines = Vaccine::where('active', true)->get();
        if ($vaccines->isEmpty()) return;

        $patients = Patient::orderBy('id')->get();

        foreach ($patients as $idx => $p) {
            $vaccine = $vaccines[$idx % $vaccines->count()];

            $consultation = Consultation::where('patient_id', $p->id)->orderBy('date', 'desc')->first();

            // aplicada
            VaccineApplication::create([
                'patient_id' => $p->id,
                'tutor_id' => $p->tutor_id,
                'vaccine_id' => $vaccine->id,
                'consultation_id' => $consultation?->id,
                'doctor_id' => $doctor->id,
                'created_by' => $admin->id,
                'updated_by' => $admin->id,

                'planned_date' => Carbon::now()->subDays(30)->toDateString(),
                'applied_at' => Carbon::now()->subDays(30)->setTime(11, 30),
                'next_due_date' => Carbon::now()->addDays($vaccine->default_interval_days ?? 365)->toDateString(),
                'status' => 'aplicada',

                'dose_ml' => 1.0,
                'weight_kg' => $p->weight_kg,
                'batch_number' => 'BATCH-DEMO-001',
                'serial_number' => 'SERIAL-DEMO-001',
                'application_site' => 'Subcutánea',
                'observations' => 'Sin observaciones.',
                'adverse_reactions' => null,
                'active' => true,
            ]);

            // pendiente (para dashboard upcoming)
            VaccineApplication::create([
                'patient_id' => $p->id,
                'tutor_id' => $p->tutor_id,
                'vaccine_id' => $vaccine->id,
                'consultation_id' => null,
                'doctor_id' => $doctor->id,
                'created_by' => $admin->id,
                'updated_by' => $admin->id,

                'planned_date' => Carbon::now()->addDays(10 + $idx)->toDateString(),
                'status' => 'pendiente',
                'dose_ml' => 1.0,
                'weight_kg' => $p->weight_kg,
                'observations' => 'Agendada.',
                'active' => true,
            ]);
        }
    }
}
