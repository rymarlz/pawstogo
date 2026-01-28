<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;

class Handler extends ExceptionHandler
{
    // ...

    protected function unauthenticated($request, AuthenticationException $exception)
    {
        // si es API o pide JSON => 401 en vez de redirect
        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // fallback web (si tuvieras)
        return redirect()->guest('/login');
    }
}
