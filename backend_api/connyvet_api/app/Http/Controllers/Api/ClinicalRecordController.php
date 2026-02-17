<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\Consultation;
use App\Models\VaccineApplication;
use App\Models\Hospitalization;
use Illuminate\Http\Request;

class ClinicalRecordController extends Controller
{
    /**
     * GET /api/v1/patients/{patient}/clinical-record
     *
     * Devuelve la ficha clínica unificada de un paciente:
     * - Datos del paciente
     * - Tutor principal
     * - Últimas consultas
     * - Vacunas (aplicadas y programadas)
     * - Hospitalizaciones
     */
    public function show(Request $request, int $patientId)
    {
        // 1) Paciente + tutor asociado
        $patient = Patient::with('tutor')->findOrFail($patientId);
        $tutor   = $patient->tutor; // puede ser null

        // 2) Consultas (por ahora las últimas 50)
        $consultations = Consultation::query()
            ->with(['doctor'])
            ->where('patient_id', $patient->id)
            ->orderBy('date', 'desc')
            ->limit(50)
            ->get()
            ->map(function (Consultation $c) {
                return [
                    'id'                    => $c->id,
                    'patient_id'            => $c->patient_id,
                    'tutor_id'              => $c->tutor_id,
                    'doctor_id'             => $c->doctor_id,
                    'date'                  => optional($c->date)->toIso8601String(),
                    'visit_type'            => $c->visit_type,
                    'reason'                => $c->reason,
                    'anamnesis'             => $c->anamnesis,
                    'physical_exam'         => $c->physical_exam,
                    'diagnosis_primary'     => $c->diagnosis_primary,
                    'diagnosis_secondary'   => $c->diagnosis_secondary,
                    'treatment'             => $c->treatment,
                    'recommendations'       => $c->recommendations,
                    'weight_kg'             => $c->weight_kg,
                    'temperature_c'         => $c->temperature_c,
                    'heart_rate'            => $c->heart_rate,
                    'respiratory_rate'      => $c->respiratory_rate,
                    'body_condition_score'  => $c->body_condition_score,
                    'next_control_date'     => optional($c->next_control_date)->toDateString(),
                    'status'                => $c->status,
                    'active'                => $c->active,
                    'created_at'            => optional($c->created_at)->toIso8601String(),
                    'updated_at'            => optional($c->updated_at)->toIso8601String(),
                    'doctor' => $c->doctor ? [
                        'id'    => $c->doctor->id,
                        'name'  => $c->doctor->name,
                        'email' => $c->doctor->email,
                    ] : null,
                ];
            });

        // 3) Vacunas: aplicaciones y programaciones (RESUMEN SEGURO)
        $vaccineApplications = VaccineApplication::query()
            ->with(['vaccine'])
            ->where('patient_id', $patient->id)
            // Solo columnas reales en BD que sabemos que existen
            ->orderByRaw('COALESCE(planned_date, applied_at) DESC')
            ->get()
            ->map(function (VaccineApplication $v) {
                // Nombre "inteligente" de la vacuna:
                // 1) nombre guardado en la aplicación
                // 2) nombre desde el catálogo (relación vaccine)
                // 3) fallback "Vacuna"
                $vaccineName = $v->vaccine_name
                    ?? ($v->vaccine?->name)
                    ?? 'Vacuna';

                return [
                    'id'              => $v->id,
                    'patient_id'      => $v->patient_id,
                    'tutor_id'        => $v->tutor_id,
                    'vaccine_id'      => $v->vaccine_id,
                    'consultation_id' => $v->consultation_id,
                    'doctor_id'       => $v->doctor_id,

                    // Nombre de vacuna y estado
                    'vaccine_name'    => $vaccineName,
                    'status'          => $v->status,

                    // Fechas principales
                    'planned_date'    => optional($v->planned_date)->toDateString(),
                    'applied_at'      => optional($v->applied_at)->toIso8601String(),
                    'applied_date'    => optional($v->applied_at)->toDateString(),

                    // Campos adicionales básicos (solo si existen en el modelo DB)
                    'dose_number'     => $v->dose_number ?? null,

                    // No accedemos a $v->notes ni otros textos para evitar errores
                    'created_at'      => optional($v->created_at)->toIso8601String(),
                    'updated_at'      => optional($v->updated_at)->toIso8601String(),

                    // Mini-resumen de la vacuna de catálogo
                    'vaccine' => $v->vaccine ? [
                        'id'      => $v->vaccine->id,
                        'name'    => $v->vaccine->name,
                        'species' => $v->vaccine->species,
                        // Si no estás 100% seguro de que la columna existe, puedes comentar esto:
                        // 'is_core' => $v->vaccine->is_core,
                    ] : null,
                ];
            });

        // 4) Hospitalizaciones
        $hospitalizations = Hospitalization::query()
            ->where('patient_id', $patient->id)
            ->orderBy('admission_date', 'desc')
            ->get()
            ->map(function (Hospitalization $h) {
                return [
                    'id'             => $h->id,
                    'patient_id'     => $h->patient_id,
                    'tutor_id'       => $h->tutor_id,
                    'admission_date' => optional($h->admission_date)->toDateString(),
                    'discharge_date' => optional($h->discharge_date)->toDateString(),
                    'status'         => $h->status,
                    'bed_number'     => $h->bed_number,
                    'notes'          => $h->notes,
                    'created_at'     => optional($h->created_at)->toIso8601String(),
                    'updated_at'     => optional($h->updated_at)->toIso8601String(),
                ];
            });

        // 5) Respuesta para el frontend (web + mobile). N° de ficha = patient.id
        return response()->json([
            'patient' => [
                'id'              => $patient->id,
                'file_number'     => $patient->file_number,
                'name'            => $patient->name,
                'species'         => $patient->species,
                'species_display' => $patient->species_display,
                'breed'           => $patient->breed,
                'sex'             => $patient->sex,
                'sex_display'     => $patient->sex_display,
                'color'           => $patient->color,
                'microchip'       => $patient->microchip,
                'birth_date'      => optional($patient->birth_date)->toDateString(),
                'active'          => $patient->active ?? true,
                'weight_kg'       => $patient->weight_kg ?? null,
                'sterilized'      => $patient->sterilized ?? false,
                'notes'           => $patient->notes ?? null,
            ],
            'tutor' => $tutor ? [
                'id'        => $tutor->id,
                'name'      => $tutor->name,
                'email'     => $tutor->email,
                'phone'     => $tutor->phone,
                'address'   => $tutor->address,
                'nombres'   => $tutor->nombres ?? null,
                'apellidos' => $tutor->apellidos ?? null,
                'rut'       => $tutor->rut ?? null,
                'direccion' => $tutor->attributes['direccion'] ?? null,
                'comuna'    => $tutor->comuna ?? null,
                'region'    => $tutor->region ?? null,
            ] : null,
            'consultations'        => $consultations,
            'vaccine_applications' => $vaccineApplications,
            'hospitalizations'     => $hospitalizations,
        ]);
    }
}
