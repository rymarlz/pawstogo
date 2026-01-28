<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('consultation_prescription_items', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('prescription_id');

            $table->string('drug_name', 191);
            $table->string('presentation', 191)->nullable(); // ej: 250mg/5ml
            $table->string('dose', 191)->nullable();         // ej: 10 mg/kg o 1 ml
            $table->string('frequency', 191)->nullable();    // ej: c/12h
            $table->unsignedInteger('duration_days')->nullable(); // ej: 7
            $table->string('route', 50)->nullable();         // oral, IM, SC
            $table->text('instructions')->nullable();        // indicaciones

            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamps();

            $table->foreign('prescription_id')
                ->references('id')->on('consultation_prescriptions')
                ->onDelete('cascade');

            $table->index('prescription_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultation_prescription_items');
    }
};
