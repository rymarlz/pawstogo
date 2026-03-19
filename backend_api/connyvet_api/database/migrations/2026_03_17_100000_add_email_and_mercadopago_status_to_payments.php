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
            if (!Schema::hasColumn('payments', 'email_sent_at')) {
                $table->timestamp('email_sent_at')->nullable()->after('external_reference');
            }
            if (!Schema::hasColumn('payments', 'email_error')) {
                $table->text('email_error')->nullable()->after('email_sent_at');
            }
            if (!Schema::hasColumn('payments', 'mercadopago_status')) {
                $table->string('mercadopago_status', 50)->nullable()->after('email_error');
            }
            if (!Schema::hasColumn('payments', 'mercadopago_status_detail')) {
                $table->string('mercadopago_status_detail', 100)->nullable()->after('mercadopago_status');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('payments')) {
            return;
        }

        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'email_sent_at')) {
                $table->dropColumn('email_sent_at');
            }
            if (Schema::hasColumn('payments', 'email_error')) {
                $table->dropColumn('email_error');
            }
            if (Schema::hasColumn('payments', 'mercadopago_status')) {
                $table->dropColumn('mercadopago_status');
            }
            if (Schema::hasColumn('payments', 'mercadopago_status_detail')) {
                $table->dropColumn('mercadopago_status_detail');
            }
        });
    }
};
