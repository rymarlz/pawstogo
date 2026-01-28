<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class BearerTokenFromQuery
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->query('token') ?: $request->query('access_token');

        if ($token && !$request->headers->has('Authorization')) {
            $request->headers->set('Authorization', 'Bearer ' . $token);

            // 👇 evita redirect a route('login') cuando se abre en navegador
            $request->headers->set('Accept', 'application/json');
        }

        return $next($request);
    }
}
