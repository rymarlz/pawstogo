<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::create('payment_intents', function (Blueprint $table) {
      $table->id();

      // Relaciones "contexto"
      $table->unsignedBigInteger('patient_id')->nullable()->index();
      $table->unsignedBigInteger('tutor_id')->nullable()->index();
      $table->unsignedBigInteger('consultation_id')->nullable()->index();

      // Identificadores negocio
      $table->string('currency', 3)->default('CLP');
      $table->unsignedBigInteger('amount_total'); // en CLP (sin decimales)
      $table->unsignedBigInteger('amount_paid')->default(0);
      $table->unsignedBigInteger('amount_refunded')->default(0);

      // Estado
      // draft | pending | paid | cancelled | failed | refunded
      $table->string('status', 20)->default('draft')->index();

      // Modo / proveedor
      // manual | webpay_plus (futuro)
      $table->string('provider', 30)->default('manual')->index();

      $table->string('title')->nullable();
      $table->text('description')->nullable();

      // Metadata extra (JSON)
      $table->json('meta')->nullable();

      $table->timestamps();
    });
  }

  public function down(): void {
    Schema::dropIfExists('payment_intents');
  }
};
