<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Hacer opcionales patient_id y date en consultas (formulario todo opcional).
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            Schema::table('consultations', function (Blueprint $table) {
                $table->dropForeign(['patient_id']);
            });
            DB::statement('ALTER TABLE consultations MODIFY patient_id BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE consultations MODIFY date DATETIME NULL');
            Schema::table('consultations', function (Blueprint $table) {
                $table->foreign('patient_id')->references('id')->on('patients');
            });
        } else {
            Schema::table('consultations', function (Blueprint $table) {
                $table->unsignedBigInteger('patient_id')->nullable()->change();
                $table->dateTime('date')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            Schema::table('consultations', function (Blueprint $table) {
                $table->dropForeign(['patient_id']);
            });
            DB::statement('ALTER TABLE consultations MODIFY patient_id BIGINT UNSIGNED NOT NULL');
            DB::statement('ALTER TABLE consultations MODIFY date DATETIME NOT NULL');
            Schema::table('consultations', function (Blueprint $table) {
                $table->foreign('patient_id')->references('id')->on('patients');
            });
        } else {
            Schema::table('consultations', function (Blueprint $table) {
                $table->unsignedBigInteger('patient_id')->nullable(false)->change();
                $table->dateTime('date')->nullable(false)->change();
            });
        }
    }
};
