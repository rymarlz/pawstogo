<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Resources\Json\JsonResource;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Aquí podríamos registrar singletons/bindings si los necesitamos más adelante.
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        /**
         * API Resources sin envoltura "data".
         * Nuestras respuestas con TutorResource/TutorCollection quedan más limpias.
         */
        JsonResource::withoutWrapping();

        /**
         * Controles estrictos de Eloquent en desarrollo/pruebas:
         * - Evita lazy loading accidental (costoso o indicio de N+1).
         * - Evita descartar atributos silenciosamente.
         * - Evita acceder a atributos inexistentes.
         */
        if (! app()->isProduction()) {
            Model::preventLazyLoading();
            Model::preventSilentlyDiscardingAttributes();
            Model::preventAccessingMissingAttributes();
        }

        /**
         * Compatibilidad con motores antiguos de MySQL/MariaDB (opcional).
         * En 10.11 no suele hacer falta, pero no estorba.
         */
        Schema::defaultStringLength(191);
    }
}
