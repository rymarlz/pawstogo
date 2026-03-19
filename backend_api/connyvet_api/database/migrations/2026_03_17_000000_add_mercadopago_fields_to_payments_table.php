<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('payments')) {
            return;
        }

        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasColumn('payments', 'payment_link')) {
                $table->string('payment_link', 500)->nullable()->after('notes');
            }
            if (!Schema::hasColumn('payments', 'mp_preference_id')) {
                $table->string('mp_preference_id', 100)->nullable()->after('payment_link');
            }
            if (!Schema::hasColumn('payments', 'external_reference')) {
                $table->string('external_reference', 50)->nullable()->after('mp_preference_id');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('payments')) {
            return;
        }

        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'payment_link')) {
                $table->dropColumn('payment_link');
            }
            if (Schema::hasColumn('payments', 'mp_preference_id')) {
                $table->dropColumn('mp_preference_id');
            }
            if (Schema::hasColumn('payments', 'external_reference')) {
                $table->dropColumn('external_reference');
            }
        });
    }
};
