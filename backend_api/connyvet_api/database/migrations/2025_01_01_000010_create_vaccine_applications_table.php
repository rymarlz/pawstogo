<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vaccine_applications', function (Blueprint $table) {
            $table->id();

            // Relaciones de referencia (solo IDs, sin FKs por ahora)
            $table->unsignedBigInteger('patient_id');          // paciente
            $table->unsignedBigInteger('tutor_id')->nullable(); // tutor
            $table->unsignedBigInteger('vaccine_id');          // vacuna del catálogo
            $table->unsignedBigInteger('consultation_id')->nullable(); // consulta asociada
            $table->unsignedBigInteger('doctor_id')->nullable();      // médico
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();

            // Fechas relacionadas a la vacuna
            $table->date('planned_date')->nullable();      // fecha planificada
            $table->dateTime('applied_at')->nullable();    // fecha y hora aplicada
            $table->date('next_due_date')->nullable();     // próxima dosis recomendada

            // Datos clínicos de la aplicación
            $table->string('status', 20)->default('pendiente'); // pendiente, aplicada, vencida
            $table->decimal('dose_ml', 6, 2)->nullable();       // dosis en ml
            $table->decimal('weight_kg', 6, 2)->nullable();     // peso de la mascotita
            $table->string('batch_number', 100)->nullable();    // lote
            $table->string('serial_number', 100)->nullable();   // serie
            $table->string('application_site', 100)->nullable(); // lugar de aplicación (subcutánea, etc.)
            $table->text('observations')->nullable();           // observaciones del médico
            $table->text('adverse_reactions')->nullable();      // reacciones adversas si hubo

            // Metadatos
            $table->boolean('active')->default(true);
            $table->json('attachments_meta')->nullable(); // info de adjuntos
            $table->json('extra_data')->nullable();       // JSON libre

            $table->timestamps();
            $table->softDeletes();

            // Índices para performance
            $table->index('patient_id');
            $table->index('tutor_id');
            $table->index('vaccine_id');
            $table->index('consultation_id');
            $table->index('doctor_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vaccine_applications');
    }
};
