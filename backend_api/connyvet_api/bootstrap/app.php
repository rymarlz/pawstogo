<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\EnsureUserIsStaff;
use App\Http\Middleware\BearerTokenFromQuery;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: __DIR__.'/../routes/health.php',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'admin'        => EnsureUserIsAdmin::class,
            'staff'        => EnsureUserIsStaff::class,

            // ✅ nuevo: para permitir ?token=... en descargas PDF
            'bearer.query' => BearerTokenFromQuery::class,
            'sanctum.query' => \App\Http\Middleware\SanctumTokenFromQuery::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })
    ->create();
