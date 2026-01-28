<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\Tutor;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;

class PatientController extends Controller
{
    /**
     * GET /api/v1/patients
     * Filtros: search, species, active, tutor_id
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->get('per_page', 20);
        $perPage = $perPage > 0 && $perPage <= 100 ? $perPage : 20;

        $query = Patient::query()
            ->with('tutor') // 👈 cargamos tutor
            ->orderBy('created_at', 'desc');

        // Filtro por búsqueda (nombre paciente o tutor)
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('microchip', 'like', "%{$search}%")
                    ->orWhere('tutor_name', 'like', "%{$search}%")
                    ->orWhereHas('tutor', function ($q2) use ($search) {
                        $q2->where('name', 'like', "%{$search}%")
                           ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        // Filtro por especie
        if ($species = $request->get('species')) {
            $query->where('species', $species);
        }

        // Filtro por estado (activo/inactivo)
        if ($request->has('active') && $request->get('active') !== 'all') {
            $active = $request->get('active') === 'true';
            $query->where('active', $active);
        }

        // Filtro por tutor específico
        if ($tutorId = $request->get('tutor_id')) {
            $query->where('tutor_id', $tutorId);
        }

        $patients = $query->paginate($perPage);

        // Adaptamos la respuesta al frontend actual:
        // incluimos tutor_name/phone para compatibilidad,
        // y también un objeto tutor.
$patients->getCollection()->transform(function (Patient $p) {
    return [
        'id'          => $p->id,
        'name'        => $p->name,
        'species'     => $p->species,
        'breed'       => $p->breed,
        'sex'         => $p->sex,
        'birth_date'  => optional($p->birth_date)->toDateString(),
        'color'       => $p->color,
        'microchip'   => $p->microchip,
        'weight_kg'   => $p->weight_kg,
        'sterilized'  => $p->sterilized,
        'active'      => $p->active,
        'photo_url'   => $p->photo_url,   // 👈 AQUÍ

        'tutor_name'  => $p->tutor?->name ?? $p->tutor_name,
        'tutor_email' => $p->tutor?->email ?? $p->tutor_email,
        'tutor_phone' => $p->tutor?->phone ?? $p->tutor_phone,
        'tutor'       => $p->tutor ? [
            'id'    => $p->tutor->id,
            'name'  => $p->tutor->name,
            'email' => $p->tutor->email,
            'phone' => $p->tutor->phone,
        ] : null,
    ];
});



        return response()->json([
            'data' => $patients->items(),
            'meta' => [
                'current_page' => $patients->currentPage(),
                'last_page'    => $patients->lastPage(),
                'per_page'     => $patients->perPage(),
                'total'        => $patients->total(),
            ],
        ]);
    }




    /**
     * GET /api/v1/patients/{patient}
     */
    public function show(Patient $patient)
    {
        $patient->load('tutor');

        return response()->json([
            'data' => $patient,
        ]);
    }

    /**
     * PUT/PATCH /api/v1/patients/{patient}
     */
// App\Http\Controllers\Api\PatientController.php

public function store(Request $request)
{
    $validated = $request->validate([
        'tutor_id' => [
            'nullable',
            'integer',
            Rule::exists('tutors', 'id')->where('active', true),
        ],
        'name'        => ['required', 'string', 'max:191'],
        'species'     => ['required', 'string', 'max:50'],
        'breed'       => ['nullable', 'string', 'max:191'],
        'sex'         => ['required', Rule::in(['macho', 'hembra', 'desconocido'])],
        'birth_date'  => ['nullable', 'date'],
        'color'       => ['nullable', 'string', 'max:191'],
        'microchip'   => ['nullable', 'string', 'max:191'],
        'weight_kg'   => ['nullable', 'numeric', 'min:0', 'max:999'],
        'sterilized'  => ['nullable', 'boolean'],
        'notes'       => ['nullable', 'string'],
        // legacy por compatibilidad
        'tutor_name'  => ['nullable', 'string', 'max:191'],
        'tutor_email' => ['nullable', 'email', 'max:191'],
        'tutor_phone' => ['nullable', 'string', 'max:191'],
        'active'      => ['nullable', 'boolean'],

        // 👇 NUEVO: la foto que viene del front (input name="photo")
        'photo'       => ['nullable', 'image', 'max:5120'], // 5MB
    ]);

    // 👇 sacamos el archivo del request
    $photoFile = $request->file('photo');

    // 👇 IMPORTANTE: quitamos 'photo' del array para el create()
    unset($validated['photo']);

    if ($photoFile) {
        // esto crea la carpeta patients si no existe
        $path = $photoFile->store('patients', 'public'); // storage/app/public/patients/xxxx.jpg
        $validated['photo_path'] = $path;
    }

    $patient = Patient::create($validated);

    return response()->json([
        'message' => 'Paciente creado correctamente',
        'data'    => $patient->load('tutor'),
    ], 201);
}

public function update(Request $request, Patient $patient)
{
    $validated = $request->validate([
        'tutor_id' => [
            'nullable',
            'integer',
            Rule::exists('tutors', 'id')->where('active', true),
        ],
        'name'        => ['sometimes', 'required', 'string', 'max:191'],
        'species'     => ['sometimes', 'required', 'string', 'max:50'],
        'breed'       => ['nullable', 'string', 'max:191'],
        'sex'         => ['sometimes', 'required', Rule::in(['macho', 'hembra', 'desconocido'])],
        'birth_date'  => ['nullable', 'date'],
        'color'       => ['nullable', 'string', 'max:191'],
        'microchip'   => ['nullable', 'string', 'max:191'],
        'weight_kg'   => ['nullable', 'numeric', 'min:0', 'max:999'],
        'sterilized'  => ['nullable', 'boolean'],
        'notes'       => ['nullable', 'string'],
        'tutor_name'  => ['nullable', 'string', 'max:191'],
        'tutor_email' => ['nullable', 'email', 'max:191'],
        'tutor_phone' => ['nullable', 'string', 'max:191'],
        'active'      => ['nullable', 'boolean'],

        // 👇 también permitimos cambiar foto en update
        'photo'       => ['nullable', 'image', 'max:5120'],
    ]);

    $photoFile = $request->file('photo');
    unset($validated['photo']);

    if ($photoFile) {
        $path = $photoFile->store('patients', 'public');

        // si quieres, aquí podrías borrar la foto anterior:
        // if ($patient->photo_path) {
        //     Storage::disk('public')->delete($patient->photo_path);
        // }

        $validated['photo_path'] = $path;
    }

    $patient->update($validated);

    return response()->json([
        'message' => 'Paciente actualizado correctamente',
        'data'    => $patient->load('tutor'),
    ]);
}

    /**
     * DELETE /api/v1/patients/{patient}
     */
    public function destroy(Patient $patient)
    {
        $patient->delete();

        return response()->json([
            'message' => 'Paciente eliminado correctamente',
        ], 200);
    }
}
