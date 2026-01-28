<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('consultation_exam_orders', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('consultation_id');

            $table->string('exam_name', 191);                 // Hemograma, Perfil bioquímico...
            $table->string('priority', 20)->default('normal'); // normal|urgente
            $table->string('status', 20)->default('requested'); // requested|done|cancelled
            $table->text('notes')->nullable();                 // ayuno, etc.
            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamps();

            $table->foreign('consultation_id')
                ->references('id')->on('consultations')
                ->onDelete('cascade');

            $table->index(['consultation_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultation_exam_orders');
    }
};
