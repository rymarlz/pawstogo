<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hospitalizations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('patient_id')
                ->constrained('patients') // nombre de tu tabla de pacientes
                ->cascadeOnDelete();

            $table->foreignId('tutor_id')
                ->nullable()
                ->constrained('tutors')  // nombre de tu tabla de tutores
                ->nullOnDelete();

            $table->date('admission_date')->nullable();
            $table->date('discharge_date')->nullable();

            // HospitalizationStatus en el front: 'active' | 'discharged' | 'cancelled'
            $table->string('status')->default('active');

            $table->string('bed_number', 50)->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hospitalizations');
    }
};
