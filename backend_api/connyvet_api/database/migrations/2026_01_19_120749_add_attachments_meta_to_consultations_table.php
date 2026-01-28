<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
public function up(): void {
  Schema::table('consultations', function (Blueprint $table) {
    if (!Schema::hasColumn('consultations', 'attachments_meta')) {
      $table->json('attachments_meta')->nullable();
    }
  });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            //
        });
    }
};
