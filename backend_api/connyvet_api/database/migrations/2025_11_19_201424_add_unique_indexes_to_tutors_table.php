<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tutors', function (Blueprint $table) {
            // índices únicos para evitar duplicados
            $table->unique('rut');
            $table->unique('email');
        });
    }

    public function down(): void
    {
        Schema::table('tutors', function (Blueprint $table) {
            // importante: usar los mismos campos
            $table->dropUnique(['rut']);
            $table->dropUnique(['email']);
        });
    }
};
