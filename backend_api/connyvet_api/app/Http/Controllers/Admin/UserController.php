<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    /**
     * Lista de usuarios (solo admin).
     * Filtros:
     *  - search: nombre/email
     *  - role: admin|doctor|asistente|tutor
     *  - active: 1|0 (se mapea a is_active)
     */
    public function index(Request $request)
    {
        $query = User::query();

        // --- Filtro búsqueda libre (name/email) ---
        $search = $request->query('search');
        if (is_string($search) && $search !== '') {
            $query->where(function ($q) use ($search) {
                $like = '%' . $search . '%';
                $q->where('name', 'like', $like)
                  ->orWhere('email', 'like', $like);
            });
        }

        // --- Filtro por rol ---
        $role = $request->query('role');
        if (is_string($role) && $role !== '') {
            $query->where('role', $role);
        }

        // --- Filtro por activo / inactivo (mapea a is_active) ---
        $activeParam = $request->query('active', null); // '1' | '0' | null
        if ($activeParam !== null && $activeParam !== '') {
            // Aceptamos '1'/'0', 'true'/'false'
            $active = in_array($activeParam, ['1', 'true', 1, true], true);
            $query->where('is_active', $active);
        }

        // --- Paginación segura ---
        $perPage = (int) $request->query('per_page', 15);
        $perPage = max(1, min($perPage, 100));

        $users = $query
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return UserResource::collection($users);
    }

    /**
     * Crear un nuevo usuario (solo admin).
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)],
            // por ahora SIN phone porque no existe en la BD
            'role'     => [
                'required',
                Rule::in([
                    User::ROLE_ADMIN,
                    User::ROLE_DOCTOR,
                    User::ROLE_ASISTENTE,
                    User::ROLE_TUTOR,
                ]),
            ],
            'active'   => ['boolean'],
        ]);

        // Si no viene "active", asumimos activo
        $isActive = array_key_exists('active', $data)
            ? (bool) $data['active']
            : true;

        $data['is_active'] = $isActive;
        unset($data['active']); // no existe columna active en DB

        // El cast 'password' => 'hashed' en el modelo se encarga de hashear
        $user = User::create($data);

        return (new UserResource($user))
            ->additional(['message' => 'Usuario creado correctamente.'])
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Detalle de un usuario.
     */
    public function show(User $user)
    {
        return new UserResource($user);
    }

    /**
     * Actualizar usuario.
     */
    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name'     => ['sometimes', 'required', 'string', 'max:255'],
            'email'    => [
                'sometimes',
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'password' => ['nullable', 'confirmed', Password::min(8)],
            // por ahora SIN phone porque no existe en la BD
            'role'     => [
                'sometimes',
                'required',
                Rule::in([
                    User::ROLE_ADMIN,
                    User::ROLE_DOCTOR,
                    User::ROLE_ASISTENTE,
                    User::ROLE_TUTOR,
                ]),
            ],
            'active'   => ['boolean'],
        ]);

        // No permitimos que el admin se desactive a sí mismo
        if (
            array_key_exists('active', $data)
            && $user->id === $request->user()->id
            && $data['active'] === false
        ) {
            return response()->json([
                'message' => 'No puedes desactivar tu propio usuario.',
            ], 422);
        }

        // Mapear active -> is_active
        if (array_key_exists('active', $data)) {
            $data['is_active'] = (bool) $data['active'];
            unset($data['active']);
        }

        // Si password viene vacía, no cambiarla
        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);

        return (new UserResource($user))
            ->additional(['message' => 'Usuario actualizado correctamente.']);
    }

    /**
     * Eliminar usuario.
     */
    public function destroy(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'No puedes eliminar tu propio usuario.',
            ], 422);
        }

        $user->delete();

        return response()->json([
            'message' => 'Usuario eliminado correctamente.',
        ], 200);
    }
}
