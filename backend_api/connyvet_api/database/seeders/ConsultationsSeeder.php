<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Patient;
use App\Models\Consultation;
use App\Models\User;
use Carbon\Carbon;

class ConsultationsSeeder extends Seeder
{
    public function run(): void
    {
        $doctor = User::where('role', User::ROLE_DOCTOR)->first();
        $admin  = User::where('role', User::ROLE_ADMIN)->first();

        if (!$doctor || !$admin) return;

        $patients = Patient::orderBy('id')->get();
        foreach ($patients as $p) {
            for ($i=0; $i<2; $i++) {
                $date = Carbon::now()->subDays(10 + ($i * 7))->setTime(10 + $i, 0);

                Consultation::create([
                    'patient_id' => $p->id,
                    'tutor_id' => $p->tutor_id,
                    'doctor_id' => $doctor->id,
                    'created_by' => $admin->id,
                    'updated_by' => $admin->id,

                    'date' => $date,
                    'visit_type' => $i === 0 ? 'control' : 'urgencia',
                    'reason' => $i === 0 ? 'Control general' : 'Síntomas digestivos',
                    'anamnesis' => 'Anamnesis demo.',
                    'physical_exam' => 'Examen físico demo.',
                    'diagnosis_primary' => $i === 0 ? 'Sano' : 'Gastroenteritis',
                    'treatment' => $i === 0 ? 'Sin tratamiento' : 'Dieta + hidratación',
                    'recommendations' => 'Recomendaciones demo.',

                    'weight_kg' => $p->weight_kg,
                    'temperature_c' => 38.5,
                    'heart_rate' => 110,
                    'respiratory_rate' => 24,
                    'body_condition_score' => 5,

                    'next_control_date' => Carbon::now()->addMonths(6)->toDateString(),
                    'status' => 'cerrada',
                    'active' => true,
                ]);
            }
        }
    }
}
