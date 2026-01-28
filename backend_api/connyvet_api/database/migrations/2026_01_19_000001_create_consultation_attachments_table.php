<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::create('consultation_attachments', function (Blueprint $table) {
      $table->id();
      $table->foreignId('consultation_id')->constrained('consultations')->cascadeOnDelete();
      $table->string('name'); // nombre/detalle del usuario
      $table->string('original_name');
      $table->string('path');
      $table->string('mime', 120)->nullable();
      $table->unsignedBigInteger('size')->default(0);
      $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
      $table->timestamps();
    });
  }

  public function down(): void {
    Schema::dropIfExists('consultation_attachments');
  }
};
