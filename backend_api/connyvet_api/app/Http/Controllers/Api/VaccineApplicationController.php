<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VaccineApplication;
use App\Models\Vaccine;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class VaccineApplicationController extends Controller
{
    /**
     * GET /api/v1/vaccine-applications
     *
     * Filtros:
     * - patient_id
     * - tutor_id
     * - vaccine_id
     * - status (pendiente, aplicada, omitida)
     * - date_from, date_to (sobre planned_date)
     * - upcoming=1 (próximas vacunas pendientes desde hoy)
     * - search (nombre vacuna, paciente, observaciones)
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->get('per_page', 20);
        $perPage = $perPage > 0 && $perPage <= 100 ? $perPage : 20;

        $query = VaccineApplication::query()
            ->with(['patient', 'tutor', 'vaccine', 'doctor'])
            ->orderBy('planned_date', 'asc')
            ->orderBy('id', 'desc');

        if ($patientId = $request->get('patient_id')) {
            $query->where('patient_id', $patientId);
        }

        if ($tutorId = $request->get('tutor_id')) {
            $query->where('tutor_id', $tutorId);
        }

        if ($vaccineId = $request->get('vaccine_id')) {
            $query->where('vaccine_id', $vaccineId);
        }

       $status = $request->get('status');
if ($status && $status !== 'all') {
    $query->where('status', $status);
}


        if ($dateFrom = $request->get('date_from')) {
            $query->whereDate('planned_date', '>=', $dateFrom);
        }

        if ($dateTo = $request->get('date_to')) {
            $query->whereDate('planned_date', '<=', $dateTo);
        }

        // Próximas vacunas pendientes (para agenda / dashboard)
        if ($request->boolean('upcoming')) {
            $today = Carbon::today()->toDateString();
            $query->where('status', 'pendiente')
                  ->whereDate('planned_date', '>=', $today)
                  ->orderBy('planned_date', 'asc');
        }

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('observations', 'like', "%{$search}%")
                    ->orWhere('adverse_reactions', 'like', "%{$search}%")
                    ->orWhereHas('vaccine', function ($q2) use ($search) {
                        $q2->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('patient', function ($q3) use ($search) {
                        $q3->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $apps = $query->paginate($perPage);

        $apps->getCollection()->transform(function (VaccineApplication $a) {
            return [
                'id'            => $a->id,
                'patient_id'    => $a->patient_id,
                'tutor_id'      => $a->tutor_id,
                'vaccine_id'    => $a->vaccine_id,
                'consultation_id' => $a->consultation_id,
                'doctor_id'     => $a->doctor_id,

                'patient' => $a->patient ? [
                    'id'   => $a->patient->id,
                    'name' => $a->patient->name,
                    'species' => $a->patient->species ?? null,
                ] : null,
                'tutor' => $a->tutor ? [
                    'id'    => $a->tutor->id,
                    'name'  => $a->tutor->name ?? ($a->tutor->nombres . ' ' . $a->tutor->apellidos),
                    'email' => $a->tutor->email,
                ] : null,
                'vaccine' => $a->vaccine ? [
                    'id'       => $a->vaccine->id,
                    'name'     => $a->vaccine->name,
                    'species'  => $a->vaccine->species,
                    'is_core'  => $a->vaccine->is_core,
                ] : null,
                'doctor' => $a->doctor ? [
                    'id'    => $a->doctor->id,
                    'name'  => $a->doctor->name,
                    'email' => $a->doctor->email,
                ] : null,

                'planned_date'  => optional($a->planned_date)->toDateString(),
                'applied_at'    => optional($a->applied_at)->toIso8601String(),
                'next_due_date' => optional($a->next_due_date)->toDateString(),
                'status'        => $a->status,
                'status_label'  => $a->status_label,

                'dose_ml'          => $a->dose_ml,
                'weight_kg'        => $a->weight_kg,
                'batch_number'     => $a->batch_number,
                'serial_number'    => $a->serial_number,
                'application_site' => $a->application_site,

                'observations'      => $a->observations,
                'adverse_reactions' => $a->adverse_reactions,

                'active'           => $a->active,
                'attachments_meta' => $a->attachments_meta,
                'extra_data'       => $a->extra_data,

                'created_at' => optional($a->created_at)->toIso8601String(),
                'updated_at' => optional($a->updated_at)->toIso8601String(),
            ];
        });

        return response()->json([
            'data' => $apps->items(),
            'meta' => [
                'current_page' => $apps->currentPage(),
                'last_page'    => $apps->lastPage(),
                'per_page'     => $apps->perPage(),
                'total'        => $apps->total(),
            ],
        ]);
    }

    /**
     * POST /api/v1/vaccine-applications
     */
    public function store(Request $request)
    {
        $userId = optional($request->user())->id;

        $validated = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'tutor_id'   => ['nullable', 'integer', 'exists:tutors,id'],
            'vaccine_id' => ['required', 'integer', 'exists:vaccines,id'],
            'consultation_id' => ['nullable', 'integer', 'exists:consultations,id'],
            'doctor_id'  => ['nullable', 'integer', 'exists:users,id'],

            'planned_date' => ['nullable', 'date'],
            'applied_at'   => ['nullable', 'date'],
            'next_due_date'=> ['nullable', 'date'],
            'status'       => ['nullable', Rule::in(['pendiente', 'aplicada', 'omitida'])],

            'dose_ml'      => ['nullable', 'numeric', 'min:0', 'max:9999'],
            'weight_kg'    => ['nullable', 'numeric', 'min:0', 'max:999'],
            'batch_number' => ['nullable', 'string', 'max:100'],
            'serial_number'=> ['nullable', 'string', 'max:100'],
            'application_site' => ['nullable', 'string', 'max:100'],

            'observations'      => ['nullable', 'string'],
            'adverse_reactions' => ['nullable', 'string'],

            'active'           => ['nullable', 'boolean'],
            'attachments_meta' => ['nullable', 'array'],
            'extra_data'       => ['nullable', 'array'],
        ]);

        // Lógica por defecto de estado
        if (! isset($validated['status'])) {
            $validated['status'] = isset($validated['applied_at']) ? 'aplicada' : 'pendiente';
        }

        if (! isset($validated['active'])) {
            $validated['active'] = true;
        }

        // Si no viene next_due_date, intentamos calcular usando la vacuna
        if (! isset($validated['next_due_date']) && isset($validated['planned_date'])) {
            $vaccine = Vaccine::find($validated['vaccine_id']);
            if ($vaccine && $vaccine->default_interval_days) {
                $validated['next_due_date'] = Carbon::parse($validated['planned_date'])
                    ->addDays($vaccine->default_interval_days)
                    ->toDateString();
            }
        }

        $validated['created_by'] = $userId;
        $validated['updated_by'] = $userId;

        $app = VaccineApplication::create($validated);
        $app->load(['patient', 'tutor', 'vaccine', 'doctor']);

        return response()->json([
            'message' => 'Vacunación registrada correctamente',
            'data'    => $app,
        ], 201);
    }

    /**
     * GET /api/v1/vaccine-applications/{vaccineApplication}
     */
    public function show(VaccineApplication $vaccineApplication)
    {
        $vaccineApplication->load(['patient', 'tutor', 'vaccine', 'doctor', 'consultation']);

        return response()->json([
            'data' => $vaccineApplication,
        ]);
    }

    /**
     * PUT/PATCH /api/v1/vaccine-applications/{vaccineApplication}
     */
    public function update(Request $request, VaccineApplication $vaccineApplication)
    {
        $userId = optional($request->user())->id;

        $validated = $request->validate([
            'patient_id' => ['sometimes', 'required', 'integer', 'exists:patients,id'],
            'tutor_id'   => ['nullable', 'integer', 'exists:tutors,id'],
            'vaccine_id' => ['sometimes', 'required', 'integer', 'exists:vaccines,id'],
            'consultation_id' => ['nullable', 'integer', 'exists:consultations,id'],
            'doctor_id'  => ['nullable', 'integer', 'exists:users,id'],

            'planned_date' => ['nullable', 'date'],
            'applied_at'   => ['nullable', 'date'],
            'next_due_date'=> ['nullable', 'date'],
            'status'       => ['nullable', Rule::in(['pendiente', 'aplicada', 'omitida'])],

            'dose_ml'      => ['nullable', 'numeric', 'min:0', 'max:9999'],
            'weight_kg'    => ['nullable', 'numeric', 'min:0', 'max:999'],
            'batch_number' => ['nullable', 'string', 'max:100'],
            'serial_number'=> ['nullable', 'string', 'max:100'],
            'application_site' => ['nullable', 'string', 'max:100'],

            'observations'      => ['nullable', 'string'],
            'adverse_reactions' => ['nullable', 'string'],

            'active'           => ['nullable', 'boolean'],
            'attachments_meta' => ['nullable', 'array'],
            'extra_data'       => ['nullable', 'array'],
        ]);

        $validated['updated_by'] = $userId;

        $vaccineApplication->update($validated);
        $vaccineApplication->load(['patient', 'tutor', 'vaccine', 'doctor']);

        return response()->json([
            'message' => 'Vacunación actualizada correctamente',
            'data'    => $vaccineApplication,
        ]);
    }

    /**
     * DELETE /api/v1/vaccine-applications/{vaccineApplication}
     */
    public function destroy(VaccineApplication $vaccineApplication)
    {
        $vaccineApplication->delete();

        return response()->json([
            'message' => 'Vacunación eliminada correctamente',
        ], 200);
    }

    /**
     * GET /api/v1/dashboard/vaccines/upcoming
     *
     * Endpoint específico para el dashboard:
     * próximas vacunas pendientes, ordenadas por fecha.
     */
    public function upcomingForDashboard(Request $request)
    {
        $limit = (int) $request->get('limit', 5);
        $limit = $limit > 0 && $limit <= 50 ? $limit : 5;

        $today = Carbon::today()->toDateString();

        $query = VaccineApplication::query()
            ->with(['patient', 'tutor', 'vaccine'])
            ->where('status', 'pendiente')
            ->whereDate('planned_date', '>=', $today)
            ->orderBy('planned_date', 'asc');

        // Filtrar opcionalmente por tutor o paciente
        if ($patientId = $request->get('patient_id')) {
            $query->where('patient_id', $patientId);
        }
        if ($tutorId = $request->get('tutor_id')) {
            $query->where('tutor_id', $tutorId);
        }

        $items = $query->limit($limit)->get();

        $items = $items->map(function (VaccineApplication $a) {
            return [
                'id'           => $a->id,
                'planned_date' => optional($a->planned_date)->toDateString(),
                'status'       => $a->status,
                'status_label' => $a->status_label,
                'patient'      => $a->patient ? [
                    'id'   => $a->patient->id,
                    'name' => $a->patient->name,
                ] : null,
                'tutor'        => $a->tutor ? [
                    'id'   => $a->tutor->id,
                    'name' => $a->tutor->name ?? ($a->tutor->nombres . ' ' . $a->tutor->apellidos),
                ] : null,
                'vaccine'      => $a->vaccine ? [
                    'id'   => $a->vaccine->id,
                    'name' => $a->vaccine->name,
                ] : null,
            ];
        });

        return response()->json([
            'data' => $items,
        ]);
    }
}
