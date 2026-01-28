<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // ✅ Si la tabla no existe (por orden o entorno), no hacemos nada.
        if (!Schema::hasTable('payments')) {
            return;
        }

        Schema::table('payments', function (Blueprint $table) {
            /**
             * ⚠️ SQLite: evitar ->change() (requiere doctrine/dbal y aún así es limitado).
             * Además, tu create usa enum para status, no lo convertimos a string acá.
             */

            // Si no existe status (en entornos viejos), lo agregamos como string.
            // Si existe, NO tocamos el tipo para no romper SQLite.
            if (!Schema::hasColumn('payments', 'status')) {
                $table->string('status', 20)->default('pending')->index();
            } else {
                // ✅ opcional: aseguramos índice si no existe (no hay hasIndex nativo fácil)
                // lo dejamos sin tocar para evitar SQL extra en sqlite.
            }

            if (!Schema::hasColumn('payments', 'paid_at')) {
                $table->timestamp('paid_at')->nullable();
            }
            if (!Schema::hasColumn('payments', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable();
            }
            if (!Schema::hasColumn('payments', 'cancelled_reason')) {
                $table->string('cancelled_reason', 255)->nullable();
            }
            if (!Schema::hasColumn('payments', 'created_by')) {
                $table->unsignedBigInteger('created_by')->nullable();
                $table->index('created_by');
            }

            if (!Schema::hasColumn('payments', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('payments')) {
            return;
        }

        // ⚠️ SQLite tiene limitaciones para dropColumn en algunos casos.
        // Laravel lo intenta manejar, pero si te diera problemas, deja down() vacío.
        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'paid_at')) $table->dropColumn('paid_at');
            if (Schema::hasColumn('payments', 'cancelled_at')) $table->dropColumn('cancelled_at');
            if (Schema::hasColumn('payments', 'cancelled_reason')) $table->dropColumn('cancelled_reason');
            if (Schema::hasColumn('payments', 'created_by')) $table->dropColumn('created_by');
            if (Schema::hasColumn('payments', 'deleted_at')) $table->dropSoftDeletes();
        });
    }
};
