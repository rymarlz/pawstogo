<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('patient_id')
                ->constrained('patients')
                ->onDelete('cascade');

            $table->foreignId('tutor_id')
                ->nullable()
                ->constrained('tutors')   // 👈 CORREGIDO
                ->nullOnDelete();

            $table->string('concept');
            $table->decimal('amount', 10, 2);

            $table->enum('status', ['pending', 'paid'])->default('pending');
            $table->enum('method', ['efectivo', 'debito', 'credito', 'transferencia'])
                  ->nullable();

            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
