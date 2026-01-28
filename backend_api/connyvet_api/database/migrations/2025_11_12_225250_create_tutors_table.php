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
    Schema::create('tutors', function (Blueprint $table) {
        $table->id();
        $table->string('nombres');
        $table->string('apellidos')->nullable();
        $table->string('rut')->nullable()->index(); // CL opcional
        $table->string('email')->nullable()->index();
        $table->string('telefono_movil')->nullable();
        $table->string('telefono_fijo')->nullable();
        $table->string('direccion')->nullable();
        $table->string('comuna')->nullable();
        $table->string('region')->nullable();
        $table->string('estado_civil')->nullable();
        $table->string('ocupacion')->nullable();
        $table->string('nacionalidad')->nullable();
        $table->date('fecha_nacimiento')->nullable();

        // Info bancaria
        $table->string('banco')->nullable();
        $table->string('ejecutivo')->nullable();
        $table->string('sucursal')->nullable();
        $table->string('tipo_cuenta')->nullable();   // VISTA/CTACTE/AHORRO
        $table->string('numero_cuenta')->nullable();
        $table->string('titular_cuenta')->nullable();
        $table->string('rut_titular')->nullable();
        $table->string('alias_transferencia')->nullable();
        $table->string('email_para_pagos')->nullable();
        $table->string('telefono_banco')->nullable();

        $table->text('comentarios')->nullable();          // comentarios del perfil
        $table->text('comentarios_generales')->nullable();// otros
        $table->timestamps();
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tutors');
    }
};
