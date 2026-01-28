<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Perfil y estado
            $table->string('locale', 10)->default('es')->after('email');              // p.ej. es, en
            $table->string('timezone', 64)->default('America/Santiago')->after('locale');
            $table->enum('status', ['active','inactive','suspended'])->default('active')->after('timezone');

            // Preferencias (JSON). En MariaDB se almacena como LONGTEXT con validación JSON
            $table->json('preferences')->nullable()->after('status');

            // Opcional: últimos accesos
            $table->timestamp('last_login_at')->nullable()->after('remember_token');
            $table->string('last_login_ip', 45)->nullable()->after('last_login_at');
            $table->string('last_login_user_agent', 255)->nullable()->after('last_login_ip');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'locale','timezone','status','preferences',
                'last_login_at','last_login_ip','last_login_user_agent'
            ]);
        });
    }
};
