<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'No autenticado',
            ], 401);
        }

        if ($user->role !== 'admin') {
            return response()->json([
                'message' => 'No autorizado (solo admin)',
            ], 403);
        }

        return $next($request);
    }
}
