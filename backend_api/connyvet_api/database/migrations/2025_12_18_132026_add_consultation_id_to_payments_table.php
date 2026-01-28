<?php

// database/migrations/xxxx_xx_xx_xxxxxx_add_consultation_id_to_payments_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::table('payments', function (Blueprint $table) {
      // si tienes tabla consultations:
      $table->foreignId('consultation_id')
        ->nullable()
        ->constrained('consultations')
        ->nullOnDelete()
        ->after('tutor_id');
    });
  }

  public function down(): void {
    Schema::table('payments', function (Blueprint $table) {
      $table->dropForeign(['consultation_id']);
      $table->dropColumn('consultation_id');
    });
  }
};
