<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ajusta la tabla vaccines existente (no la crea de cero).
     */
    public function up(): void
    {
        // Nos aseguramos de que la tabla exista
        if (! Schema::hasTable('vaccines')) {
            // Si por alguna razón no existiera, la creamos completa
            Schema::create('vaccines', function (Blueprint $table) {
                $table->id();
                $table->string('name');

                $table->string('species', 50)->nullable();
                $table->string('manufacturer')->nullable();
                $table->string('short_description', 255)->nullable();
                $table->text('description')->nullable();

                $table->decimal('default_dose_ml', 8, 2)->nullable();
                $table->string('route', 50)->nullable();
                $table->unsignedInteger('min_age_weeks')->nullable();
                $table->unsignedInteger('max_age_weeks')->nullable();
                $table->unsignedInteger('default_interval_days')->nullable();

                $table->boolean('is_core')->default(false);
                $table->boolean('active')->default(true);
                $table->json('extra_data')->nullable();

                $table->softDeletes();
                $table->timestamps();
            });

            return;
        }

        // Si la tabla ya existe, solo agregamos/ajustamos columnas que falten
        Schema::table('vaccines', function (Blueprint $table) {
            // species
            if (! Schema::hasColumn('vaccines', 'species')) {
                $table->string('species', 50)->nullable()->after('name');
            }

            if (! Schema::hasColumn('vaccines', 'manufacturer')) {
                $table->string('manufacturer')->nullable()->after('species');
            }

            if (! Schema::hasColumn('vaccines', 'short_description')) {
                $table->string('short_description', 255)->nullable()->after('manufacturer');
            }

            if (! Schema::hasColumn('vaccines', 'description')) {
                $table->text('description')->nullable()->after('short_description');
            }

            if (! Schema::hasColumn('vaccines', 'default_dose_ml')) {
                $table->decimal('default_dose_ml', 8, 2)->nullable()->after('description');
            }

            if (! Schema::hasColumn('vaccines', 'route')) {
                $table->string('route', 50)->nullable()->after('default_dose_ml');
            }

            if (! Schema::hasColumn('vaccines', 'min_age_weeks')) {
                $table->unsignedInteger('min_age_weeks')->nullable()->after('route');
            }

            if (! Schema::hasColumn('vaccines', 'max_age_weeks')) {
                $table->unsignedInteger('max_age_weeks')->nullable()->after('min_age_weeks');
            }

            if (! Schema::hasColumn('vaccines', 'default_interval_days')) {
                $table->unsignedInteger('default_interval_days')->nullable()->after('max_age_weeks');
            }

            if (! Schema::hasColumn('vaccines', 'is_core')) {
                $table->boolean('is_core')->default(false)->after('default_interval_days');
            }

            if (! Schema::hasColumn('vaccines', 'active')) {
                $table->boolean('active')->default(true)->after('is_core');
            }

            if (! Schema::hasColumn('vaccines', 'extra_data')) {
                $table->json('extra_data')->nullable()->after('active');
            }

            // MUY IMPORTANTE: SoftDeletes si faltaba
            if (! Schema::hasColumn('vaccines', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    /**
     * Revertir cambios (opcionalmente borramos las columnas añadidas).
     */
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
            if (Schema::hasColumn('vaccines', 'default_interval_days')) {
                $table->dropColumn('default_interval_days');
            }
            if (Schema::hasColumn('vaccines', 'max_age_weeks')) {
                $table->dropColumn('max_age_weeks');
            }
            if (Schema::hasColumn('vaccines', 'min_age_weeks')) {
                $table->dropColumn('min_age_weeks');
            }
            if (Schema::hasColumn('vaccines', 'route')) {
                $table->dropColumn('route');
            }
            if (Schema::hasColumn('vaccines', 'default_dose_ml')) {
                $table->dropColumn('default_dose_ml');
            }
            if (Schema::hasColumn('vaccines', 'description')) {
                $table->dropColumn('description');
            }
            if (Schema::hasColumn('vaccines', 'short_description')) {
                $table->dropColumn('short_description');
            }
            if (Schema::hasColumn('vaccines', 'manufacturer')) {
                $table->dropColumn('manufacturer');
            }
            if (Schema::hasColumn('vaccines', 'species')) {
                $table->dropColumn('species');
            }
            if (Schema::hasColumn('vaccines', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
    }
};
