<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreHospitalizationRequest;
use App\Http\Requests\UpdateHospitalizationRequest;
use App\Http\Resources\HospitalizationResource;
use App\Models\Hospitalization;
use Illuminate\Http\Request;

class HospitalizationController extends Controller
{
    public function index(Request $request)
    {
        $query = Hospitalization::query()
            ->with(['patient', 'tutor']);

        // Filtros: status, patient_id, desde/hasta
        $status = $request->query('status');
        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($patientId = $request->query('patient_id')) {
            $query->where('patient_id', $patientId);
        }

        if ($from = $request->query('from_date')) {
            $query->whereDate('admission_date', '>=', $from);
        }

        if ($to = $request->query('to_date')) {
            $query->whereDate('admission_date', '<=', $to);
        }

        $perPage = (int) $request->query('per_page', 20);

        $paginator = $query
            ->orderByDesc('admission_date')
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json([
            'data' => HospitalizationResource::collection($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
            ],
        ]);
    }

    public function store(StoreHospitalizationRequest $request)
    {
        $data = $request->validated();

        $hospitalization = Hospitalization::create($data);
        $hospitalization->load(['patient', 'tutor']);

        return (new HospitalizationResource($hospitalization))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Hospitalization $hospitalization)
    {
        $hospitalization->load(['patient', 'tutor']);

        return new HospitalizationResource($hospitalization);
    }

    public function update(UpdateHospitalizationRequest $request, Hospitalization $hospitalization)
    {
        $data = $request->validated();

        $hospitalization->update($data);
        $hospitalization->load(['patient', 'tutor']);

        return new HospitalizationResource($hospitalization);
    }

    public function destroy(Hospitalization $hospitalization)
    {
        $hospitalization->delete();

        return response()->json(null, 204);
    }
}
