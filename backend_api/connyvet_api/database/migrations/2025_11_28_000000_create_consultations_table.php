<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('consultations', function (Blueprint $table) {
            $table->id();

            // Relaciones principales
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('tutor_id')->nullable();
            $table->unsignedBigInteger('doctor_id')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            // $table->unsignedBigInteger('clinic_id')->nullable(); // futuro multi-sede

            // Datos básicos de la consulta
            $table->dateTime('date'); // fecha/hora de la atención
            $table->string('visit_type', 50)->nullable(); // primera_vez, control, urgencia, vacuna, etc.
            $table->string('reason', 191)->nullable();

            // Contenido clínico
            $table->text('anamnesis')->nullable();
            $table->text('physical_exam')->nullable();
            $table->text('diagnosis_primary')->nullable();
            $table->text('diagnosis_secondary')->nullable();
            $table->text('treatment')->nullable();
            $table->text('recommendations')->nullable();

            // Signos vitales / parámetros
            $table->decimal('weight_kg', 5, 2)->nullable();
            $table->decimal('temperature_c', 4, 1)->nullable();
            $table->smallInteger('heart_rate')->nullable();       // FC
            $table->smallInteger('respiratory_rate')->nullable(); // FR
            $table->tinyInteger('body_condition_score')->nullable(); // 1-9

            // Seguimiento
            $table->date('next_control_date')->nullable();

            // Estado
            $table->string('status', 30)->default('cerrada'); // abierta | cerrada | anulada
            $table->boolean('active')->default(true);

            // Extras a futuro
            $table->json('attachments_meta')->nullable(); // info básica de archivos ligados
            $table->json('extra_data')->nullable();       // campo comodín

            $table->timestamps();
            $table->softDeletes();

            // FKs
            $table->foreign('patient_id')->references('id')->on('patients');
            $table->foreign('tutor_id')->references('id')->on('tutors');
            $table->foreign('doctor_id')->references('id')->on('users');
            $table->foreign('created_by')->references('id')->on('users');
            $table->foreign('updated_by')->references('id')->on('users');
            // $table->foreign('clinic_id')->references('id')->on('clinics');

            // Índices
            $table->index(['patient_id', 'date']);
            $table->index('tutor_id');
            $table->index('doctor_id');
            $table->index('date');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultations');
    }
};
