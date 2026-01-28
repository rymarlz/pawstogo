<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            // FK a tutors (permitimos null para no romper datos antiguos)
            $table->foreignId('tutor_id')
                ->nullable()
                ->after('id')
                ->constrained('tutors')
                ->cascadeOnUpdate()
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropForeign(['tutor_id']);
            $table->dropColumn('tutor_id');
        });
    }
};
