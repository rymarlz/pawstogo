<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('payments')) return;

        Schema::table('payments', function (Blueprint $table) {

            if (!Schema::hasColumn('payments', 'patient_id')) {
                $table->foreignId('patient_id')
                    ->nullable()
                    ->constrained('patients')
                    ->nullOnDelete();
            }

            if (!Schema::hasColumn('payments', 'tutor_id')) {
                $table->foreignId('tutor_id')
                    ->nullable()
                    ->constrained('tutors')
                    ->nullOnDelete();
            }

            if (!Schema::hasColumn('payments', 'concept')) {
                $table->string('concept')->nullable();
            }

            if (!Schema::hasColumn('payments', 'amount')) {
                $table->decimal('amount', 10, 2)->default(0);
            }

            if (!Schema::hasColumn('payments', 'method')) {
                // En SQLite evitamos enum real
                $table->string('method', 30)->nullable();
            }

            if (!Schema::hasColumn('payments', 'notes')) {
                $table->text('notes')->nullable();
            }

            if (!Schema::hasColumn('payments', 'vaccine_application_id')) {
                $table->foreignId('vaccine_application_id')
                    ->nullable()
                    ->constrained('vaccine_applications')
                    ->nullOnDelete();
            }

            if (!Schema::hasColumn('payments', 'hospitalization_id')) {
                $table->foreignId('hospitalization_id')
                    ->nullable()
                    ->constrained('hospitalizations')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('payments')) return;

        Schema::table('payments', function (Blueprint $table) {
            // En SQLite, drops con foreign keys a veces molestan.
            // Si te da problemas, deja el down vacío.
        });
    }
};
