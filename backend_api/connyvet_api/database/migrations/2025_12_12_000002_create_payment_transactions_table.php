<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::create('payment_transactions', function (Blueprint $table) {
      $table->id();
      $table->unsignedBigInteger('payment_intent_id')->index();

      // manual | webpay_plus
      $table->string('provider', 30)->index();

      // initiated | authorized | paid | failed | cancelled | refunded
      $table->string('status', 20)->default('initiated')->index();

      $table->unsignedBigInteger('amount'); // CLP
      $table->string('currency', 3)->default('CLP');

      // IDs externos (Transbank/otros)
      $table->string('external_id')->nullable()->index(); // e.g. token, buyOrder, etc
      $table->string('authorization_code')->nullable();
      $table->string('response_code')->nullable();

      // URLs (para providers redirect)
      $table->string('redirect_url')->nullable();
      $table->string('return_url')->nullable();

      // payloads de request/response para auditoría
      $table->json('request_payload')->nullable();
      $table->json('response_payload')->nullable();

      $table->timestamps();

      $table->foreign('payment_intent_id')
        ->references('id')->on('payment_intents')
        ->onDelete('cascade');
    });
  }

  public function down(): void {
    Schema::dropIfExists('payment_transactions');
  }
};
