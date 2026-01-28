<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vaccine;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class VaccineController extends Controller
{
    /**
     * Listado paginado de vacunas del catálogo.
     *
     * GET /api/v1/vaccines?search=&species=&active=all|true|false&page=&per_page=
     */
    public function index(Request $request): JsonResponse
    {
        $search   = $request->query('search');
        $species  = $request->query('species');
        $active   = $request->query('active', 'all'); // all|true|false
        $perPage  = (int) $request->query('per_page', 20);
        $perPage  = $perPage > 0 ? min($perPage, 100) : 20;

        $query = Vaccine::query();

        // Búsqueda por nombre / descripciones
        if ($search) {
            $term = trim($search);
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', '%' . $term . '%')
                    ->orWhere('short_description', 'like', '%' . $term . '%')
                    ->orWhere('description', 'like', '%' . $term . '%');
            });
        }

        // Filtro por especie
        if ($species) {
            $query->where('species', $species);
        }

        // Filtro por activo
        if ($active === 'true') {
            $query->where('active', true);
        } elseif ($active === 'false') {
            $query->where('active', false);
        }

        $paginator = $query
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        // Devuelve { data: [...], links: {...}, meta: {...} }
        return response()->json($paginator);
    }

    /**
     * Crear vacuna en el catálogo.
     *
     * POST /api/v1/vaccines
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                  => ['required', 'string', 'max:255'],
            'species'               => ['nullable', 'string', 'max:50'],
            'manufacturer'          => ['nullable', 'string', 'max:255'],
            'short_description'     => ['nullable', 'string', 'max:255'],
            'description'           => ['nullable', 'string'],
            'default_dose_ml'       => ['nullable', 'numeric', 'min:0'],
            'route'                 => ['nullable', 'string', 'max:50'],
            'min_age_weeks'         => ['nullable', 'integer', 'min:0'],
            'max_age_weeks'         => ['nullable', 'integer', 'min:0'],
            'default_interval_days' => ['nullable', 'integer', 'min:0'],
            'is_core'               => ['boolean'],
            'active'                => ['boolean'],
            'extra_data'            => ['nullable', 'array'],
        ]);

        $data['is_core'] = $data['is_core'] ?? false;
        $data['active']  = $data['active'] ?? true;

        $vaccine = Vaccine::create($data);

        return response()->json([
            'message' => 'Vacuna creada correctamente.',
            'data'    => $vaccine,
        ], 201);
    }

    /**
     * Ver una vacuna específica.
     *
     * GET /api/v1/vaccines/{vaccine}
     */
    public function show(Vaccine $vaccine): JsonResponse
    {
        return response()->json([
            'data' => $vaccine,
        ]);
    }

    /**
     * Actualizar una vacuna.
     *
     * PUT /api/v1/vaccines/{vaccine}
     */
    public function update(Request $request, Vaccine $vaccine): JsonResponse
    {
        $data = $request->validate([
            'name'                  => ['sometimes', 'required', 'string', 'max:255'],
            'species'               => ['nullable', 'string', 'max:50'],
            'manufacturer'          => ['nullable', 'string', 'max:255'],
            'short_description'     => ['nullable', 'string', 'max:255'],
            'description'           => ['nullable', 'string'],
            'default_dose_ml'       => ['nullable', 'numeric', 'min:0'],
            'route'                 => ['nullable', 'string', 'max:50'],
            'min_age_weeks'         => ['nullable', 'integer', 'min:0'],
            'max_age_weeks'         => ['nullable', 'integer', 'min:0'],
            'default_interval_days' => ['nullable', 'integer', 'min:0'],
            'is_core'               => ['boolean'],
            'active'                => ['boolean'],
            'extra_data'            => ['nullable', 'array'],
        ]);

        $vaccine->fill($data);
        $vaccine->save();

        return response()->json([
            'message' => 'Vacuna actualizada correctamente.',
            'data'    => $vaccine,
        ]);
    }

    /**
     * Eliminar (soft delete) una vacuna del catálogo.
     *
     * DELETE /api/v1/vaccines/{vaccine}
     */
    public function destroy(Vaccine $vaccine): JsonResponse
    {
        $vaccine->delete();

        return response()->json([
            'message' => 'Vacuna eliminada correctamente.',
        ]);
    }
}
