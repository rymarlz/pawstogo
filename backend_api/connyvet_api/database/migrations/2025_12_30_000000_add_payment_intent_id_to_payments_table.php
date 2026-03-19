<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Añade payment_intent_id a payments para vincular el registro de caja
 * con la intención de pago cuando el pago se confirma vía Mercado Pago (u otro proveedor).
 * Permite idempotencia al crear un Payment desde un PaymentIntent pagado.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payments')) {
            return;
        }

        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'payment_intent_id')) {
                return;
            }
            $table->unsignedBigInteger('payment_intent_id')
                ->nullable()
                ->after('hospitalization_id')
                ->index();
            $table->foreign('payment_intent_id')
                ->references('id')
                ->on('payment_intents')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('payments') || ! Schema::hasColumn('payments', 'payment_intent_id')) {
            return;
        }

        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['payment_intent_id']);
            $table->dropColumn('payment_intent_id');
        });
    }
};
