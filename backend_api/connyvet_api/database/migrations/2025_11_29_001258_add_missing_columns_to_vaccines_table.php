<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('vaccines')) {
            return;
        }

        Schema::table('vaccines', function (Blueprint $table) {
            // SoftDeletes: agrega columna deleted_at si no existe
            if (! Schema::hasColumn('vaccines', 'deleted_at')) {
                $table->softDeletes();
            }

            // Estos 3 no son obligatorios para el listado, pero los dejamos bien:
            if (! Schema::hasColumn('vaccines', 'is_core')) {
                $table->boolean('is_core')
                    ->default(false)
                    ->after('default_interval_days');
            }

            if (! Schema::hasColumn('vaccines', 'active')) {
                $table->boolean('active')
                    ->default(true)
                    ->after('is_core');
            }

            if (! Schema::hasColumn('vaccines', 'extra_data')) {
                $table->json('extra_data')
                    ->nullable()
                    ->after('active');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('vaccines')) {
            return;
        }

        Schema::table('vaccines', function (Blueprint $table) {
            if (Schema::hasColumn('vaccines', 'extra_data')) {
                $table->dropColumn('extra_data');
            }
            if (Schema::hasColumn('vaccines', 'active')) {
                $table->dropColumn('active');
            }
            if (Schema::hasColumn('vaccines', 'is_core')) {
                $table->dropColumn('is_core');
            }
            if (Schema::hasColumn('vaccines', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
    }
};
