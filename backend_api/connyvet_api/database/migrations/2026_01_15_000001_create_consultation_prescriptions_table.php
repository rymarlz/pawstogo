<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('consultation_prescriptions', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('consultation_id')->unique();
            $table->text('notes')->nullable(); // indicaciones generales / receta

            // auditoría (opcional)
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();

            $table->timestamps();

            $table->foreign('consultation_id')
                ->references('id')->on('consultations')
                ->onDelete('cascade');

            $table->index('consultation_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultation_prescriptions');
    }
};
