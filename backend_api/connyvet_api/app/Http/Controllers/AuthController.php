<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    /**
     * Registro (si aún lo usas).
     * OJO: en un sistema clínico lo normal es que solo el admin cree usuarios.
     */
    public function register(Request $request)
    {
        $data = $request->validate([
            'name'                  => ['required', 'string', 'max:255'],
            'email'                 => ['required', 'email', 'max:255', 'unique:users,email'],
            'password'              => ['required', 'confirmed', Password::min(8)],
            'phone'                 => ['nullable', 'string', 'max:30'],
            'role'                  => ['nullable', 'in:admin,doctor,asistente,tutor'],
            'active'                => ['sometimes', 'boolean'],
        ]);

        if (empty($data['role'])) {
            $data['role'] = 'tutor';
        }

        if (!array_key_exists('active', $data)) {
            $data['active'] = true;
        }

        $user = User::create($data);

        $token = $user->createToken('api_token')->plainTextToken;

        return response()->json([
            'message' => 'Usuario creado correctamente',
            'user'    => $user,
            'token'   => $token,
        ], 201);
    }

    /**
     * Login: SOLO valida email + password.
     * Si falla la validación → 422.
     * Si las credenciales son malas → 401.
     */
   public function login(Request $request)
{
    $credentials = $request->validate([
        'email'    => ['required', 'email'],
        'password' => ['required', 'string'],
    ]);

    if (!Auth::attempt($credentials)) {
        return response()->json([
            'message' => 'Credenciales inválidas',
        ], 401);
    }

    /** @var \App\Models\User $user */
    $user = $request->user();

    // ✅ Check seguro: no usamos $user->active directamente
    $attributes = $user->getAttributes();

    if (array_key_exists('active', $attributes) && ! (bool) $attributes['active']) {
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Usuario inactivo. Contacta al administrador.',
        ], 403);
    }

    $token = $user->createToken('api_token')->plainTextToken;

    return response()->json([
        'message' => 'Login correcto',
        'user'    => $user,
        'token'   => $token,
    ]);
}

    /**
     * Usuario autenticado.
     */
    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    /**
     * Logout: revoca el token actual.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Sesión cerrada',
        ]);
    }
}
