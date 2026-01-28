<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePatientRequest;
use App\Http\Requests\UpdatePatientRequest;
use App\Http\Resources\PatientResource;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PatientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Patient::query();

        // ... tus filtros como ya los tienes ...

        $perPage   = (int) $request->query('per_page', 20);
        $perPage   = $perPage > 100 ? 100 : $perPage;
        $paginator = $query
            ->orderBy('name')
            ->paginate($perPage)
            ->appends($request->query());

        return response()->json([
            'data' => PatientResource::collection($paginator)->resolve(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
            ],
        ]);
    }

    public function store(StorePatientRequest $request): JsonResponse
    {
        $data = $request->validated();

        // default de active si no viene
        if (! array_key_exists('active', $data)) {
            $data['active'] = true;
        }

        // 👇 Manejo de archivo
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('patients', 'public');
            $data['photo_path'] = $path;
        }

        $patient = Patient::create($data);

        return response()->json([
            'data'    => new PatientResource($patient),
            'message' => 'Paciente creado correctamente.',
        ], 201);
    }

    public function show(Patient $patient): JsonResponse
    {
        return response()->json([
            'data' => new PatientResource($patient),
        ]);
    }

    public function update(UpdatePatientRequest $request, Patient $patient): JsonResponse
    {
        $data = $request->validated();

        // 👇 Actualizar foto si viene una nueva
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('patients', 'public');
            $data['photo_path'] = $path;
        }

        $patient->fill($data);
        $patient->save();

        return response()->json([
            'data'    => new PatientResource($patient),
            'message' => 'Paciente actualizado correctamente.',
        ]);
    }

    public function destroy(Patient $patient): JsonResponse
    {
        $patient->active = false;
        $patient->save();

        return response()->json([
            'message' => 'Paciente desactivado correctamente.',
        ]);
    }
}
