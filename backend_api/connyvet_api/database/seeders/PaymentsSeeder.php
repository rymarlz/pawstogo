<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Payment;
use App\Models\Consultation;
use App\Models\Hospitalization;
use App\Models\VaccineApplication;
use App\Models\User;
use Carbon\Carbon;

class PaymentsSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', User::ROLE_ADMIN)->first();
        if (!$admin) return;

        // Pago por consulta (pending)
        $c = Consultation::orderBy('date', 'desc')->first();
        if ($c) {
            Payment::create([
                'patient_id' => $c->patient_id,
                'tutor_id' => $c->tutor_id,
                'consultation_id' => $c->id,
                'concept' => 'Consulta veterinaria',
                'amount' => 25000,
                'status' => 'pending',
                'method' => null,
                'notes' => 'Pendiente demo',
                'created_by' => $admin->id,
            ]);
        }

        // Pago por vacuna (paid)
        $va = VaccineApplication::where('status', 'aplicada')->orderBy('id')->first();
        if ($va) {
            Payment::create([
                'patient_id' => $va->patient_id,
                'tutor_id' => $va->tutor_id,
                'vaccine_application_id' => $va->id,
                'concept' => 'Vacuna aplicada',
                'amount' => 18000,
                'status' => 'paid',
                'method' => 'debito',
                'paid_at' => Carbon::now()->subDays(29),
                'notes' => 'Pagado demo',
                'created_by' => $admin->id,
            ]);
        }

        // Pago hospitalización (cancelled)
        $h = Hospitalization::orderBy('id')->first();
        if ($h) {
            Payment::create([
                'patient_id' => $h->patient_id,
                'tutor_id' => $h->tutor_id,
                'hospitalization_id' => $h->id,
                'concept' => 'Hospitalización (día cama)',
                'amount' => 45000,
                'status' => 'cancelled',
                'cancelled_at' => Carbon::now()->subDay(),
                'cancelled_reason' => 'Paciente dado de alta antes',
                'notes' => 'Cancelado demo',
                'created_by' => $admin->id,
            ]);
        }
    }
}
