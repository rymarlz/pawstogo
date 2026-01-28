<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;

class SanctumTokenFromQuery
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->query('token') ?: $request->query('access_token');

        if (!$token) {
            return response()->json(['message' => 'Token requerido'], 401);
        }

        $accessToken = PersonalAccessToken::findToken($token);

        if (!$accessToken || !$accessToken->tokenable) {
            return response()->json(['message' => 'Token inválido o expirado'], 401);
        }

        Auth::setUser($accessToken->tokenable);

        return $next($request);
    }
}
