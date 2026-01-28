<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('patients', function (Blueprint $table) {
            $table->id();

            // Datos básicos del paciente
            $table->string('name');
            $table->string('species', 50); // perro, gato, etc.
            $table->string('breed')->nullable();
            $table->enum('sex', ['macho', 'hembra', 'desconocido'])->default('desconocido');
            $table->date('birth_date')->nullable();
            $table->string('color')->nullable();

            // Identificación
            $table->string('microchip')->nullable()->unique();

            // Datos clínicos generales
            $table->decimal('weight_kg', 8, 2)->nullable();
            $table->boolean('sterilized')->default(false);
            $table->text('notes')->nullable();

            // Datos del tutor
            $table->string('tutor_name');
            $table->string('tutor_email')->nullable();
            $table->string('tutor_phone')->nullable();

            // Estado del paciente en la clínica
            $table->boolean('active')->default(true);

            // Soft deletes + timestamps
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
