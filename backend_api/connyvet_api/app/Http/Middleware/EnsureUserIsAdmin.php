<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureUserIsAdmin
{
    /**
     * Solo permite acceso a usuarios con rol 'admin'.
     */
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user(); // user autenticado por Sanctum

        // Si no hay usuario o su rol no es 'admin' -> 403
        if (!$user || $user->role !== 'admin') {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Acceso solo permitido para administradores.',
                ], 403);
            }

            abort(403, 'Acceso solo permitido para administradores.');
        }

        return $next($request);
    }
}
