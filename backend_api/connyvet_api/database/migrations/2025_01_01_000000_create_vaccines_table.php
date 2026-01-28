<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('vaccines', function (Blueprint $table) {
            $table->id();

            // Nombre comercial / identificador interno de la vacuna
            $table->string('name');

            // Especie objetivo principal (perro, gato, etc.)
            $table->string('species')->nullable(); // perro, gato, etc.

            // Fabricante / laboratorio
            $table->string('manufacturer')->nullable();

            // Descripción corta (ej: "Polivalente cachorro", "Rabia anual", etc.)
            $table->string('short_description', 255)->nullable();

            // Descripción larga / notas técnicas
            $table->text('description')->nullable();

            // Dosis sugerida (en ml) – opcional
            $table->decimal('default_dose_ml', 6, 2)->nullable();

            // Vía de administración (SC, IM, PO, etc.)
            $table->string('route', 50)->nullable();

            // Edad mínima recomendada (en semanas) para la primera dosis
            $table->unsignedInteger('min_age_weeks')->nullable();

            // Edad máxima (en semanas) recomendada (si aplica)
            $table->unsignedInteger('max_age_weeks')->nullable();

            // Intervalo recomendado para refuerzo (en días)
            $table->unsignedInteger('default_interval_days')->nullable();

            // Si es vacuna "core" para la especie
            $table->boolean('is_core')->default(false);

            // Activa o no en la clínica
            $table->boolean('active')->default(true);

            // Metadatos flexibles para futuro (ej: esquema por país, comentarios)
            $table->json('extra_data')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['species', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vaccines');
    }
};
