<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class StaffMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'No autenticado'], 401);
        }

        if (!in_array($user->role, ['admin', 'doctor', 'asistente'], true)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return $next($request);
    }
}
